"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  BadgeCheck,
  CheckCircle2,
  CreditCard,
  HelpCircle,
  Landmark,
  Lock,
  QrCode,
  ReceiptText,
  Smartphone,
  Shield,
  Sparkles,
  Star,
  Wallet,
  Zap,
} from "lucide-react";
import PricingUpgradeBridge from "./PricingUpgradeBridge";

type Billing = "monthly" | "yearly";

const planData = [
  {
    key: "pro",
    badge: "PRO",
    title: "Pro",
    subtitle: "Best for solo designers and small studios",
    monthlyPrice: 4999,
    yearlyPrice: 49999,
    monthlyCredits: 200,
    yearlyCredits: 2400,
    accent: "orange",
    buttonClass: "bg-gradient-to-r from-[#ff5a1f] to-[#ff7a00]",
    features: [
      "200 Interior & Exterior designs",
      "200 Magic Brief generations",
      "200 Floor Plan AI drafts",
      "100 BOQ draft runs",
      "50 Client PDF exports",
      "Commercial License",
      "API Access",
    ],
  },
  {
    key: "max",
    badge: "MAX",
    title: "Max",
    subtitle: "Best for active architects and contractors",
    monthlyPrice: 9999,
    yearlyPrice: 99999,
    monthlyCredits: 500,
    yearlyCredits: 6000,
    popular: true,
    accent: "green",
    buttonClass: "bg-gradient-to-r from-[#12b981] to-[#079c86]",
    features: [
      "500 Interior & Exterior designs",
      "500 Naksha Studio outputs",
      "500 Structure Studio outputs",
      "250 BOQ + BBS drafts",
      "150 Full Project PDFs",
      "Client Agreement generator",
      "Commercial License",
      "API Access",
    ],
  },
  {
    key: "ultra",
    badge: "ULTRA",
    title: "Ultra",
    subtitle: "Best for agencies and multiple clients",
    monthlyPrice: 24999,
    yearlyPrice: 249999,
    monthlyCredits: 1500,
    yearlyCredits: 18000,
    accent: "purple",
    buttonClass: "bg-gradient-to-r from-[#7c3aed] to-[#c026d3]",
    features: [
      "1,500 Interior & Exterior designs",
      "1,500 Magic Brief generations",
      "1,500 Naksha + Structure outputs",
      "750 BOQ + BBS drafts",
      "400 Full Project PDFs",
      "Contractor package workflow",
      "Team-ready documentation",
      "API Access & white-label ready",
    ],
  },
];

const usage = [
  ["Magic Brief", "1 credit"],
  ["Client PDF", "1 credit"],
  ["BOQ draft", "2 credits"],
  ["BBS draft", "3 credits"],
  ["AI render", "5 credits"],
];

const faqs = [
  ["What happens when credits end?", "You can buy extra pay-as-you-go credits from the credits page."],
  ["Do I get invoice after payment?", "Razorpay payment confirmation is active. GST invoice workflow can be added next."],
  ["Can I cancel anytime?", "Yes. Plan renewal can be managed manually now; automated subscription management can be connected later."],
  ["Are BOQ/BBS outputs final?", "No. BOQ, BBS, structure and legal outputs should be reviewed by qualified professionals."],
];

function money(value: number) {
  return "₹" + value.toLocaleString("en-IN");
}

