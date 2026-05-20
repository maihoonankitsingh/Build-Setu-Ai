"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import {
  ArrowLeft,
  BadgeCheck,
  CheckCircle2,
  CreditCard,
  Lock,
  Plus,
  Shield,
  Sparkles,
  Star,
  Wallet,
  Zap,
} from "lucide-react";

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


type Pack = {
  id: string;
  name: string;
  credits: number;
  price: number;
  badge?: string;
  popular?: boolean;
  desc: string;
  features: string[];
};

type CreditTransaction = {
  id: string;
  actionType: string;
  creditsUsed: number;
  note?: string | null;
  createdAt: string;
};

const packs: Pack[] = [
  {
    id: "starter",
    name: "Starter Credit Pack",
    credits: 120,
    price: 2499,
    desc: "Small project aur quick AI workflow ke liye.",
    features: [
      "Interior / exterior render credits",
      "Magic Brief and Architect Chat",
      "Client PDF exports",
      "Valid for 30 days",
    ],
  },
  {
    id: "pro",
    name: "Pro Credit Pack",
    credits: 400,
    price: 4999,
    badge: "MOST POPULAR",
    popular: true,
    desc: "Active designer, architect aur contractor workflow ke liye.",
    features: [
      "High render generations",
      "Naksha + Structure draft usage",
      "BOQ / BBS draft usage",
      "Valid for 60 days",
    ],
  },
  {
    id: "agency",
    name: "Agency Credit Pack",
    credits: 1200,
    price: 12999,
    badge: "BEST VALUE",
    desc: "Agency aur multi-client project workflow ke liye.",
    features: [
      "High volume AI usage",
      "Large PDF / report usage",
      "Contractor package workflow",
      "Valid for 90 days",
    ],
  },
];

function money(value: number) {
  return "₹" + value.toLocaleString("en-IN");
}

function InfoCard({
  icon,
  title,
  desc,
}: {
  icon: ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="flex h-full min-h-[150px] flex-col rounded-[22px] border border-[#e6ddf4] bg-white p-5 shadow-[0_10px_28px_rgba(70,35,130,0.05)]">
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#f2e8ff] to-[#eadbff] text-[#7c3aed]">
        {icon}
      </div>
      <h3 className="text-[17px] font-black tracking-[-0.03em] text-[#21133f]">
        {title}
      </h3>
      <p className="mt-2 text-[13px] leading-6 text-[#766987]">{desc}</p>
    </div>
  );
}

function PackCard({
  pack,
  buyingPack,
  onBuy,
}: {
  pack: Pack;
  buyingPack: string;
  onBuy: (packId: string) => void;
}) {
  const isBuying = buyingPack === pack.id;

  return (
    <article
      className={`relative flex h-full min-h-[500px] flex-col overflow-hidden rounded-[24px] border bg-white shadow-[0_16px_42px_rgba(65,29,120,0.06)] ${
        pack.popular
          ? "border-[#8b5cf6] shadow-[0_0_0_2px_rgba(139,92,246,0.10),0_18px_48px_rgba(91,33,182,0.10)]"
          : "border-[#e6ddf4]"
      }`}
    >
      <div className="h-1 w-full bg-gradient-to-r from-[#5b43ea] via-[#8b31d9] to-[#d946ef]" />

      {pack.badge ? (
        <div className="absolute left-5 top-4 rounded-full bg-gradient-to-r from-[#6d28d9] to-[#c026d3] px-3 py-1 text-[10px] font-black tracking-wide text-white shadow-md">
          {pack.badge}
        </div>
      ) : null}

      <div className="flex h-full flex-col p-5 pt-6">
        <div className="mt-4 grid min-h-[104px] grid-cols-[1fr_auto] items-start gap-4">
          <div>
            <h2 className="text-[18px] font-black tracking-[-0.04em] text-[#201537]">
              {pack.name}
            </h2>
            <p className="mt-2 line-clamp-2 text-[13px] leading-6 text-[#786a91]">
              {pack.desc}
            </p>
          </div>

          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#f1e8ff] to-[#eadbff] text-[#7c3aed]">
            <Zap size={20} />
          </div>
        </div>

        <div className="mt-0 rounded-[20px] border border-[#f0e9fb] bg-[#fcfbff] p-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[11px] font-black uppercase tracking-wider text-[#8b7ca6]">
                Credits
              </p>
              <p className="mt-1 text-[24px] font-black tracking-[-0.05em] text-[#1f1433]">
                {pack.credits.toLocaleString("en-IN")}
              </p>
            </div>

            <div className="text-right">
              <p className="text-[11px] font-black uppercase tracking-wider text-[#8b7ca6]">
                Price
              </p>
              <p className="mt-1 text-[24px] font-black tracking-[-0.05em] text-[#1f1433]">
                {money(pack.price)}
              </p>
            </div>
          </div>
        </div>

        <button
          disabled={isBuying}
          onClick={() => onBuy(pack.id)}
          className="mt-5 flex h-12 w-full shrink-0 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#5b43ea] via-[#7c3aed] to-[#d946ef] text-sm font-black text-white shadow-[0_12px_28px_rgba(124,58,237,0.24)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70"
        >
          <Plus size={18} />
          {isBuying ? "Adding Credits..." : "Buy Credits"}
        </button>

        <div className="mt-5 space-y-3">
          {pack.features.map((feature) => (
            <div key={feature} className="flex gap-3 text-[13px] leading-6 text-[#43345f]">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#7c3aed]" />
              <span>{feature}</span>
            </div>
          ))}
        </div>

        <div className="mt-auto pt-4" />
      </div>
    </article>
  );
}

