"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  BadgeCheck,
  Check,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  Gift,
  Lock,
  Shield,
  Sparkles,
  Star,
  Zap,
} from "lucide-react";

type Billing = "monthly" | "yearly";

type Plan = {
  id: string;
  label: string;
  name: string;
  monthlyPrice: number;
  yearlyPrice: number;
  monthlyCredits: number;
  yearlyCredits: number;
  accent: "orange" | "green" | "purple";
  badge?: string;
  popular?: boolean;
  helper: string;
  features: string[];
};

const plans: Plan[] = [
  {
    id: "starter",
    label: "PRO",
    name: "Starter",
    monthlyPrice: 999,
    yearlyPrice: 9990,
    monthlyCredits: 200,
    yearlyCredits: 3000,
    accent: "orange",
    helper: "15,000+ creators started here",
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
    id: "pro",
    label: "MAX",
    name: "Pro",
    monthlyPrice: 2499,
    yearlyPrice: 24990,
    monthlyCredits: 500,
    yearlyCredits: 7500,
    accent: "green",
    badge: "MOST POPULAR",
    popular: true,
    helper: "500+ upgraded this week",
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
    id: "agency",
    label: "ULTRA",
    name: "Agency",
    monthlyPrice: 6999,
    yearlyPrice: 69990,
    monthlyCredits: 1500,
    yearlyCredits: 24000,
    accent: "purple",
    helper: "Trusted by agencies and contractors",
    features: [
      "1500 Interior & Exterior designs",
      "1500 Magic Brief generations",
      "1500 Naksha + Structure outputs",
      "750 BOQ + BBS drafts",
      "400 Full Project PDFs",
      "Contractor package workflow",
      "Team-ready documentation",
      "API Access & white-label ready",
    ],
  },
];

const accent = {
  orange: {
    chip: "bg-orange-100 text-orange-700",
    button: "from-orange-500 to-orange-600",
    icon: "text-orange-500",
    border: "border-orange-200",
  },
  green: {
    chip: "bg-emerald-100 text-emerald-700",
    button: "from-emerald-500 to-teal-600",
    icon: "text-emerald-500",
    border: "border-emerald-400 shadow-[0_0_0_3px_rgba(16,185,129,0.16)]",
  },
  purple: {
    chip: "bg-purple-100 text-purple-700",
    button: "from-violet-500 to-purple-600",
    icon: "text-violet-500",
    border: "border-purple-200",
  },
};

function money(value: number) {
  return "₹" + value.toLocaleString("en-IN");
}

function FeatureRow({ text, tone }: { text: string; tone: Plan["accent"] }) {
  return (
    <div className="flex items-center gap-2.5 text-[12px] leading-5 text-[#3c3152]">
      <Shield className={`h-4 w-4 shrink-0 ${accent[tone].icon}`} />
      <span>{text}</span>
      <span className="ml-auto flex h-4 w-4 items-center justify-center rounded-full border border-[#d9d2e6] text-[10px] text-[#8a819b]">
        i
      </span>
    </div>
  );
}