export default function PricingPage() {
  const [billing, setBilling] = useState<Billing>("monthly");
  const [activePlan, setActivePlan] = useState<any>(null);

  useEffect(() => {
    fetch("/api/plans/status", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (data?.ok) setActivePlan(data.plan || null);
      })
      .catch(() => setActivePlan(null));
  }, []);

  const plans = useMemo(() => {
    return planData.map((plan) => ({
      ...plan,
      price: billing === "monthly" ? plan.monthlyPrice : plan.yearlyPrice,
      credits: billing === "monthly" ? plan.monthlyCredits : plan.yearlyCredits,
      planId: `${plan.key}_${billing}`,
    }));
  }, [billing]);

  return (
    <main className="min-h-screen bg-white text-[#21133f]">
      <PricingUpgradeBridge />

      <section className="mx-auto max-w-[1180px] px-5 py-6">
        <header className="mb-5 flex items-center justify-between">
          <a
            href="/"
            className="inline-flex items-center gap-2 text-sm font-bold text-[#6b607a] hover:text-[#7c3aed]"
          >
            <ArrowLeft size={16} />
            Back
          </a>

          <a
            href="/"
            className="rounded-2xl border border-[#e5daf4] bg-white px-5 py-3 text-sm font-black text-[#21133f] shadow-sm hover:bg-[#fbf8ff]"
          >
            Workspace
          </a>
        </header>

        <section className="rounded-[24px] border border-[#e8def7] bg-[linear-gradient(135deg,#ffffff_0%,#fbf8ff_58%,#f0e3ff_100%)] p-4 shadow-[0_12px_36px_rgba(65,29,120,0.06)]">
          <div className="grid gap-4 md:grid-cols-[1fr_260px] md:items-center">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-[#ead7ff] px-3 py-1 text-[11px] font-black text-[#7c3aed]">
                <Sparkles size={13} />
                Account billing
              </div>
              <h1 className="text-[36px] font-black leading-none tracking-[-0.07em] text-[#21133f]">
                Upgrade your plan
              </h1>
              <p className="mt-3 max-w-2xl text-[14px] leading-6 text-[#786a91]">
                Generate interiors, naksha, structure drafts, BOQ, BBS, client PDFs
                and project documents with BuildSetu AI.
              </p>
            </div>

            <div className="rounded-[18px] border border-[#e1d3f4] bg-white p-3 shadow-[0_10px_28px_rgba(65,29,120,0.10)]">
              <div className="flex gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#7c3aed] to-[#c026d3] text-white">
                  <CreditCard size={22} />
                </div>
                <div>
                  <p className="text-sm font-black text-[#21133f]">
                    {activePlan ? activePlan.planName : "Pro Plan"}
                  </p>
                  <p className="text-xs font-bold text-[#8b7ca6]">
                    {activePlan
                      ? `Renews on ${new Date(activePlan.renewsAt).toLocaleDateString("en-IN")}`
                      : "Renews on 20 Jun 2026"}
                  </p>
                </div>
              </div>
              <button
                data-plan-id={`pro_${billing}`}
                className="mt-3 h-10 w-full rounded-xl bg-gradient-to-r from-[#6d28d9] to-[#c026d3] text-sm font-black text-white"
              >
                Upgrade Plan
              </button>
            </div>
          </div>
        </section>

        <section className="mt-5 text-center">
          <h2 className="text-[34px] font-black leading-none tracking-[-0.07em] text-[#2a2630]">
            Scale your business
          </h2>
          <p className="mt-2 text-sm text-[#7d728f]">
            Built for designers, architects, contractors and agencies.
          </p>

          <div className="mt-5 inline-flex rounded-full bg-[#ebe9f0] p-1">
            <button
              data-billing-active={billing === "monthly" ? "monthly" : undefined}
              onClick={() => setBilling("monthly")}
              className={`h-11 rounded-full px-9 text-sm font-bold transition ${
                billing === "monthly" ? "bg-white text-[#21133f] shadow-sm" : "text-[#8b8198]"
              }`}
            >
              Monthly
            </button>
            <button
              data-billing-active={billing === "yearly" ? "yearly" : undefined}
              onClick={() => setBilling("yearly")}
              className={`h-11 rounded-full px-9 text-sm font-bold transition ${
                billing === "yearly" ? "bg-white text-[#21133f] shadow-sm" : "text-[#8b8198]"
              }`}
            >
              Yearly
            </button>
          </div>

          <p className="mt-3 text-xs font-bold text-[#8b7ca6]">
            {billing === "monthly"
              ? "Monthly plans are flexible and can be upgraded anytime."
              : "Yearly plans include higher credits and better value."}
          </p>
        </section>

        <section className="mt-5 grid gap-4 lg:grid-cols-[220px_1fr_1fr_1fr]">
          <aside className="rounded-[20px] border border-dashed border-[#38bdf8] bg-[#f8fcff] p-4">
            <div className="-mt-6 mb-3 w-fit rounded-full bg-[#d9f2ff] px-3 py-1 text-[11px] font-black text-[#0284c7]">
              CREDITS
            </div>
            <p className="text-[24px] font-black tracking-[-0.06em] text-[#21133f]">Need only credits?</p>
            <p className="mt-2 text-sm leading-6 text-[#756985]">
              One-time pay-as-you-go packs are available separately.
            </p>
            <a
              href="/credits"
              className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#0284c7] text-sm font-black text-white"
            >
              <Wallet size={17} />
              Buy Credits
            </a>
            <p className="mt-4 text-xs text-[#8b7ca6]">Use credits for renders, BOQ, BBS, PDFs and AI tools.</p>
          </aside>

          {plans.map((plan) => (
            <article
              key={plan.planId}
              className={`relative flex min-h-[460px] flex-col rounded-[20px] border bg-white p-4 shadow-[0_10px_26px_rgba(65,29,120,0.06)] ${
                plan.popular ? "border-[#10b981] shadow-[0_0_0_2px_rgba(16,185,129,0.12)]" : "border-[#e6ddf4]"
              }`}
            >
              <div className="-mt-7 mb-3 flex items-center gap-2">
                <span
                  className={`rounded-full px-3 py-1 text-[11px] font-black ${
                    plan.accent === "orange"
                      ? "bg-[#fff0df] text-[#ea580c]"
                      : plan.accent === "green"
                        ? "bg-[#dfffee] text-[#059669]"
                        : "bg-[#f1e4ff] text-[#7c3aed]"
                  }`}
                >
                  {plan.badge}
                </span>
                {plan.popular ? (
                  <span className="rounded-full bg-[#10b981] px-3 py-1 text-[10px] font-black text-white">
                    MOST POPULAR
                  </span>
                ) : null}
              </div>

              <h3 className="text-[26px] font-black tracking-[-0.07em] text-[#21133f]">
                {money(plan.price)}
                <span className="ml-1 text-xs font-bold tracking-normal text-[#8b7ca6]">
                  /{billing === "monthly" ? "month" : "year"}
                </span>
              </h3>
              <p className="mt-1 text-xs font-bold text-[#8b7ca6]">billed {billing}</p>
              <p className="mt-3 min-h-[42px] text-sm leading-6 text-[#6f647e]">{plan.subtitle}</p>

              <button
                data-plan-id={plan.planId}
                className={`mt-4 h-11 rounded-xl text-sm font-black text-white shadow-sm ${plan.buttonClass}`}
              >
                Subscribe
              </button>

              <div className="mt-4 flex items-center gap-2 text-sm font-black text-[#21133f]">
                <Zap size={15} className={plan.accent === "orange" ? "text-[#f97316]" : plan.accent === "green" ? "text-[#10b981]" : "text-[#7c3aed]"} />
                {plan.credits.toLocaleString("en-IN")} credits included
              </div>

              <div className="mt-4 space-y-2.5">
                {plan.features.map((feature) => (
                  <div key={feature} className="flex items-center justify-between gap-2 text-[12px] text-[#5f5476]">
                    <span className="flex items-center gap-2">
                      <Shield size={13} className={plan.accent === "orange" ? "text-[#f97316]" : plan.accent === "green" ? "text-[#10b981]" : "text-[#7c3aed]"} />
                      {feature}
                    </span>
                    <HelpCircle size={13} className="text-[#c8bfd6]" />
                  </div>
                ))}
              </div>

              <p className="mt-auto pt-5 text-center text-xs text-[#aaa0b8]">
                {plan.key === "max" ? "500+ upgraded this week" : "Secure Razorpay checkout"}
              </p>
            </article>
          ))}
        </section>

        <section className="mt-8 rounded-[26px] border border-[#e8def7] bg-[linear-gradient(135deg,#ffffff_0%,#fbf8ff_55%,#f3e9ff_100%)] p-5 shadow-[0_16px_42px_rgba(65,29,120,0.06)]">
          <div className="grid gap-5 lg:grid-cols-[0.9fr_1.4fr] lg:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-[11px] font-black uppercase tracking-wide text-[#7c3aed] ring-1 ring-[#eadcff]">
                <Lock size={13} />
                Secure checkout
              </div>
              <h3 className="mt-3 text-[26px] font-black leading-tight tracking-[-0.06em] text-[#21133f]">
                Guaranteed safe & secure payment
              </h3>
              <p className="mt-2 text-sm leading-6 text-[#786a91]">
                Razorpay powered checkout with UPI, QR, cards, netbanking, wallets and RuPay support.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              {[
                { label: "UPI QR", sub: "Scan & pay", icon: QrCode },
                { label: "UPI", sub: "PhonePe, GPay", icon: Smartphone },
                { label: "Cards", sub: "Visa, MC, Amex", icon: CreditCard },
                { label: "Netbanking", sub: "Major banks", icon: Landmark },
                { label: "Wallets", sub: "Paytm & more", icon: Wallet },
                { label: "RuPay", sub: "Debit cards", icon: ReceiptText },
              ].map((method) => {
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

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-[#eadff5] bg-white px-4 py-4 text-center">
              <Star className="mx-auto h-7 w-7 text-[#7c3aed]" />
              <h4 className="mt-2 text-lg font-black text-[#21133f]">150,000+</h4>
              <p className="mt-1 text-sm text-[#786a91]">students & users</p>
            </div>
            <div className="rounded-2xl border border-[#eadff5] bg-white px-4 py-4 text-center">
              <BadgeCheck className="mx-auto h-7 w-7 text-[#10b981]" />
              <h4 className="mt-2 text-lg font-black text-[#21133f]">No-Risk Trial</h4>
              <p className="mt-1 text-sm text-[#786a91]">Cancel anytime, instantly</p>
            </div>
            <div className="rounded-2xl border border-[#eadff5] bg-white px-4 py-4 text-center">
              <ReceiptText className="mx-auto h-7 w-7 text-[#7c3aed]" />
              <h4 className="mt-2 text-lg font-black text-[#21133f]">GST Invoice</h4>
              <p className="mt-1 text-sm text-[#786a91]">Invoice workflow ready</p>
            </div>
          </div>
        </section>

        <section className="mt-8">
          <h3 className="text-center text-[22px] font-black tracking-[-0.04em] text-[#21133f]">
            Credit usage examples
          </h3>
          <p className="mt-2 text-center text-sm text-[#786a91]">
            Credits are deducted only when a tool generates output.
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-5">
            {usage.map(([name, cost]) => (
              <div key={name} className="rounded-2xl border border-[#e9e1f5] bg-[#fbf8ff] p-4 text-center">
                <p className="text-sm font-black text-[#21133f]">{name}</p>
                <p className="mt-1 text-xs font-bold text-[#7c3aed]">{cost}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-8 rounded-[24px] border border-[#e8def7] bg-[#fbf8ff] p-5">
          <h3 className="text-center text-[22px] font-black tracking-[-0.04em] text-[#21133f]">
            Frequently asked questions
          </h3>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {faqs.map(([q, a]) => (
              <div key={q} className="rounded-2xl border border-[#e8def7] bg-white p-4">
                <p className="text-sm font-black text-[#21133f]">{q}</p>
                <p className="mt-2 text-sm leading-6 text-[#786a91]">{a}</p>
              </div>
            ))}
          </div>
        </section>

        <footer className="py-8 text-center">
          <span className="text-sm font-bold text-[#7d728f]">Academic? Student? Creator?</span>
          <a
            href="/"
            className="ml-3 inline-flex rounded-full bg-[#f1dfff] px-5 py-3 text-sm font-black text-[#7c3aed]"
          >
            Contact us for special deal →
          </a>
        </footer>
      </section>
    </main>
  );
}
