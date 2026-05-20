"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  BadgeCheck,
  CheckCircle2,
  CreditCard,
  Crown,
  Lock,
  Sparkles,
  Star,
  Zap,
} from "lucide-react";

type Billing = "monthly" | "yearly";

type Plan = {
  id: string;
  name: string;
  tag: string;
  monthlyPrice: number;
  yearlyPrice: number;
  monthlyCredits: number;
  yearlyCredits: number;
  popular?: boolean;
  features: string[];
};

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

const plans: Plan[] = [
  {
    id: "starter",
    name: "Starter",
    tag: "For solo designers",
    monthlyPrice: 2499,
    yearlyPrice: 24999,
    monthlyCredits: 120,
    yearlyCredits: 1500,
    features: [
      "120 monthly credits",
      "Interior / exterior renders",
      "Magic Brief and Architect Chat",
      "Client PDF exports",
      "Basic project workspace",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    tag: "For active studios",
    monthlyPrice: 4999,
    yearlyPrice: 49999,
    monthlyCredits: 400,
    yearlyCredits: 5200,
    popular: true,
    features: [
      "400 monthly credits",
      "Higher render generations",
      "BOQ / BBS drafts",
      "Client agreement drafts",
      "Priority project workflow",
    ],
  },
  {
    id: "agency",
    name: "Agency",
    tag: "For teams and contractors",
    monthlyPrice: 12999,
    yearlyPrice: 129999,
    monthlyCredits: 1200,
    yearlyCredits: 16000,
    features: [
      "1,200 monthly credits",
      "High volume AI usage",
      "Large PDF/report workflow",
      "Contractor package workflow",
      "Team-ready workspace",
    ],
  },
];

function money(value: number) {
  return "₹" + value.toLocaleString("en-IN");
}

function getPlanCheckoutId(plan: Plan, billing: Billing) {
  return `${plan.id}_${billing}`;
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

export default function PricingPage() {
  const [billing, setBilling] = useState<Billing>("monthly");
  const [loadingPlan, setLoadingPlan] = useState("");
  const [notice, setNotice] = useState("");
  const [activePlan, setActivePlan] = useState<any>(null);

  const selectedPlans = useMemo(() => {
    return plans.map((plan) => ({
      ...plan,
      price: billing === "monthly" ? plan.monthlyPrice : plan.yearlyPrice,
      credits: billing === "monthly" ? plan.monthlyCredits : plan.yearlyCredits,
      checkoutId: getPlanCheckoutId(plan, billing),
    }));
  }, [billing]);

  async function loadPlanStatus() {
    try {
      const res = await fetch("/api/plans/status", { cache: "no-store" });
      const data = await res.json();

      if (res.ok && data.ok) {
        setActivePlan(data.plan || null);
      }
    } catch {
      setActivePlan(null);
    }
  }

  async function subscribe(planId: string) {
    setLoadingPlan(planId);
    setNotice("");

    try {
      const scriptLoaded = await loadRazorpayScript();

      if (!scriptLoaded || !window.Razorpay) {
        throw new Error("Razorpay checkout script load nahi hua. Refresh karke dobara try karein.");
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

      const options: RazorpayCheckoutOptions = {
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
            setLoadingPlan("");
            setNotice("Payment cancelled. Plan activate nahi hua.");
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
              throw new Error(verifyData.error || "Plan payment verification failed");
            }

            setNotice(verifyData.message || "Plan activated successfully");
            setActivePlan(verifyData.plan || null);
            await loadPlanStatus();
          } catch (error) {
            setNotice(error instanceof Error ? error.message : "Plan verification failed");
          } finally {
            setLoadingPlan("");
          }
        },
      };

      const checkout = new window.Razorpay(options);
      checkout.open();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Plan checkout start nahi hua");
      setLoadingPlan("");
    }
  }

  useEffect(() => {
    loadPlanStatus();
  }, []);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#fbf7ff_0%,#ffffff_44%,#ffffff_100%)] text-[#201537]">
      <section className="mx-auto max-w-[1280px] px-5 py-6">
        <div className="mb-5 flex items-center justify-between">
          <a
            href="/"
            className="inline-flex items-center gap-2 text-sm font-black text-[#5f5476] hover:text-[#7c3aed]"
          >
            <ArrowLeft size={17} />
            Back to dashboard
          </a>

          <a
            href="/credits"
            className="inline-flex h-11 items-center justify-center rounded-2xl border border-[#e3d9f3] bg-white px-5 text-sm font-black text-[#21133f] shadow-sm hover:bg-purple-50"
          >
            Buy Credits
          </a>
        </div>

        <div className="text-center">
          <div className="mx-auto mb-3 inline-flex items-center gap-2 rounded-full border border-[#eadcff] bg-white px-4 py-2 text-xs font-black uppercase tracking-wide text-[#7c3aed] shadow-sm">
            <Sparkles size={14} />
            BuildSetu Plans
          </div>

          <h1 className="text-[36px] font-black leading-none tracking-[-0.07em] text-[#21133f] md:text-[52px]">
            Upgrade your plan
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-[15px] leading-7 text-[#6c5f84]">
            Plans interior designers, architects, contractors aur agencies ke liye.
            Payment success ke baad plan active hoga aur credits wallet me add honge.
          </p>

          <div className="mt-5 inline-flex rounded-2xl border border-[#e5d9f4] bg-white p-1 shadow-sm">
            <button
              onClick={() => setBilling("monthly")}
              className={`h-10 rounded-xl px-6 text-sm font-black ${
                billing === "monthly"
                  ? "bg-[#21133f] text-white"
                  : "text-[#6c5f84] hover:bg-purple-50"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBilling("yearly")}
              className={`h-10 rounded-xl px-6 text-sm font-black ${
                billing === "yearly"
                  ? "bg-[#21133f] text-white"
                  : "text-[#6c5f84] hover:bg-purple-50"
              }`}
            >
              Yearly
            </button>
          </div>

          {activePlan ? (
            <div className="mx-auto mt-5 max-w-2xl rounded-2xl border border-[#d8c8f0] bg-[#fbf8ff] px-5 py-4 text-left">
              <p className="text-sm font-black text-[#21133f]">
                Active plan: {activePlan.planName} · {activePlan.interval}
              </p>
              <p className="mt-1 text-xs font-bold text-[#786a91]">
                Renews on {new Date(activePlan.renewsAt).toLocaleDateString("en-IN")}
              </p>
            </div>
          ) : null}

          {notice ? (
            <div className="mx-auto mt-4 max-w-2xl rounded-2xl border border-[#e6ddf4] bg-white px-4 py-3 text-sm font-bold text-[#5f2bbd]">
              {notice}
            </div>
          ) : null}
        </div>

        <section className="mt-8 grid gap-5 lg:grid-cols-3">
          {selectedPlans.map((plan) => {
            const isLoading = loadingPlan === plan.checkoutId;
            const active = activePlan?.planId === plan.checkoutId;

            return (
              <article
                key={plan.checkoutId}
                className={`relative flex min-h-[560px] flex-col rounded-[26px] border bg-white p-5 shadow-[0_20px_55px_rgba(65,29,120,0.06)] ${
                  plan.popular
                    ? "border-[#8b5cf6] shadow-[0_0_0_2px_rgba(139,92,246,0.12),0_22px_60px_rgba(91,33,182,0.12)]"
                    : "border-[#e6ddf4]"
                }`}
              >
                {plan.popular ? (
                  <div className="absolute -top-3 left-5 rounded-full bg-gradient-to-r from-[#6d28d9] to-[#c026d3] px-4 py-1.5 text-[10px] font-black tracking-wide text-white shadow-md">
                    MOST POPULAR
                  </div>
                ) : null}

                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-black uppercase tracking-wider text-[#8b7ca6]">
                      {plan.name}
                    </p>
                    <h2 className="mt-2 text-[26px] font-black tracking-[-0.06em] text-[#21133f]">
                      {plan.tag}
                    </h2>
                  </div>

                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#f1e8ff] to-[#eadbff] text-[#7c3aed]">
                    {plan.popular ? <Crown size={22} /> : <Zap size={22} />}
                  </div>
                </div>

                <div className="mt-5 rounded-[22px] border border-[#f0e9fb] bg-[#fcfbff] p-5">
                  <div className="flex items-end justify-between gap-4">
                    <div>
                      <p className="text-[13px] font-black uppercase tracking-wider text-[#8b7ca6]">
                        Price
                      </p>
                      <p className="mt-2 text-[34px] font-black tracking-[-0.07em] text-[#1f1433]">
                        {money(plan.price)}
                      </p>
                      <p className="mt-1 text-xs font-bold text-[#786a91]">
                        billed {billing}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-[13px] font-black uppercase tracking-wider text-[#8b7ca6]">
                        Credits
                      </p>
                      <p className="mt-2 text-[28px] font-black tracking-[-0.06em] text-[#1f1433]">
                        {plan.credits.toLocaleString("en-IN")}
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  disabled={isLoading}
                  onClick={() => subscribe(plan.checkoutId)}
                  className={`mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-sm font-black text-white shadow-[0_14px_30px_rgba(124,58,237,0.22)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70 ${
                    plan.popular
                      ? "bg-gradient-to-r from-[#5b43ea] via-[#7c3aed] to-[#d946ef]"
                      : "bg-[#21133f]"
                  }`}
                >
                  <CreditCard size={18} />
                  {isLoading ? "Opening checkout..." : active ? "Renew Plan" : "Subscribe"}
                </button>

                <div className="mt-5 space-y-3">
                  {plan.features.map((feature) => (
                    <div key={feature} className="flex gap-3 text-[13px] leading-6 text-[#43345f]">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#7c3aed]" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-auto pt-5">
                  <div className="rounded-2xl bg-[#fbf8ff] px-4 py-3 text-xs font-bold text-[#786a91] ring-1 ring-[#efe8fb]">
                    <BadgeCheck className="mr-2 inline h-4 w-4 text-emerald-500" />
                    Razorpay secure checkout active
                  </div>
                </div>
              </article>
            );
          })}
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-[22px] border border-[#e6ddf4] bg-white p-5 text-center shadow-sm">
            <Star className="mx-auto h-8 w-8 text-[#7c3aed]" />
            <h3 className="mt-3 text-lg font-black text-[#21133f]">4.9/5 Rating</h3>
            <p className="mt-1 text-sm text-[#786a91]">Client-ready AI workflow</p>
          </div>

          <div className="rounded-[22px] border border-[#e6ddf4] bg-white p-5 text-center shadow-sm">
            <BadgeCheck className="mx-auto h-8 w-8 text-emerald-500" />
            <h3 className="mt-3 text-lg font-black text-[#21133f]">Plan + Credits</h3>
            <p className="mt-1 text-sm text-[#786a91]">Plan activation adds wallet credits</p>
          </div>

          <div className="rounded-[22px] border border-[#e6ddf4] bg-white p-5 text-center shadow-sm">
            <Lock className="mx-auto h-8 w-8 text-[#7c3aed]" />
            <h3 className="mt-3 text-lg font-black text-[#21133f]">Secure Payment</h3>
            <p className="mt-1 text-sm text-[#786a91]">Razorpay signature verification</p>
          </div>
        </section>
      </section>
    </main>
  );
}
