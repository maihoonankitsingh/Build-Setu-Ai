"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  BadgeCheck,
  CheckCircle2,
  CreditCard,
  History,
  Landmark,
  Lock,
  Plus,
  QrCode,
  ReceiptText,
  Shield,
  Smartphone,
  Sparkles,
  Wallet,
  Zap,
} from "lucide-react";

type Pack = {
  id: "starter" | "pro" | "agency";
  name: string;
  label: string;
  desc: string;
  credits: number;
  price: number;
  popular?: boolean;
  badge?: string;
  features: string[];
};

type CreditTransaction = {
  id: string;
  actionType: string;
  creditsUsed: number;
  note?: string | null;
  createdAt: string;
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

const packs: Pack[] = [
  {
    id: "starter",
    name: "Starter Credit Pack",
    label: "Quick top-up",
    desc: "Small project, testing aur quick AI workflows ke liye.",
    credits: 50000,
    price: 2499,
    badge: "STARTER",
    features: [
      "Magic Brief, Client PDF and chat usage",
      "Small render and document workflow",
      "Best for testing BuildSetu AI tools",
      "Valid for active workspace usage",
    ],
  },
  {
    id: "pro",
    name: "Pro Credit Pack",
    label: "Most popular",
    desc: "Designers, architects aur contractors ke active workflow ke liye.",
    credits: 100000,
    price: 1,
    popular: true,
    badge: "MOST POPULAR",
    features: [
      "Enough credits for daily AI workflow",
      "Render, BOQ, BBS and PDF usage",
      "Best value for solo professionals",
      "Razorpay secure checkout active",
    ],
  },
  {
    id: "agency",
    name: "Agency Credit Pack",
    label: "High volume",
    desc: "Agencies aur multi-client projects ke liye large credit pack.",
    credits: 300000,
    price: 12999,
    badge: "AGENCY",
    features: [
      "High volume render and documentation usage",
      "BOQ/BBS, agreements and reports",
      "Multi-client project workflow",
      "Best for teams and contractors",
    ],
  },
];

const usageExamples = [
  ["Magic Brief", "500 credits"],
  ["Client PDF", "500 credits"],
  ["BOQ draft", "1,000 credits"],
  ["BBS draft", "1,500 credits"],
  ["AI render", "2,500 credits"],
];

const paymentMethods = [
  { label: "UPI QR", sub: "Scan & pay", icon: QrCode },
  { label: "UPI", sub: "PhonePe, GPay", icon: Smartphone },
  { label: "Cards", sub: "Visa, MC, Amex", icon: CreditCard },
  { label: "Netbanking", sub: "Major banks", icon: Landmark },
  { label: "Wallets", sub: "Paytm & more", icon: Wallet },
  { label: "RuPay", sub: "Debit cards", icon: ReceiptText },
];

function money(value: number) {
  return "₹" + value.toLocaleString("en-IN");
}

function compact(value: number) {
  return value.toLocaleString("en-IN");
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

export default function CreditsPage() {
  const [credits, setCredits] = useState(0);
  const [currentUser, setCurrentUser] = useState<{ name?: string; email?: string; credits?: number } | null>(null);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [buyingPack, setBuyingPack] = useState("");
  const [notice, setNotice] = useState("");

  const recommended = useMemo(() => packs.find((pack) => pack.id === "pro") || packs[1], []);

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

      const res = await fetch("/api/credits/balance", {
        cache: "no-store",
        credentials: "same-origin",
      });
      const data = await res.json().catch(() => null);

      if (data?.authenticated) {
        setCredits(Number(data.credits ?? data.balance ?? meData.user.credits ?? 0));
      }

      const historyRes = await fetch("/api/credits/history", {
        cache: "no-store",
        credentials: "same-origin",
      });
      const historyData = await historyRes.json().catch(() => null);

      setTransactions(Array.isArray(historyData?.transactions) ? historyData.transactions : []);
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
        throw new Error("Razorpay checkout load nahi hua. Page refresh karke dobara try karein.");
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

      const checkout = new window.Razorpay({
        key: orderData.keyId,
        amount: order.amount,
        currency: order.currency || "INR",
        name: "BuildSetu AI",
        description: `${pack.name} · ${compact(pack.credits)} credits`,
        order_id: order.id,
        prefill: {
          name: currentUser?.name || "BuildSetu User",
          email: currentUser?.email || "",
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

            const updatedBalance = Number(
              verifyData.balance ??
              verifyData.credits ??
              verifyData.totalCredits ??
              verifyData.creditsAdded ??
              credits
            );

            setNotice(verifyData.message || "Payment verified. Credits added successfully.");

            if (Number.isFinite(updatedBalance)) {
              setCredits(updatedBalance);
            }

            await loadCredits();

            window.setTimeout(() => {
              window.location.href = "/account?payment=success";
            }, 700);
          } catch (error) {
            setNotice(error instanceof Error ? error.message : "Payment verification failed");
          } finally {
            setBuyingPack("");
          }
        },
      });

      checkout.open();
    } catch (error) {
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
        </header>

        <section className="rounded-[28px] border border-[#e7def5] bg-white p-4 shadow-[0_18px_50px_rgba(65,29,120,0.06)]">
          <div className="grid gap-4 lg:grid-cols-[1.55fr_0.9fr]">
            <div className="relative overflow-hidden rounded-[24px] border border-[#ece4f8] bg-[linear-gradient(135deg,#ffffff_0%,#fbf8ff_54%,#f1e4ff_100%)] p-6">
              <div className="absolute -right-16 -top-16 h-52 w-52 rounded-full bg-[#e9d5ff] opacity-50 blur-3xl" />
              <div className="absolute left-0 top-0 h-1 w-full bg-gradient-to-r from-[#5b43ea] via-[#8b31d9] to-[#d946ef]" />

              <div className="relative">
                <div className="mb-3 inline-flex w-fit items-center gap-2 rounded-full border border-[#eadcff] bg-white/85 px-3 py-1 text-[11px] font-black uppercase tracking-wide text-[#7c3aed] shadow-sm">
                  <Sparkles size={13} />
                  BuildSetu credits
                </div>

                <h1 className="max-w-2xl text-[38px] font-black leading-none tracking-[-0.07em] text-[#21133f] md:text-[54px]">
                  Buy credits for AI workflow
                </h1>

                <p className="mt-4 max-w-3xl text-[15px] leading-7 text-[#6c5f84]">
                  Credits renders, Magic Brief, BOQ, BBS, client PDFs, agreements aur
                  BuildSetu AI tools me use honge. Large credit balance se usage clear
                  aur scalable dikhega.
                </p>

                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl bg-white/80 p-4 ring-1 ring-[#eee6f8]">
                    <p className="text-xs font-black uppercase tracking-wider text-[#8b7ca6]">
                      Pro pack
                    </p>
                    <p className="mt-1 text-[24px] font-black tracking-[-0.05em] text-[#21133f]">
                      100,000
                    </p>
                    <p className="text-xs font-bold text-[#7c3aed]">credits at ₹4,999</p>
                  </div>

                  <div className="rounded-2xl bg-white/80 p-4 ring-1 ring-[#eee6f8]">
                    <p className="text-xs font-black uppercase tracking-wider text-[#8b7ca6]">
                      AI render
                    </p>
                    <p className="mt-1 text-[24px] font-black tracking-[-0.05em] text-[#21133f]">
                      2,500
                    </p>
                    <p className="text-xs font-bold text-[#7c3aed]">credits per output</p>
                  </div>

                  <div className="rounded-2xl bg-white/80 p-4 ring-1 ring-[#eee6f8]">
                    <p className="text-xs font-black uppercase tracking-wider text-[#8b7ca6]">
                      Payment
                    </p>
                    <p className="mt-1 text-[24px] font-black tracking-[-0.05em] text-[#21133f]">
                      Razorpay
                    </p>
                    <p className="text-xs font-bold text-[#7c3aed]">UPI, QR, cards</p>
                  </div>
                </div>

                {notice ? (
                  <div className="mt-5 rounded-2xl border border-[#e6ddf4] bg-white px-4 py-3 text-sm font-bold text-[#5f2bbd]">
                    {notice}
                  </div>
                ) : null}
              </div>
            </div>

            <aside className="rounded-[24px] border border-[#eadfff] bg-[linear-gradient(180deg,#fbf7ff_0%,#efe5ff_100%)] p-5 shadow-inner">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#8f7fa7]">
                    Available credits
                  </p>
                  <p className="mt-3 text-[52px] font-black leading-none tracking-[-0.08em] text-[#1f1433]">
                    {loading ? "..." : compact(credits)}
                  </p>
                </div>

                <div className="flex h-14 w-14 items-center justify-center rounded-[20px] bg-gradient-to-br from-[#7c3aed] to-[#d946ef] text-white shadow-[0_16px_34px_rgba(124,58,237,0.25)]">
                  <Wallet size={25} />
                </div>
              </div>

              <div className="mt-5 rounded-[20px] border border-white/70 bg-white/75 p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-black uppercase tracking-wide text-[#8b7ca6]">
                    Recommended
                  </span>
                  <span className="rounded-full bg-[#efe8ff] px-3 py-1 text-[10px] font-black text-[#7c3aed]">
                    PRO
                  </span>
                </div>

                <div className="mt-3">
                  <p className="text-[26px] font-black tracking-[-0.05em] text-[#21133f]">
                    {compact(recommended.credits)} Credits
                  </p>
                  <p className="mt-1 text-sm font-bold text-[#786a91]">
                    {money(recommended.price)} · best for active workflows
                  </p>
                </div>
              </div>

              <button
                onClick={() => buyCredits("pro")}
                disabled={Boolean(buyingPack)}
                className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#21133f] text-sm font-black text-white shadow-[0_12px_26px_rgba(33,19,63,0.18)] disabled:cursor-not-allowed disabled:opacity-70"
              >
                <Plus size={18} />
                {buyingPack === "pro" ? "Opening..." : "Buy 100,000 Credits"}
              </button>
            </aside>
          </div>
        </section>

        <section className="mt-5 grid gap-4 lg:grid-cols-3">
          {packs.map((pack) => (
            <article
              key={pack.id}
              className={`relative flex min-h-[460px] flex-col overflow-hidden rounded-[26px] border bg-white shadow-[0_18px_48px_rgba(65,29,120,0.07)] ${
                pack.popular
                  ? "border-[#8b5cf6] shadow-[0_0_0_2px_rgba(139,92,246,0.12),0_22px_60px_rgba(91,33,182,0.12)]"
                  : "border-[#e6ddf4]"
              }`}
            >
              <div className="h-1 w-full bg-gradient-to-r from-[#5b43ea] via-[#8b31d9] to-[#d946ef]" />

              {pack.badge ? (
                <div className="absolute left-5 top-4 rounded-full bg-gradient-to-r from-[#6d28d9] to-[#c026d3] px-3 py-1 text-[10px] font-black tracking-wide text-white shadow-md">
                  {pack.badge}
                </div>
              ) : null}

              <div className="flex h-full flex-col p-5 pt-10">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-black uppercase tracking-wider text-[#8b7ca6]">
                      {pack.label}
                    </p>
                    <h2 className="mt-2 text-[21px] font-black tracking-[-0.05em] text-[#201537]">
                      {pack.name}
                    </h2>
                    <p className="mt-2 min-h-[48px] text-[13px] leading-6 text-[#786a91]">
                      {pack.desc}
                    </p>
                  </div>

                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#f1e8ff] to-[#eadbff] text-[#7c3aed]">
                    <Zap size={22} />
                  </div>
                </div>

                <div className="mt-4 rounded-[20px] border border-[#f0e9fb] bg-[#fcfbff] p-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-wider text-[#8b7ca6]">
                        Credits
                      </p>
                      <p className="mt-1 text-[28px] font-black tracking-[-0.06em] text-[#1f1433]">
                        {compact(pack.credits)}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-[11px] font-black uppercase tracking-wider text-[#8b7ca6]">
                        Price
                      </p>
                      <p className="mt-1 text-[28px] font-black tracking-[-0.06em] text-[#1f1433]">
                        {money(pack.price)}
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  disabled={buyingPack === pack.id}
                  onClick={() => buyCredits(pack.id)}
                  className="mt-5 flex h-12 w-full shrink-0 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#5b43ea] via-[#7c3aed] to-[#d946ef] text-sm font-black text-white shadow-[0_12px_28px_rgba(124,58,237,0.24)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  <Plus size={18} />
                  {buyingPack === pack.id ? "Opening..." : "Buy Credits"}
                </button>

                <div className="mt-5 space-y-3">
                  {pack.features.map((feature) => (
                    <div key={feature} className="flex gap-3 text-[13px] leading-6 text-[#43345f]">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#7c3aed]" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-auto pt-4 text-xs font-bold text-[#8b7ca6]">
                  Secure Razorpay checkout
                </div>
              </div>
            </article>
          ))}
        </section>

        <section className="mt-6 rounded-[26px] border border-[#e8def7] bg-[linear-gradient(135deg,#ffffff_0%,#fbf8ff_55%,#f3e9ff_100%)] p-5 shadow-[0_14px_38px_rgba(65,29,120,0.05)]">
          <div className="grid gap-5 lg:grid-cols-[0.9fr_1.4fr] lg:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-[11px] font-black uppercase tracking-wide text-[#7c3aed] ring-1 ring-[#eadcff]">
                <Lock size={13} />
                Payment options
              </div>
              <h3 className="mt-3 text-[26px] font-black leading-tight tracking-[-0.06em] text-[#21133f]">
                Secure payment methods
              </h3>
              <p className="mt-2 text-sm leading-6 text-[#786a91]">
                Razorpay checkout supports UPI QR, UPI apps, cards, netbanking, wallets and RuPay.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              {paymentMethods.map((method) => {
                const Icon = method.icon;

                return (
                  <div
                    key={method.label}
                    className="rounded-2xl border border-[#e6ddf4] bg-white p-4 shadow-[0_8px_22px_rgba(65,29,120,0.04)]"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f1e6ff] text-[#7c3aed]">
                        <Icon size={20} />
                      </span>
                      <span>
                        <p className="text-sm font-black text-[#21133f]">{method.label}</p>
                        <p className="text-[11px] font-bold text-[#8b7ca6]">{method.sub}</p>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-[26px] border border-[#e8def7] bg-white p-5 shadow-[0_14px_38px_rgba(65,29,120,0.04)]">
          <div className="text-center">
            <div className="mx-auto mb-3 inline-flex items-center gap-2 rounded-full bg-[#f1e6ff] px-3 py-1 text-[11px] font-black uppercase tracking-wide text-[#7c3aed]">
              <Zap size={13} />
              Usage ratio
            </div>
            <h3 className="text-[26px] font-black tracking-[-0.06em] text-[#21133f]">
              Credit usage examples
            </h3>
            <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-[#786a91]">
              Same old usage ratio ko large-credit model me scale kiya gaya hai. Credits only final output par deduct honge.
            </p>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-5">
            {usageExamples.map(([name, cost]) => (
              <div key={name} className="rounded-[20px] border border-[#e5daf4] bg-[#fbf8ff] p-4 text-center">
                <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-[#7c3aed] ring-1 ring-[#eadcff]">
                  <Zap size={19} />
                </div>
                <p className="text-sm font-black text-[#21133f]">{name}</p>
                <p className="mt-1 text-[18px] font-black tracking-[-0.04em] text-[#7c3aed]">
                  {cost}
                </p>
                <p className="mt-1 text-[11px] font-bold text-[#8b7ca6]">per output</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-6 rounded-[24px] border border-[#e7def5] bg-white p-5 shadow-[0_14px_40px_rgba(65,29,120,0.04)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <History size={20} className="text-[#7c3aed]" />
                <h3 className="text-[22px] font-black tracking-[-0.05em] text-[#1f1632]">
                  Purchase & usage history
                </h3>
              </div>
              <p className="mt-2 text-sm leading-6 text-[#796c91]">
                Latest wallet transactions from database.
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
                      {compact(item.creditsUsed)} credits
                    </p>
                    <p className="mt-1 text-xs text-[#786a91]">
                      {item.note || "Credit transaction"}
                    </p>
                  </div>
                  <p className="text-xs font-bold text-[#8b7ca6]">
                    {new Date(item.createdAt).toLocaleString("en-IN")}
                  </p>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-[#efe8fb] bg-[#fbf8ff] px-4 py-4 text-sm text-[#786a91]">
                No transaction history yet.
              </div>
            )}
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <span className="inline-flex items-center gap-2 rounded-full bg-[#fbf8ff] px-4 py-2 text-xs font-black text-[#665a7d] ring-1 ring-[#efe8fb]">
              <BadgeCheck size={14} />
              Verified payment flow
            </span>
            <span className="inline-flex items-center gap-2 rounded-full bg-[#fbf8ff] px-4 py-2 text-xs font-black text-[#665a7d] ring-1 ring-[#efe8fb]">
              <Shield size={14} />
              Usage-based deduction
            </span>
          </div>
        </section>
      </section>
    </main>
  );
}
