"use client";

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
  Zap,
} from "lucide-react";

const packs = [
  {
    name: "Starter Credit Pack",
    credits: 120,
    price: 2499,
    desc: "Small project aur quick AI workflow ke liye.",
    features: ["Interior / exterior render credits", "Magic Brief", "Client PDF exports", "Valid for 30 days"],
  },
  {
    name: "Pro Credit Pack",
    credits: 400,
    price: 4999,
    desc: "Active designer, architect aur contractor workflow ke liye.",
    popular: true,
    features: ["Render generations", "Naksha + Structure drafts", "BOQ / BBS drafts", "Valid for 60 days"],
  },
  {
    name: "Agency Credit Pack",
    credits: 1200,
    price: 12999,
    desc: "Agency aur multi-client project workflow ke liye.",
    features: ["High volume AI usage", "Large PDF/report usage", "Contractor package workflow", "Valid for 90 days"],
  },
];

function money(value: number) {
  return "₹" + value.toLocaleString("en-IN");
}

export default function CreditsPage() {
  return (
    <main className="min-h-screen bg-[#fbf8ff] text-[#21133f]">
      <section className="mx-auto max-w-6xl px-5 py-6">
        <div className="mb-5 flex items-center justify-between">
          <a href="/" className="inline-flex items-center gap-2 text-sm font-black text-[#6b607a] hover:text-[#7c3aed]">
            <ArrowLeft size={17} />
            Back to dashboard
          </a>

          <a href="/pricing" className="inline-flex h-10 items-center justify-center rounded-xl border border-[#ded3ef] bg-white px-4 text-xs font-black text-[#281d39] shadow-sm hover:bg-purple-50">
            View Plans
          </a>
        </div>

        <section className="mb-5 overflow-hidden rounded-[24px] border border-[#ded3ef] bg-white shadow-sm">
          <div className="grid gap-5 p-5 lg:grid-cols-[1fr_330px] lg:items-center">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-purple-100 px-3 py-1 text-xs font-black text-[#7c3aed]">
                <Sparkles size={14} />
                BuildSetu Credits
              </div>

              <h1 className="text-[34px] font-black leading-none tracking-[-0.06em] text-[#21133f] md:text-[42px]">
                Buy more credits
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#6b607a]">
                Credits khatam hone par yahin se extra credits purchase kar sakte ho.
                Credits render, AI tools, reports, BOQ/BBS, agreements aur PDF exports me use honge.
              </p>
            </div>

            <div className="rounded-2xl border border-[#ded3ef] bg-gradient-to-br from-white to-[#efe5ff] p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-wider text-[#817397]">Available Credits</p>
                  <p className="mt-2 text-5xl font-black tracking-[-0.07em] text-[#21133f]">120</p>
                </div>

                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#7c3aed] to-[#b936f5] text-white shadow-lg">
                  <CreditCard size={26} />
                </div>
              </div>

              <a href="#credit-packs" className="mt-4 flex h-11 items-center justify-center gap-2 rounded-xl bg-[#21133f] text-sm font-black text-white shadow-md">
                <Plus size={17} />
                Buy More Credits
              </a>
            </div>
          </div>
        </section>

        <section className="mb-5 grid gap-4 md:grid-cols-3">
          {[
            ["Instant top-up", "Payment success ke baad credits account me add honge.", <BadgeCheck key="a" size={20} />],
            ["Usage control", "Har AI run ke according credits deduct honge.", <Shield key="b" size={20} />],
            ["Secure checkout", "Payment gateway integration ke liye ready layout.", <Lock key="c" size={20} />],
          ].map(([title, desc, icon]) => (
            <div key={String(title)} className="rounded-2xl border border-[#ded3ef] bg-white p-4 shadow-sm">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 text-[#7c3aed]">
                {icon}
              </div>
              <h3 className="text-base font-black">{title}</h3>
              <p className="mt-1 text-xs leading-5 text-[#7a6b91]">{desc}</p>
            </div>
          ))}
        </section>

        <section id="credit-packs" className="grid gap-4 lg:grid-cols-3">
          {packs.map((pack) => (
            <article
              key={pack.name}
              className={`relative rounded-2xl border bg-white p-5 shadow-sm ${
                pack.popular ? "border-[#7c3aed] shadow-[0_0_0_3px_rgba(124,58,237,0.12)]" : "border-[#ded3ef]"
              }`}
            >
              {pack.popular ? (
                <div className="absolute -top-3 left-5 rounded-full bg-gradient-to-r from-[#7c3aed] to-[#b936f5] px-3 py-1 text-[10px] font-black text-white">
                  Most Popular
                </div>
              ) : null}

              <div className="flex items-start justify-between gap-4 pt-2">
                <div>
                  <h2 className="text-lg font-black tracking-[-0.03em] text-[#21133f]">{pack.name}</h2>
                  <p className="mt-1 text-xs leading-5 text-[#7a6b91]">{pack.desc}</p>
                </div>

                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-purple-100 text-[#7c3aed]">
                  <Zap size={21} />
                </div>
              </div>

              <div className="mt-5 rounded-2xl bg-[#fbf8ff] p-4">
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold text-[#817397]">Credits</p>
                    <p className="text-3xl font-black tracking-[-0.05em] text-[#21133f]">
                      {pack.credits.toLocaleString("en-IN")}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-[#817397]">Price</p>
                    <p className="text-2xl font-black tracking-[-0.05em] text-[#21133f]">{money(pack.price)}</p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => alert(`${pack.name} selected. Payment integration next step hai.`)}
                className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#6246ea] to-[#b936f5] text-sm font-black text-white shadow-md shadow-purple-200"
              >
                <Plus size={17} />
                Buy Credits
              </button>

              <div className="mt-5 space-y-3">
                {pack.features.map((feature) => (
                  <div key={feature} className="flex gap-2.5 text-xs leading-5 text-[#3f315d]">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#7c3aed]" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </section>

        <section className="mt-6 rounded-2xl border border-[#ded3ef] bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h3 className="text-lg font-black tracking-[-0.03em]">Purchase history</h3>
              <p className="mt-1 text-xs leading-5 text-[#7a6b91]">
                Credit purchase history yahan show hoga after payment integration.
              </p>
            </div>

            <span className="inline-flex items-center gap-2 rounded-xl bg-[#fbf8ff] px-4 py-2 text-xs font-black text-[#6b607a]">
              <Star size={15} />
              Manual billing supported
            </span>
          </div>
        </section>
      </section>
    </main>
  );
}
