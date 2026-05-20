"use client";

import { useEffect, useMemo, useState } from "react";

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
    contact?: string;
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

type CurrentUser = {
  id?: string;
  name?: string;
  email?: string;
  credits?: number;
};

type CreditHistoryItem = {
  id?: string;
  type?: string;
  credits?: number;
  amountPaise?: number;
  description?: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  createdAt?: string;
};

const packs = [
  {
    id: "starter",
    tag: "STARTER",
    title: "Starter Credit Pack",
    desc: "Small project, testing aur quick AI workflows ke liye.",
    credits: 3000,
    price: "Free / included",
    cta: "Included",
    disabled: true,
  },
  {
    id: "pro",
    tag: "MOST POPULAR",
    title: "Pro Credit Pack",
    desc: "Designers, architects aur contractors ke active workflow ke liye.",
    credits: 200000,
    price: "₹4,999",
    cta: "Buy Pro Pack",
    disabled: false,
  },
  {
    id: "agency",
    tag: "AGENCY",
    title: "Agency Credit Pack",
    desc: "Agencies aur multi-client projects ke liye large credit pack.",
    credits: 700000,
    price: "₹14,999",
    cta: "Buy Agency Pack",
    disabled: false,
  },
];

function compact(n: number) {
  return Number(n || 0).toLocaleString("en-IN");
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
      'script[src="https://checkout.razorpay.com/v1/checkout.js"]'
    );

    if (existing) {
      existing.onload = () => resolve(true);
      existing.onerror = () => resolve(false);
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

export default function CreditsPage() {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [credits, setCredits] = useState(0);
  const [transactions, setTransactions] = useState<CreditHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [buyingPack, setBuyingPack] = useState("");
  const [notice, setNotice] = useState("");

  const recommended = useMemo(() => packs.find((p) => p.id === "pro") || packs[1], []);

  async function loadCredits() {
    setLoading(true);
    setNotice("");

    try {
      const meRes = await fetch("/api/auth/me", {
        cache: "no-store",
        credentials: "same-origin",
      });
      const meData = await meRes.json().catch(() => null);

      if (!meData?.authenticated || !meData?.user) {
        setCurrentUser(null);
        setCredits(0);
        setTransactions([]);
        setNotice("Please login to purchase or use credits.");
        return;
      }

      setCurrentUser(meData.user);
      setCredits(Number(meData.user.credits || 0));

      const balanceRes = await fetch("/api/credits/balance", {
        cache: "no-store",
        credentials: "same-origin",
      });
      const balanceData = await balanceRes.json().catch(() => null);

      if (balanceData?.authenticated) {
        setCredits(Number(balanceData.credits ?? balanceData.balance ?? meData.user.credits ?? 0));
      }

      const historyRes = await fetch("/api/credits/history", {
        cache: "no-store",
        credentials: "same-origin",
      });
      const historyData = await historyRes.json().catch(() => null);
      const list = historyData?.transactions || historyData?.history || [];

      setTransactions(Array.isArray(list) ? list : []);
    } catch (error) {
      console.error("Credits load failed", error);
      setNotice("Credits load nahi ho paya. Page refresh karke dobara try karein.");
    } finally {
      setLoading(false);
    }
  }

  async function buyCredits(packId: string) {
    if (!currentUser?.email) {
      window.location.href = "/login";
      return;
    }

    setBuyingPack(packId);
    setNotice("");

    try {
      const scriptLoaded = await loadRazorpayScript();

      if (!scriptLoaded || !window.Razorpay) {
        throw new Error("Razorpay checkout load nahi hua. Page refresh karke dobara try karein.");
      }

      const orderRes = await fetch("/api/credits/order", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ packId }),
      });

      const orderData = await orderRes.json().catch(() => null);

      if (!orderRes.ok || !orderData?.ok) {
        throw new Error(orderData?.error || "Failed to create Razorpay order");
      }

      const order = orderData.order || {
        id: orderData.orderId || orderData.razorpayOrderId,
        amount: orderData.amount || orderData.amountPaise,
        currency: orderData.currency || "INR",
      };

      const pack = orderData.pack || {
        name: orderData.planName || "BuildSetu Credit Pack",
        credits: orderData.credits || 0,
      };

      if (!order?.id || !order?.amount) {
        throw new Error("Invalid Razorpay order response");
      }

      const checkout = new window.Razorpay({
        key: orderData.keyId,
        amount: Number(order.amount),
        currency: order.currency || "INR",
        name: "BuildSetu AI",
        description: `${pack.name || "Credit Pack"} · ${compact(Number(pack.credits || 0))} credits`,
        order_id: order.id,
        prefill: {
          name: currentUser.name || "BuildSetu User",
          email: currentUser.email || "",
        },
        notes: {
          packId,
          credits: String(pack.credits || orderData.credits || 0),
          userId: currentUser.id || "",
          email: currentUser.email || "",
        },
        theme: {
          color: "#7c3aed",
        },
        modal: {
          ondismiss: () => {
            setBuyingPack("");
            setNotice("Payment cancelled. Credits were not added.");
          },
        },
        handler: async (response) => {
          try {
            const verifyRes = await fetch("/api/credits/verify", {
              method: "POST",
              credentials: "same-origin",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                packId,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });

            const verifyData = await verifyRes.json().catch(() => null);

            if (!verifyRes.ok || !verifyData?.ok) {
              throw new Error(verifyData?.error || "Payment verification failed");
            }

            const updatedBalance = Number(
              verifyData.balance ??
                verifyData.credits ??
                verifyData.totalCredits ??
                credits
            );

            if (Number.isFinite(updatedBalance)) {
              setCredits(updatedBalance);
            }

            setNotice("Payment verified. Credits added successfully.");

            window.setTimeout(() => {
              window.location.href = "/account?payment=success";
            }, 700);
          } catch (error) {
            console.error("Payment verification failed", error);
            setNotice(error instanceof Error ? error.message : "Payment verification failed");
          } finally {
            setBuyingPack("");
          }
        },
      });

      checkout.open();
    } catch (error) {
      console.error("Razorpay checkout failed", error);
      setNotice(error instanceof Error ? error.message : "Failed to start Razorpay checkout");
      setBuyingPack("");
    }
  }

  useEffect(() => {
    loadCredits();
  }, []);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#f8f3ff_0%,#ffffff_45%,#ffffff_100%)] text-[#21133f]">
      <section className="mx-auto max-w-[1240px] px-5 py-6">
        <header className="mb-5 flex items-center justify-between">
          <a href="/" className="text-sm font-black text-[#5f4a80]">
            ← Back to dashboard
          </a>
          <a
            href="/pricing"
            className="rounded-2xl border border-[#e4d8f4] bg-white px-5 py-3 text-sm font-black text-[#21133f] shadow-sm"
          >
            View Plans
          </a>
        </header>

        {notice ? (
          <div className="mb-5 rounded-2xl border border-[#eadcff] bg-white px-5 py-4 text-sm font-bold text-[#6b4c8e] shadow-sm">
            {notice}
          </div>
        ) : null}

        <div className="grid gap-5 rounded-[34px] border border-[#eadcff] bg-white p-4 shadow-[0_28px_90px_rgba(76,29,149,0.10)] lg:grid-cols-[1.55fr_0.9fr]">
          <div className="rounded-[28px] border-t-4 border-[#8b5cf6] bg-[radial-gradient(circle_at_top_right,#f2ddff_0%,#ffffff_55%)] p-6">
            <div className="inline-flex rounded-full border border-[#eadcff] bg-white px-4 py-2 text-[11px] font-black uppercase tracking-[0.12em] text-[#7c3aed] shadow-sm">
              BuildSetu Credits
            </div>

            <h1 className="mt-5 max-w-4xl text-[42px] font-black leading-[0.95] tracking-[-0.07em] text-[#241247] md:text-[58px]">
              Buy credits for AI workflow
            </h1>

            <p className="mt-5 max-w-3xl text-base font-semibold leading-8 text-[#6f5d88]">
              Credits renders, Magic Brief, BOQ, BBS, client PDFs, agreements aur BuildSetu AI tools me use honge.
            </p>

            <div className="mt-7 grid gap-3 md:grid-cols-3">
              <InfoCard label="Pro Pack" value="2,00,000" sub="credits at ₹4,999" />
              <InfoCard label="AI Render" value="2,500" sub="credits per output" />
              <InfoCard label="Payment" value="Razorpay" sub="UPI, QR, cards" />
            </div>
          </div>

          <div className="rounded-[28px] bg-[#f4eaff] p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[12px] font-black uppercase tracking-[0.18em] text-[#9277af]">
                  Available Credits
                </p>
                <p className="mt-3 text-[52px] font-black tracking-[-0.06em] text-[#21133f]">
                  {loading ? "..." : compact(credits)}
                </p>
              </div>
              <div className="grid h-16 w-16 place-items-center rounded-3xl bg-gradient-to-br from-[#7c3aed] to-[#c026d3] text-2xl text-white shadow-lg">
                ▣
              </div>
            </div>

            <div className="mt-5 rounded-3xl bg-white/80 p-5">
              <div className="flex items-center justify-between">
                <p className="text-[12px] font-black uppercase tracking-[0.14em] text-[#8d78a4]">
                  Recommended
                </p>
                <span className="rounded-full bg-[#efe2ff] px-3 py-1 text-[10px] font-black text-[#7c3aed]">
                  PRO
                </span>
              </div>
              <p className="mt-5 text-3xl font-black text-[#21133f]">
                {compact(recommended.credits)} Credits
              </p>
              <p className="mt-2 text-sm font-bold text-[#6f5d88]">
                {recommended.price} · best for active workflows
              </p>
            </div>

            <button
              type="button"
              disabled={Boolean(buyingPack)}
              onClick={() => buyCredits("pro")}
              className="mt-5 flex h-14 w-full items-center justify-center rounded-2xl bg-[#241247] text-base font-black text-white shadow-[0_20px_55px_rgba(36,18,71,0.26)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {buyingPack ? "Opening checkout..." : `+ Buy ${compact(recommended.credits)} Credits`}
            </button>
          </div>
        </div>

        <section className="mt-6 grid gap-5 lg:grid-cols-3">
          {packs.map((pack) => (
            <article
              key={pack.id}
              className="rounded-[30px] border border-[#eadcff] border-t-[#7c3aed] border-t-4 bg-white p-5 shadow-[0_22px_70px_rgba(76,29,149,0.08)]"
            >
              <span className="rounded-full bg-gradient-to-r from-[#7c3aed] to-[#c026d3] px-3 py-1.5 text-[11px] font-black text-white">
                {pack.tag}
              </span>
              <h2 className="mt-7 text-2xl font-black tracking-[-0.04em] text-[#21133f]">
                {pack.title}
              </h2>
              <p className="mt-4 min-h-[52px] text-sm font-semibold leading-7 text-[#6f5d88]">
                {pack.desc}
              </p>

              <div className="mt-5 rounded-3xl border border-[#eadcff] bg-[#fbf8ff] p-4">
                <div className="flex justify-between text-[12px] font-black uppercase tracking-[0.12em] text-[#9277af]">
                  <span>Credits</span>
                  <span>Price</span>
                </div>
                <div className="mt-3 flex items-end justify-between">
                  <p className="text-3xl font-black text-[#21133f]">{compact(pack.credits)}</p>
                  <p className="text-xl font-black text-[#7c3aed]">{pack.price}</p>
                </div>
              </div>

              <button
                type="button"
                disabled={pack.disabled || Boolean(buyingPack)}
                onClick={() => buyCredits(pack.id)}
                className="mt-5 h-12 w-full rounded-2xl bg-gradient-to-r from-[#6d28d9] to-[#c026d3] text-sm font-black text-white shadow-[0_18px_45px_rgba(124,58,237,0.25)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {pack.disabled ? "Already included" : buyingPack === pack.id ? "Opening..." : pack.cta}
              </button>
            </article>
          ))}
        </section>

        <section className="mt-6 rounded-[30px] border border-[#eadcff] bg-white p-5 shadow-sm">
          <h2 className="text-xl font-black text-[#21133f]">Recent credit ledger</h2>

          {transactions.length === 0 ? (
            <p className="mt-4 rounded-2xl bg-[#fbf8ff] px-4 py-4 text-sm font-bold text-[#7b6a92]">
              No credit history yet.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {transactions.slice(0, 8).map((item, index) => (
                <div
                  key={item.id || `${item.razorpayOrderId || "txn"}-${index}`}
                  className="rounded-2xl border border-[#eadcff] bg-[#fbf8ff] px-4 py-4"
                >
                  <p className="text-sm font-black text-[#21133f]">
                    {item.type || "TRANSACTION"} · {compact(Number(item.credits || 0))} credits
                  </p>
                  <p className="mt-1 text-xs font-semibold text-[#7b6a92]">
                    {item.description || item.razorpayOrderId || "Credit transaction"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}

function InfoCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-2xl border border-[#eadcff] bg-white/80 p-4">
      <p className="text-xs font-black uppercase tracking-[0.08em] text-[#9277af]">{label}</p>
      <p className="mt-2 text-2xl font-black text-[#241247]">{value}</p>
      <p className="mt-1 text-xs font-bold text-[#7c3aed]">{sub}</p>
    </div>
  );
}
