"use client";

import { useEffect } from "react";

type RazorpayCheckoutResponse = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

type RazorpayCheckoutOptions = {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill?: {
    name?: string;
    email?: string;
  };
  notes?: Record<string, string>;
  theme?: {
    color?: string;
  };
  modal?: {
    ondismiss?: () => void;
  };
  handler: (response: RazorpayCheckoutResponse) => void;
};

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayCheckoutOptions) => {
      open: () => void;
    };
  }
}

function loadRazorpayScript() {
  return new Promise<boolean>((resolve) => {
    if (typeof window === "undefined") {
      resolve(false);
      return;
    }

    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const existing = document.querySelector<HTMLScriptElement>(
      'script[src="https://checkout.razorpay.com/v1/checkout.js"]',
    );

    if (existing) {
      existing.addEventListener("load", () => resolve(true), { once: true });
      existing.addEventListener("error", () => resolve(false), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

function showToast(message: string) {
  let toast = document.getElementById("buildsetu-plan-toast");

  if (!toast) {
    toast = document.createElement("div");
    toast.id = "buildsetu-plan-toast";
    toast.style.position = "fixed";
    toast.style.right = "24px";
    toast.style.bottom = "24px";
    toast.style.zIndex = "99999";
    toast.style.maxWidth = "380px";
    toast.style.borderRadius = "18px";
    toast.style.padding = "14px 16px";
    toast.style.background = "#21133f";
    toast.style.color = "#fff";
    toast.style.fontSize = "14px";
    toast.style.fontWeight = "800";
    toast.style.boxShadow = "0 18px 50px rgba(33,19,63,0.25)";
    document.body.appendChild(toast);
  }

  toast.textContent = message;

  window.setTimeout(() => {
    toast?.remove();
  }, 5000);
}

function inferPlanId(clickable: HTMLElement) {
  const explicit = clickable.closest<HTMLElement>("[data-plan-id]")?.dataset.planId;

  if (explicit) {
    return explicit;
  }

  const text = (clickable.closest("article")?.textContent || document.body.textContent || "")
    .replace(/\s+/g, " ")
    .toLowerCase();

  let plan = "pro";

  if (text.includes("ultra")) {
    plan = "ultra";
  } else if (text.includes("max")) {
    plan = "max";
  } else if (text.includes("pro")) {
    plan = "pro";
  }

  const billing = document.querySelector<HTMLElement>("[data-billing-active='yearly']")
    ? "yearly"
    : "monthly";

  return `${plan}_${billing}`;
}

export default function PricingUpgradeBridge() {
  useEffect(() => {
    let isOpening = false;

    async function startCheckout(planId: string) {
      if (isOpening) return;

      isOpening = true;
      showToast("Opening secure Razorpay checkout...");

      try {
        const loaded = await loadRazorpayScript();

        if (!loaded || !window.Razorpay) {
          throw new Error("Razorpay checkout load nahi hua. Refresh karke dobara try karein.");
        }

        const orderRes = await fetch("/api/plans/order", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ planId }),
        });

        const orderData = await orderRes.json();

        if (!orderRes.ok || !orderData.ok) {
          throw new Error(orderData.error || "Plan order create nahi hua");
        }

        const plan = orderData.plan;
        const order = orderData.order;

        const checkout = new window.Razorpay({
          key: orderData.keyId,
          amount: order.amount,
          currency: order.currency || "INR",
          name: "BuildSetu AI",
          description: `${plan.name} · ${plan.interval} · ${plan.credits} credits`,
          order_id: order.id,
          prefill: {
            name: "BuildSetu User",
            email: "demo@buildsetu.ai",
          },
          notes: {
            planId,
            planName: plan.name,
            interval: plan.interval,
            credits: String(plan.credits),
          },
          theme: {
            color: "#7c3aed",
          },
          modal: {
            ondismiss: () => {
              isOpening = false;
              showToast("Payment cancelled. Plan activate nahi hua.");
            },
          },
          handler: async (response) => {
            try {
              const verifyRes = await fetch("/api/plans/verify", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  planId,
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                }),
              });

              const verifyData = await verifyRes.json();

              if (!verifyRes.ok || !verifyData.ok) {
                throw new Error(verifyData.error || "Plan verification failed");
              }

              showToast(verifyData.message || "Plan activated successfully");
              window.setTimeout(() => window.location.reload(), 1200);
            } catch (error) {
              showToast(error instanceof Error ? error.message : "Plan verification failed");
            } finally {
              isOpening = false;
            }
          },
        });

        checkout.open();
      } catch (error) {
        showToast(error instanceof Error ? error.message : "Plan checkout start nahi hua");
        isOpening = false;
      }
    }

    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const clickable = target?.closest("button, a") as HTMLElement | null;

      if (!clickable) return;

      const explicitPlanId = clickable.closest<HTMLElement>("[data-plan-id]")?.dataset.planId;
      const text = (clickable.textContent || "").replace(/\s+/g, " ").trim().toLowerCase();

      const isUpgradeClick =
        Boolean(explicitPlanId) ||
        text.includes("subscribe") ||
        text.includes("upgrade") ||
        text.includes("get started") ||
        text.includes("choose plan");

      if (!isUpgradeClick) return;

      event.preventDefault();
      event.stopPropagation();

      startCheckout(inferPlanId(clickable));
    };

    document.addEventListener("click", handleClick, true);

    return () => {
      document.removeEventListener("click", handleClick, true);
    };
  }, []);

  return null;
}
