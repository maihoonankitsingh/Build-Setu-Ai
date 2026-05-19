"use client";

import { useMemo, useState } from "react";
import {
  ArrowLeft,
  BadgeCheck,
  Building2,
  CheckCircle2,
  Crown,
  FileText,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";

type Billing = "monthly" | "yearly";

type Plan = {
  id: string;
  name: string;
  subtitle: string;
  icon: React.ReactNode;
  monthlyPrice: number;
  yearlyPrice: number;
  monthlyCredits: number;
  yearlyCredits: number;
  badge?: string;
  highlight?: boolean;
  cta: string;
  features: string[];
  bestFor: string;
};

const plans: Plan[] = [
  {
    id: "starter",
    name: "Starter",
    subtitle: "Small designers aur individual users ke liye.",
    icon: <Sparkles size={24} />,
    monthlyPrice: 999,
    yearlyPrice: 9990,
    monthlyCredits: 120,
    yearlyCredits: 1800,
    cta: "Start Starter",
    bestFor: "Single designer / freelancer",
    features: [
      "Magic Brief generator",
      "Floor Plan AI draft",
      "Interior render prompts",
      "Basic BOQ draft",
      "Client PDF export",
      "Up to 120 credits / month",
      "AI draft review notes",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    subtitle: "Active architects, interior designers aur contractors ke liye.",
    icon: <Crown size={24} />,
    monthlyPrice: 2499,
    yearlyPrice: 24990,
    monthlyCredits: 400,
    yearlyCredits: 6000,
    badge: "Most Popular",
    highlight: true,
    cta: "Upgrade to Pro",
    bestFor: "Studio / professional workflow",
    features: [
      "Everything in Starter",
      "Naksha Studio direct output",
      "Structure Studio preliminary review",
      "BOQ + BBS draft workflow",
      "Client Agreement generator",
      "Full Project PDF export",
      "Up to 400 credits / month",
      "Priority workflow tools",
      "Workspace dashboard",
    ],
  },
  {
    id: "agency",
    name: "Agency",
    subtitle: "Teams, agencies aur multi-client workflow ke liye.",
    icon: <Building2 size={24} />,
    monthlyPrice: 6999,
    yearlyPrice: 69990,
    monthlyCredits: 1500,
    yearlyCredits: 24000,
    badge: "Scale Plan",
    cta: "Choose Agency",
    bestFor: "Agency / team / contractor company",
    features: [
      "Everything in Pro",
      "Multi-project workflow",
      "Large render usage",
      "Advanced contractor package",
      "Team-ready client documentation",
      "Up to 1500 credits / month",
      "Higher PDF/report usage",
      "Priority support",
      "Custom workflow setup",
    ],
  },
];

function money(value: number) {
  return "₹" + value.toLocaleString("en-IN");
}

export default function PricingPage() {
  const [billing, setBilling] = useState<Billing>("monthly");

  const yearlySelected = billing === "yearly";

  const billingLabel = useMemo(() => {
    return yearlySelected ? "Yearly billing selected — approx 2 months free." : "Monthly billing selected.";
  }, [yearlySelected]);

  return (
    <main className="min-h-screen bg-[#f7f3ff] text-[#170b2b]">
      <section className="mx-auto max-w-7xl px-5 py-7">
        <div className="mb-6 overflow-hidden rounded-[2rem] border border-[#ded0f4] bg-[#170b2b] shadow-xl">
          <div className="relative p-6 sm:p-8">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(168,85,247,0.55),transparent_32%),radial-gradient(circle_at_85%_20%,rgba(37,99,235,0.35),transparent_30%)]" />

            <div className="relative z-10">
              <a
                href="/"
                className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-white/75 hover:text-white"
              >
                <ArrowLeft size={16} />
                Back to dashboard
              </a>

              <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-bold text-white">
                    <Zap size={14} />
                    BuildSetu AI Pricing
                  </div>

                  <h1 className="max-w-4xl text-4xl font-black tracking-[-0.055em] text-white sm:text-5xl">
                    Choose the right plan for your design, naksha and project workflow.
                  </h1>

                  <p className="mt-4 max-w-3xl text-sm leading-6 text-purple-100/85">
                    Plans include AI tools for Magic Brief, Naksha Studio, Structure Studio,
                    BOQ, BBS, render workflow, client agreement and full project PDF export.
                  </p>
                </div>

                <div className="rounded-3xl border border-white/15 bg-white/10 p-2 backdrop-blur">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setBilling("monthly")}
                      className={`rounded-2xl px-5 py-3 text-sm font-black transition ${
                        billing === "monthly"
                          ? "bg-white text-[#21133f]"
                          : "text-white/75 hover:bg-white/10"
                      }`}
                    >
                      Monthly
                    </button>

                    <button
                      onClick={() => setBilling("yearly")}
                      className={`rounded-2xl px-5 py-3 text-sm font-black transition ${
                        billing === "yearly"
                          ? "bg-white text-[#21133f]"
                          : "text-white/75 hover:bg-white/10"
                      }`}
                    >
                      Yearly
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-5 inline-flex rounded-full border border-emerald-300/25 bg-emerald-300/10 px-4 py-2 text-xs font-bold text-emerald-100">
                {billingLabel}
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          {plans.map((plan) => {
            const price = yearlySelected ? plan.yearlyPrice : plan.monthlyPrice;
            const credits = yearlySelected ? plan.yearlyCredits : plan.monthlyCredits;

            return (
              <article
                key={plan.id}
                className={`relative overflow-hidden rounded-[2rem] border bg-white p-5 shadow-[0_18px_50px_rgba(47,20,90,0.10)] ${
                  plan.highlight
                    ? "border-[#7c3aed] ring-4 ring-purple-100"
                    : "border-[#ded0f4]"
                }`}
              >
                {plan.badge ? (
                  <div className="absolute right-5 top-5 rounded-full bg-gradient-to-r from-[#7c3aed] to-[#2563eb] px-3 py-1 text-xs font-black text-white">
                    {plan.badge}
                  </div>
                ) : null}

                <div
                  className={`mb-5 flex h-14 w-14 items-center justify-center rounded-2xl text-white shadow-lg ${
                    plan.highlight
                      ? "bg-gradient-to-br from-[#7c3aed] to-[#2563eb]"
                      : "bg-[#21133f]"
                  }`}
                >
                  {plan.icon}
                </div>

                <h2 className="text-2xl font-black tracking-[-0.045em] text-[#21133f]">
                  {plan.name}
                </h2>

                <p className="mt-2 min-h-12 text-sm leading-6 text-[#6d5b86]">
                  {plan.subtitle}
                </p>

                <div className="mt-5 rounded-3xl bg-[#fbf8ff] p-4">
                  <div className="flex items-end gap-2">
                    <p className="text-4xl font-black tracking-[-0.06em] text-[#21133f]">
                      {money(price)}
                    </p>
                    <p className="pb-1 text-sm font-bold text-[#817397]">
                      / {yearlySelected ? "year" : "month"}
                    </p>
                  </div>

                  {yearlySelected ? (
                    <p className="mt-2 text-xs font-bold text-emerald-700">
                      Effective monthly: {money(Math.round(price / 12))}
                    </p>
                  ) : (
                    <p className="mt-2 text-xs font-bold text-[#817397]">
                      Cancel or upgrade anytime.
                    </p>
                  )}
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-[#ded0f4] bg-white p-3">
                    <p className="text-xs font-bold text-[#817397]">Credits</p>
                    <p className="mt-1 text-lg font-black text-[#21133f]">
                      {credits.toLocaleString("en-IN")}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-[#ded0f4] bg-white p-3">
                    <p className="text-xs font-bold text-[#817397]">Best For</p>
                    <p className="mt-1 text-sm font-black text-[#21133f]">
                      {plan.bestFor}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    alert(`${plan.name} ${billing} plan selected. Payment integration next step hai.`);
                  }}
                  className={`mt-5 inline-flex min-h-13 w-full items-center justify-center gap-2 rounded-2xl px-5 text-sm font-black shadow-lg transition ${
                    plan.highlight
                      ? "bg-gradient-to-r from-[#7c3aed] to-[#2563eb] text-white shadow-purple-500/20 hover:brightness-105"
                      : "bg-[#21133f] text-white hover:bg-[#2b174e]"
                  }`}
                >
                  {plan.cta}
                  <Sparkles size={17} />
                </button>

                <div className="mt-5 space-y-3">
                  {plan.features.map((feature) => (
                    <div key={feature} className="flex gap-3 text-sm leading-6 text-[#3f315d]">
                      <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-[#7c3aed]" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              </article>
            );
          })}
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-3">
          <div className="rounded-[2rem] border border-[#ded0f4] bg-white p-5 shadow-sm">
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-purple-50 text-[#7c3aed]">
              <FileText size={21} />
            </div>
            <h3 className="text-lg font-black text-[#21133f]">Credits usage</h3>
            <p className="mt-2 text-sm leading-6 text-[#6d5b86]">
              Credits are used for renders, PDF generation, BOQ/BBS workflows, agreements,
              and AI tool executions.
            </p>
          </div>

          <div className="rounded-[2rem] border border-[#ded0f4] bg-white p-5 shadow-sm">
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-purple-50 text-[#7c3aed]">
              <BadgeCheck size={21} />
            </div>
            <h3 className="text-lg font-black text-[#21133f]">Professional review</h3>
            <p className="mt-2 text-sm leading-6 text-[#6d5b86]">
              Naksha, Structure, BOQ, BBS and legal outputs are AI drafts and must be
              reviewed by qualified professionals before execution.
            </p>
          </div>

          <div className="rounded-[2rem] border border-[#ded0f4] bg-white p-5 shadow-sm">
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-purple-50 text-[#7c3aed]">
              <Users size={21} />
            </div>
            <h3 className="text-lg font-black text-[#21133f]">Team setup</h3>
            <p className="mt-2 text-sm leading-6 text-[#6d5b86]">
              Agency plan can be extended later with team members, client access,
              custom branding and higher usage limits.
            </p>
          </div>
        </div>

        <div className="mt-6 rounded-[2rem] border border-[#ded0f4] bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h3 className="text-xl font-black tracking-[-0.04em] text-[#21133f]">
                Need a custom construction workflow?
              </h3>
              <p className="mt-2 text-sm leading-6 text-[#6d5b86]">
                Contractor package, agency workflow, team usage, white-label client PDF and
                custom credit limits can be added as custom plan.
              </p>
            </div>

            <a
              href="/workspace"
              className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-[#21133f] px-5 text-sm font-black text-white hover:bg-[#2b174e]"
            >
              Go to Workspace
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