export default function CreditsPage() {
  const [credits, setCredits] = useState(120);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [buyingPack, setBuyingPack] = useState("");
  const [notice, setNotice] = useState("");

  async function loadCredits() {
    setLoading(true);
    setNotice("");

    try {
      const res = await fetch("/api/credits/history", { cache: "no-store" });
      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Failed to load credits");
      }

      setCredits(Number(data.credits || 0));
      setTransactions(Array.isArray(data.transactions) ? data.transactions : []);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Failed to load credits");
    } finally {
      setLoading(false);
    }
  }

  async function buyCredits(packId: string) {
    setBuyingPack(packId);
    setNotice("");

    try {
      const scriptLoaded = await loadRazorpayScript();

      if (!scriptLoaded || !window.Razorpay) {
        throw new Error("Razorpay checkout script load nahi hua. Please refresh and try again.");
      }

      const orderRes = await fetch("/api/credits/order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ packId }),
      });

      const orderData = await orderRes.json();

      if (!orderRes.ok || !orderData.ok) {
        throw new Error(orderData.error || "Failed to create Razorpay order");
      }

      const pack = orderData.pack;
      const order = orderData.order;

      const options: RazorpayCheckoutOptions = {
        key: orderData.keyId,
        amount: order.amount,
        currency: order.currency || "INR",
        name: "BuildSetu AI",
        description: `${pack.name} · ${pack.credits} credits`,
        order_id: order.id,
        prefill: {
          name: "BuildSetu User",
          email: "demo@buildsetu.ai",
        },
        notes: {
          packId,
          packName: pack.name,
          credits: String(pack.credits),
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

            const verifyData = await verifyRes.json();

            if (!verifyRes.ok || !verifyData.ok) {
              throw new Error(verifyData.error || "Payment verification failed");
            }

            setCredits(Number(verifyData.credits || 0));
            setNotice(verifyData.message || "Credits added successfully");
            await loadCredits();
          } catch (error) {
            setNotice(error instanceof Error ? error.message : "Payment verification failed");
          } finally {
            setBuyingPack("");
          }
        },
      };

      const checkout = new window.Razorpay(options);
      checkout.open();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Failed to start Razorpay checkout");
      setBuyingPack("");
    }
  }

  useEffect(() => {
    loadCredits();
  }, []);

  const recommendedPack = packs.find((p) => p.id === "pro") || packs[1];

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#f8f3ff_0%,#fcfbff_36%,#ffffff_100%)] text-[#201537]">
      <section className="mx-auto max-w-[1240px] px-5 py-6">
        <div className="mb-5 flex items-center justify-between">
          <a
            href="/"
            className="inline-flex items-center gap-2 text-sm font-black text-[#5f5476] hover:text-[#7c3aed]"
          >
            <ArrowLeft size={17} />
            Back to dashboard
          </a>

          <a
            href="/pricing"
            className="inline-flex h-11 items-center justify-center rounded-2xl border border-[#e3d9f3] bg-white px-5 text-sm font-black text-[#21133f] shadow-sm hover:bg-purple-50"
          >
            View Plans
          </a>
        </div>

        <section className="rounded-[26px] border border-[#e7def5] bg-white p-4 shadow-[0_16px_45px_rgba(65,29,120,0.05)]">
          <div className="grid gap-4 lg:grid-cols-[1.65fr_0.85fr]">
            <div className="relative overflow-hidden rounded-[22px] border border-[#ece4f8] bg-[linear-gradient(135deg,#ffffff_0%,#fbf8ff_56%,#f2e7ff_100%)] p-5">
              <div className="absolute -right-16 -top-16 h-44 w-44 rounded-full bg-[#e9d5ff] opacity-45 blur-3xl" />
              <div className="absolute left-0 top-0 h-1 w-full bg-gradient-to-r from-[#5b43ea] via-[#8b31d9] to-[#d946ef]" />

              <div className="relative grid gap-5 xl:grid-cols-[1fr_280px] xl:items-center">
                <div>
                  <div className="mb-3 inline-flex w-fit items-center gap-2 rounded-full border border-[#eadcff] bg-white/85 px-3 py-1 text-[11px] font-black uppercase tracking-wide text-[#7c3aed] shadow-sm">
                    <Sparkles size={13} />
                    BuildSetu Credits
                  </div>

                  <h1 className="text-[30px] font-black leading-none tracking-[-0.06em] text-[#21133f] md:text-[40px]">
                    Buy more credits
                  </h1>

                  <p className="mt-3 max-w-2xl text-[14px] leading-6 text-[#6c5f84]">
                    Credits khatam hone par extra credits purchase karo. Ye credits renders,
                    AI tools, BOQ/BBS, agreements aur PDF exports me use honge.
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2.5">
                    <span className="inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-2 text-[12px] font-black text-[#5f5476] shadow-sm ring-1 ring-[#eee6f8]">
                      <BadgeCheck size={14} className="text-emerald-500" />
                      Instant top-up
                    </span>
                    <span className="inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-2 text-[12px] font-black text-[#5f5476] shadow-sm ring-1 ring-[#eee6f8]">
                      <Shield size={14} className="text-[#7c3aed]" />
                      Usage-based
                    </span>
                    <span className="inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-2 text-[12px] font-black text-[#5f5476] shadow-sm ring-1 ring-[#eee6f8]">
                      <Lock size={14} className="text-amber-500" />
                      Secure Razorpay
                    </span>
                  </div>

                  {notice ? (
                    <div className="mt-4 rounded-2xl border border-[#e6ddf4] bg-white px-4 py-3 text-sm font-bold text-[#5f2bbd]">
                      {notice}
                    </div>
                  ) : null}
                </div>

                <div className="grid gap-3">
                  <div className="rounded-2xl border border-[#efe6fb] bg-white/80 p-4 shadow-sm">
                    <p className="text-[11px] font-black uppercase tracking-wider text-[#8b7ca6]">
                      Minimum Pack
                    </p>
                    <p className="mt-1 text-[22px] font-black tracking-[-0.04em] text-[#21133f]">
                      ₹2,499
                    </p>
                    <p className="mt-1 text-xs text-[#786a91]">120 credits se start</p>
                  </div>

                  <div className="rounded-2xl border border-[#efe6fb] bg-white/80 p-4 shadow-sm">
                    <p className="text-[11px] font-black uppercase tracking-wider text-[#8b7ca6]">
                      Mode
                    </p>
                    <p className="mt-1 text-[18px] font-black tracking-[-0.03em] text-[#21133f]">
                      Razorpay checkout
                    </p>
                    <p className="mt-1 text-xs text-[#786a91]">Payment verification active</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-[22px] border border-[#eadfff] bg-[linear-gradient(180deg,#fbf7ff_0%,#efe5ff_100%)] p-5 shadow-inner">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#8f7fa7]">
                    Available Credits
                  </p>
                  <p className="mt-2 text-[48px] font-black leading-none tracking-[-0.08em] text-[#1f1433]">
                    {loading ? "..." : credits.toLocaleString("en-IN")}
                  </p>
                </div>

                <div className="flex h-14 w-14 items-center justify-center rounded-[20px] bg-gradient-to-br from-[#7c3aed] to-[#d946ef] text-white shadow-[0_16px_34px_rgba(124,58,237,0.25)]">
                  <Wallet size={25} />
                </div>
              </div>

              <div className="mt-4 rounded-[18px] border border-white/70 bg-white/75 p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-black uppercase tracking-wide text-[#8b7ca6]">
                    Recommended
                  </span>
                  <span className="rounded-full bg-[#efe8ff] px-3 py-1 text-[10px] font-black text-[#7c3aed]">
                    PRO
                  </span>
                </div>

                <div className="mt-3 flex items-end justify-between gap-3">
                  <div>
                    <p className="text-[24px] font-black tracking-[-0.05em] text-[#21133f]">
                      {recommendedPack.credits} Credits
                    </p>
                    <p className="mt-1 text-xs text-[#786a91]">Best for active workflows</p>
                  </div>
                  <p className="text-[22px] font-black tracking-[-0.04em] text-[#21133f]">
                    {money(recommendedPack.price)}
                  </p>
                </div>
              </div>

              <button
                onClick={() => buyCredits("pro")}
                disabled={Boolean(buyingPack)}
                className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-[#21133f] text-sm font-black text-white shadow-[0_12px_26px_rgba(33,19,63,0.18)] disabled:cursor-not-allowed disabled:opacity-70"
              >
                <Plus size={18} />
                {buyingPack === "pro" ? "Adding..." : "Buy More Credits"}
              </button>
            </div>
          </div>
        </section>

        <section className="mt-5 grid gap-4 md:grid-cols-3">
          <InfoCard
            icon={<BadgeCheck size={20} />}
            title="Instant top-up"
            desc="Payment success ke baad credits database me instantly add honge."
          />
          <InfoCard
            icon={<Shield size={20} />}
            title="Usage control"
            desc="Next step me tool run ke according credits deduct honge."
          />
          <InfoCard
            icon={<CreditCard size={20} />}
            title="Razorpay ready"
            desc="Keys add hone ke baad same flow real payment verification se connect hoga."
          />
        </section>

        <section id="credit-packs" className="mt-5 grid gap-4 lg:grid-cols-3">
          {packs.map((pack) => (
            <PackCard key={pack.id} pack={pack} buyingPack={buyingPack} onBuy={buyCredits} />
          ))}
        </section>

        <section className="mt-5 rounded-[24px] border border-[#e7def5] bg-white p-5 shadow-[0_14px_40px_rgba(65,29,120,0.04)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h3 className="text-[22px] font-black tracking-[-0.05em] text-[#1f1632]">
                Purchase history
              </h3>
              <p className="mt-2 text-sm leading-6 text-[#796c91]">
                Latest credit transactions from database.
              </p>
            </div>

            <button
              onClick={loadCredits}
              className="rounded-full bg-[#fbf8ff] px-4 py-2 text-xs font-black text-[#665a7d] ring-1 ring-[#efe8fb]"
            >
              Refresh History
            </button>
          </div>

          <div className="mt-4 space-y-3">
            {transactions.length ? (
              transactions.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col gap-2 rounded-2xl border border-[#efe8fb] bg-[#fbf8ff] px-4 py-3 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <p className="text-sm font-black text-[#21133f]">
                      {item.actionType} · {item.creditsUsed > 0 ? "+" : ""}
                      {item.creditsUsed} credits
                    </p>
                    <p className="mt-1 text-xs text-[#786a91]">{item.note || "Credit transaction"}</p>
                  </div>
                  <p className="text-xs font-bold text-[#8b7ca6]">
                    {new Date(item.createdAt).toLocaleString("en-IN")}
                  </p>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-[#efe8fb] bg-[#fbf8ff] px-4 py-4 text-sm text-[#786a91]">
                No purchase history yet.
              </div>
            )}
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <span className="inline-flex items-center gap-2 rounded-full bg-[#fbf8ff] px-4 py-2 text-xs font-black text-[#665a7d] ring-1 ring-[#efe8fb]">
              <Star size={14} />
              Manual billing supported
            </span>
            <span className="inline-flex items-center gap-2 rounded-full bg-[#fbf8ff] px-4 py-2 text-xs font-black text-[#665a7d] ring-1 ring-[#efe8fb]">
              <Lock size={14} />
              Razorpay verification active
            </span>
          </div>
        </section>
      </section>
    </main>
  );
}