function PlanCard({ plan, billing }: { plan: Plan; billing: Billing }) {
  const yearly = billing === "yearly";
  const price = yearly ? plan.yearlyPrice : plan.monthlyPrice;
  const credits = yearly ? plan.yearlyCredits : plan.monthlyCredits;
  const tone = accent[plan.accent];

  return (
    <article
      className={`relative rounded-2xl border bg-white p-4 ${
        plan.popular ? tone.border : "border-[#d9d2e6] shadow-sm"
      }`}
    >
      <div className="absolute -top-3 left-5 flex items-center gap-2">
        <span className={`rounded-full px-3 py-1 text-[11px] font-black ${tone.chip}`}>
          {plan.label}
        </span>
        {plan.badge ? (
          <span className="rounded-full bg-emerald-500 px-3 py-1 text-[10px] font-black text-white">
            {plan.badge}
          </span>
        ) : null}
      </div>

      <div className="pt-4">
        <div className="flex items-end gap-1">
          <span className="text-[28px] font-black tracking-[-0.05em] text-[#181321]">
            {money(price)}
          </span>
          <span className="pb-2 text-xs font-semibold text-[#8c839c]">
            /{yearly ? "year" : "month"}
          </span>
        </div>

        <p className="mt-1 text-xs text-[#8c839c]">
          billed {yearly ? "yearly" : "monthly"}
        </p>

        <button
          onClick={() => {
            alert(`${plan.name} ${billing} selected. Payment gateway integration next step hai.`);
          }}
          className={`mt-4 flex h-10 w-full items-center justify-center rounded-lg bg-gradient-to-r ${tone.button} text-xs font-black text-white shadow-md`}
        >
          Subscribe
        </button>

        <div className="mt-4 flex items-center gap-2 text-[12px] font-black text-[#2f2642]">
          <Zap className={`h-4 w-4 ${tone.icon}`} />
          {credits.toLocaleString("en-IN")} credits included
        </div>

        <div className="mt-4 space-y-2.5">
          {plan.features.map((feature) => (
            <FeatureRow key={feature} text={feature} tone={plan.accent} />
          ))}
        </div>

        <p className="mt-5 text-center text-[11px] leading-5 text-[#9b92aa]">
          {plan.helper}
        </p>
      </div>
    </article>
  );
}

