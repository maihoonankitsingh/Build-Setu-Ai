"use client";

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
    <div className="flex h-full min-h-[170px] flex-col rounded-[22px] border border-[#e6ddf4] bg-white p-5 shadow-[0_10px_28px_rgba(70,35,130,0.05)]">
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#f2e8ff] to-[#eadbff] text-[#7c3aed]">
        {icon}
      </div>
      <h3 className="text-[17px] font-black tracking-[-0.03em] text-[#21133f]">
        {title}
      </h3>
      <p className="mt-2 text-[13px] leading-6 text-[#766987]">
        {desc}
      </p>
    </div>
  );
}

function PackCard({ pack }: { pack: Pack }) {
  return (
    <article
      className={`relative flex h-full min-h-[520px] flex-col overflow-hidden rounded-[24px] border bg-white shadow-[0_16px_42px_rgba(65,29,120,0.06)] ${
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
        <div className="mt-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-[18px] font-black tracking-[-0.04em] text-[#201537]">
              {pack.name}
            </h2>
            <p className="mt-2 text-[13px] leading-6 text-[#786a91]">
              {pack.desc}
            </p>
          </div>

          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#f1e8ff] to-[#eadbff] text-[#7c3aed]">
            <Zap size={20} />
          </div>
        </div>

        <div className="mt-5 rounded-[20px] border border-[#f0e9fb] bg-[#fcfbff] p-4">
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
          onClick={() => {
            alert(`${pack.name} selected. Next step: payment gateway integration.`);
          }}
          className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#5b43ea] via-[#7c3aed] to-[#d946ef] text-sm font-black text-white shadow-[0_12px_28px_rgba(124,58,237,0.24)] transition hover:brightness-105"
        >
          <Plus size={18} />
          Buy Credits
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
  const availableCredits = 120;

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

        {/* TOP SECTION - COMPACT */}
        <section className="rounded-[28px] border border-[#e7def5] bg-white p-5 shadow-[0_18px_50px_rgba(65,29,120,0.05)]">
          <div className="grid gap-5 lg:grid-cols-[1.6fr_320px]">
            <div className="flex min-h-[220px] flex-col rounded-[24px] border border-[#ece4f8] bg-[linear-gradient(135deg,#ffffff_0%,#fcfaff_48%,#f3e8ff_100%)] p-5">
              <div className="mb-3 inline-flex w-fit items-center gap-2 rounded-full border border-[#eadcff] bg-[#f7efff] px-3 py-1 text-[11px] font-black uppercase tracking-wide text-[#7c3aed]">
                <Sparkles size={13} />
                BuildSetu Credits
              </div>

              <h1 className="text-[30px] font-black leading-none tracking-[-0.06em] text-[#21133f] md:text-[42px]">
                Buy more credits
              </h1>

              <p className="mt-3 max-w-3xl text-[14px] leading-7 text-[#6c5f84]">
                Credits khatam hone par yahin se extra credits purchase kar sakte ho.
                Credits render, AI tools, reports, BOQ/BBS, agreements aur PDF exports me use honge.
              </p>

              <div className="mt-auto pt-5">
                <div className="flex flex-wrap gap-3">
                  <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-black text-[#5f5476] shadow-sm ring-1 ring-[#eee6f8]">
                    <BadgeCheck size={14} className="text-emerald-500" />
                    Instant top-up ready
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-black text-[#5f5476] shadow-sm ring-1 ring-[#eee6f8]">
                    <Shield size={14} className="text-[#7c3aed]" />
                    Usage-based deduction
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-black text-[#5f5476] shadow-sm ring-1 ring-[#eee6f8]">
                    <Lock size={14} className="text-amber-500" />
                    Secure checkout ready
                  </span>
                </div>
              </div>
            </div>

            <div className="flex min-h-[220px] flex-col rounded-[24px] border border-[#eadfff] bg-[linear-gradient(180deg,#fbf7ff_0%,#efe5ff_100%)] p-5 shadow-inner">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#8f7fa7]">
                    Available Credits
                  </p>
                  <p className="mt-2 text-[54px] font-black leading-none tracking-[-0.08em] text-[#1f1433]">
                    {availableCredits}
                  </p>
                </div>

                <div className="flex h-14 w-14 items-center justify-center rounded-[20px] bg-gradient-to-br from-[#7c3aed] to-[#d946ef] text-white shadow-[0_16px_34px_rgba(124,58,237,0.25)]">
                  <Wallet size={25} />
                </div>
              </div>

              <div className="mt-4 rounded-[20px] border border-white/70 bg-white/75 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-[#756888]">Recommended Pack</span>
                  <span className="rounded-full bg-[#efe8ff] px-3 py-1 text-[10px] font-black text-[#7c3aed]">
                    PRO
                  </span>
                </div>
                <p className="mt-2 text-[22px] font-black tracking-[-0.05em] text-[#21133f]">
                  400 Credits
                </p>
                <p className="mt-1 text-sm text-[#786a91]">Best for active workflows</p>
              </div>

              <a
                href="#credit-packs"
                className="mt-auto flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#21133f] text-sm font-black text-white shadow-[0_12px_26px_rgba(33,19,63,0.18)]"
              >
                <Plus size={18} />
                Buy More Credits
              </a>
            </div>
          </div>
        </section>

        {/* 3 SAME INFO CARDS */}
        <section className="mt-5 grid gap-4 md:grid-cols-3">
          <InfoCard
            icon={<BadgeCheck size={20} />}
            title="Instant top-up"
            desc="Payment success ke baad credits account me instantly add honge."
          />
          <InfoCard
            icon={<Shield size={20} />}
            title="Usage control"
            desc="Har AI run ke according credits deduct honge. Easy and transparent system."
          />
          <InfoCard
            icon={<CreditCard size={20} />}
            title="Future-ready billing"
            desc="Payment gateway integration ke liye layout aur credit flow ready hai."
          />
        </section>

        {/* EQUAL PRICING CARDS */}
        <section id="credit-packs" className="mt-5 grid gap-4 lg:grid-cols-3">
          {packs.map((pack) => (
            <PackCard key={pack.id} pack={pack} />
          ))}
        </section>

        {/* BOTTOM BAR */}
        <section className="mt-5 rounded-[24px] border border-[#e7def5] bg-white p-5 shadow-[0_14px_40px_rgba(65,29,120,0.04)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h3 className="text-[22px] font-black tracking-[-0.05em] text-[#1f1632]">
                Purchase history
              </h3>
              <p className="mt-2 text-sm leading-6 text-[#796c91]">
                Credit purchase history yahan show hoga after payment integration.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <span className="inline-flex items-center gap-2 rounded-full bg-[#fbf8ff] px-4 py-2 text-xs font-black text-[#665a7d] ring-1 ring-[#efe8fb]">
                <Star size={14} />
                Manual billing supported
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-[#fbf8ff] px-4 py-2 text-xs font-black text-[#665a7d] ring-1 ring-[#efe8fb]">
                <Lock size={14} />
                Secure payment ready
              </span>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