function TrustItem({
  icon,
  title,
  desc,
}: {
  icon: ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="rounded-2xl border border-[#ddd7e8] bg-white p-5 text-center shadow-sm">
      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-purple-100 text-[#7c3aed]">
        {icon}
      </div>
      <p className="mt-3 text-base font-black text-[#1f182d]">{title}</p>
      <p className="mt-1 text-sm text-[#7c718d]">{desc}</p>
    </div>
  );
}

function Testimonial({
  avatar,
  name,
  role,
  text,
}: {
  avatar: string;
  name: string;
  role: string;
  text: string;
}) {
  return (
    <div className="rounded-2xl border border-[#e2ddeb] bg-white p-4 shadow-sm">
      <div className="flex gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f4ebff] text-base">
          {avatar}
        </div>
        <div>
          <p className="text-[13px] leading-6 text-[#514662]">{text}</p>
          <p className="mt-3 text-sm font-black text-[#1d1728]">{name}</p>
          <p className="text-xs text-[#7c718d]">{role}</p>
        </div>
      </div>
    </div>
  );
}

export default function PricingPage() {
  const [billing, setBilling] = useState<Billing>("monthly");

  const billingCopy = useMemo(() => {
    return billing === "yearly"
      ? "Yearly plans include extra credits and better effective monthly pricing."
      : "Monthly plans are flexible and can be upgraded anytime.";
  }, [billing]);

  return (
    <main className="min-h-screen bg-white text-[#1b1624]">
      <section className="mx-auto max-w-[1180px] px-5 py-5">
        <div className="mb-4 flex items-center justify-between">
          <a
            href="/"
            className="inline-flex items-center gap-2 text-sm font-black text-[#6b607a] hover:text-[#7c3aed]"
          >
            <ArrowLeft size={17} />
            Back
          </a>

          <a
            href="/workspace"
            className="inline-flex h-11 items-center justify-center rounded-2xl border border-[#e1d9ec] bg-white px-5 text-sm font-black text-[#281d39] shadow-sm hover:bg-[#fbf8ff]"
          >
            Workspace
          </a>
        </div>

        <section className="mb-6 overflow-hidden rounded-[22px] border border-[#e4dcf1] bg-gradient-to-br from-white via-white to-[#f4edff] p-4 shadow-sm">
          <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-purple-100 px-3 py-1 text-[11px] font-black text-[#7c3aed]">
                <Sparkles size={14} />
                Account billing
              </div>
              <h1 className="text-[32px] font-black leading-none tracking-[-0.06em] text-[#29242f] md:text-[42px]">
                Upgrade your plan
              </h1>
              <p className="mt-3 max-w-xl text-[13px] leading-6 text-[#6b607a]">
                Generate interiors, naksha, structure drafts, BOQ, BBS, client PDFs
                and project documents with BuildSetu AI.
              </p>
            </div>

            <div className="rounded-2xl border border-[#dacff0] bg-white/80 p-3 shadow-sm backdrop-blur">
              <div className="flex items-center gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#7c3aed] to-[#b936f5] text-white">
                  <CreditCard size={26} />
                </div>
                <div>
                  <p className="text-base font-black text-[#211a2d]">Pro Plan</p>
                  <p className="text-xs text-[#7c718d]">Renews on 20 Jun 2026</p>
                </div>
              </div>
              <a
                href="#plans"
                className="mt-3 flex h-11 items-center justify-center rounded-xl bg-gradient-to-r from-[#6246ea] to-[#b936f5] text-sm font-black text-white shadow-md shadow-purple-200"
              >
                Upgrade Plan
              </a>
            </div>
          </div>
        </section>

        <div className="mb-5 text-center">
          <h2 className="text-[30px] font-black leading-none tracking-[-0.06em] text-[#2c2830] md:text-[40px]">
            Scale your business
          </h2>
          <p className="mt-2 text-[13px] text-[#6f6578]">
            Trusted by designers, architects, contractors and agencies.
          </p>

          <div className="mx-auto mt-4 inline-grid grid-cols-2 rounded-full bg-[#eeeef3] p-1">
            <button
              onClick={() => setBilling("monthly")}
              className={`rounded-full px-8 py-3 text-sm font-black ${
                billing === "monthly" ? "bg-white text-[#211a2d] shadow-sm" : "text-[#7c718d]"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBilling("yearly")}
              className={`rounded-full px-8 py-3 text-sm font-black ${
                billing === "yearly" ? "bg-white text-[#211a2d] shadow-sm" : "text-[#7c718d]"
              }`}
            >
              Yearly
            </button>
          </div>

          <p className="mt-3 text-xs font-semibold text-[#8c839c]">{billingCopy}</p>
        </div>

        <section id="plans" className="grid gap-4 xl:grid-cols-[250px_1fr_1fr_1fr]">
          <article className="rounded-2xl border-2 border-dashed border-sky-300 bg-[#f8fcff] p-4">
            <div className="-mt-9 mb-4">
              <span className="rounded-full bg-sky-100 px-3 py-1 text-[11px] font-black text-sky-600">
                TOKEN
              </span>
            </div>

            <div className="flex items-end gap-1">
              <span className="text-[28px] font-black tracking-[-0.05em] text-[#181321]">
                ₹299
              </span>
              <span className="pb-2 text-xs font-semibold text-[#8c839c]">/30 tokens</span>
            </div>

            <p className="mt-1 text-xs text-[#8c839c]">one-time pack</p>

            <div className="mt-4 flex items-center gap-3">
              <input type="range" min="30" max="5000" defaultValue="250" className="w-full accent-sky-500" />
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-500 text-white">
                <Check size={18} />
              </div>
            </div>

            <p className="mt-4 text-sm font-black text-sky-600">Pay-as-you-go pack</p>

            <div className="mt-4 space-y-2.5">
              {[
                "30 Interior & Exterior designs",
                "30 Magic Brief designs",
                "30 Enhancer designs",
                "9K Words ArchitectGPT",
                "30 Change Background",
                "15 Floor Plan AI designs",
                "10 Full Project PDFs",
                "API Access",
              ].map((item) => (
                <FeatureRow key={item} text={item} tone="purple" />
              ))}
            </div>

            <p className="mt-6 text-center text-[11px] text-[#9b92aa]">
              Pay-as-you-go with prepaid credits
            </p>
          </article>

          {plans.map((plan) => (
            <PlanCard key={plan.id} plan={plan} billing={billing} />
          ))}
        </section>

        <section className="my-6 flex flex-wrap items-center justify-center gap-6 text-xs font-semibold text-[#3f354c]">
          <div className="flex items-center gap-2">
            <Star className="h-5 w-5 text-amber-400" />
            4.9/5 from 1,000+ reviews
          </div>
          <div className="flex items-center gap-2">
            <BadgeCheck className="h-5 w-5 text-emerald-500" />
            Secure payments
          </div>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-emerald-500" />
            Risk Free - Cancel Anytime
          </div>
        </section>

        <section className="py-6 text-center">
          <h3 className="text-xl font-black tracking-[-0.04em] text-transparent bg-gradient-to-r from-[#8b5cf6] to-[#ec4899] bg-clip-text">
            Trusted by the World's Leading Companies
          </h3>

          <div className="mx-auto mt-6 grid max-w-4xl grid-cols-2 gap-6 opacity-55 md:grid-cols-6">
            {["AIRBUS", "AT&T", "AMAZON", "COMPASS", "DHL", "CENTURY 21"].map((brand) => (
              <div key={brand} className="text-xl font-black tracking-[-0.05em] text-[#2c2830]">
                {brand}
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto my-6 max-w-lg rounded-2xl border border-[#ddd7e8] bg-white p-4 text-center shadow-sm">
          <div className="flex items-center justify-center gap-3 text-sm font-black text-[#2d2439]">
            <Lock className="h-5 w-5" />
            Guaranteed safe & secure checkout
          </div>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            {["VISA", "MC", "AMEX", "UPI", "NETBANKING", "RUPAY"].map((item) => (
              <span key={item} className="rounded-md border border-[#ddd7e8] bg-[#f8f7fb] px-3 py-2 text-xs font-black text-[#455064]">
                {item}
              </span>
            ))}
          </div>
        </section>

        <section className="my-8 grid gap-4 lg:grid-cols-2">
          <Testimonial
            avatar="👩"
            name="Sarah Gabriel"
            role="Interior Designer"
            text="Generated 50+ room designs in one week using BuildSetu AI. The render quality and proposal workflow helped us present faster to clients."
          />
          <Testimonial
            avatar="L"
            name="L'Exclusive"
            role="Hotels & Accommodation"
            text="We transformed premium suites and reduced renovation planning time using AI optimized design and documentation workflow."
          />
          <Testimonial
            avatar="👩‍🦱"
            name="Oya Sanyeli"
            role="Interior Designer"
            text="Transforming spaces now takes seconds. Concepts with photorealistic quality impress clients and speed up daily workflow."
          />
          <Testimonial
            avatar="👨"
            name="John Douglas"
            role="Architect"
            text="BuildSetu AI has streamlined our early-stage client presentations, naksha drafts and project documentation."
          />
        </section>

        <section className="my-8 grid gap-4 md:grid-cols-3">
          <TrustItem icon={<Star size={28} />} title="4.9/5 Rating" desc="1,000+ verified reviews" />
          <TrustItem icon={<CheckCircle2 size={28} />} title="No-Risk Trial" desc="Cancel anytime, instantly" />
          <TrustItem icon={<Shield size={28} />} title="Secure & Easy" desc="Secure payments and invoices" />
        </section>

        <div className="pb-7 text-center">
          <span className="text-sm text-[#6f6578]">Academic? Student? Creator?</span>
          <a
            href="/workspace"
            className="ml-3 inline-flex items-center gap-2 rounded-full bg-purple-100 px-5 py-3 text-sm font-black text-[#8b31d9]"
          >
            Contact us for special deal
            <ArrowUpRight size={16} />
          </a>
        </div>
      </section>

      <a
        href="/workspace"
        className="fixed bottom-7 right-7 flex h-14 w-14 items-center justify-center rounded-full bg-[#a855f7] text-white shadow-xl"
      >
        <ChevronRight size={24} />
      </a>
    </main>
  );
}
