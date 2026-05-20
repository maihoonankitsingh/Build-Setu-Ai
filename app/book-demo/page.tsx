"use client";

import { FormEvent, useMemo, useState } from "react";

const I = {
  explained: "/buildai/images/landing/buildai-explained-dashboard.png",
  cta: "/buildai/images/landing/cta-smart-project-workflow-devices.png",
};

const projectTypes = [
  "Residential House / Villa",
  "Interior Design Studio",
  "Architecture / Design Consultancy",
  "Contractor / Civil Work",
  "BOQ / Estimation Workflow",
  "BBS / Structural Documentation",
  "Real Estate / Builder Team",
  "Other",
];

const modules = [
  ["AI Renders", "Interior and exterior visuals from project briefs."],
  ["BOQ & Estimate", "Quantity summaries, costing and reports."],
  ["BBS Workflow", "Review-ready structural documentation drafts."],
  ["Client PDFs", "Branded proposals and project documents."],
  ["Payments", "Lead capture, payment and project tracking."],
  ["Dashboard", "Credits, analytics and workspace control."],
];

const outcomes = [
  ["01", "Workflow mapping"],
  ["02", "Live product demo"],
  ["03", "Plan recommendation"],
  ["04", "Setup guidance"],
];

export default function BookDemoPage() {
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    company: "",
    role: "",
    projectType: projectTypes[0],
    requirement: "",
  });

  const whatsappUrl = useMemo(() => {
    const message = [
      "BuildSetu AI Demo Request",
      "",
      `Name: ${form.name || "-"}`,
      `Phone: ${form.phone || "-"}`,
      `Email: ${form.email || "-"}`,
      `Company: ${form.company || "-"}`,
      `Role: ${form.role || "-"}`,
      `Project Type: ${form.projectType || "-"}`,
      `Requirement: ${form.requirement || "-"}`,
    ].join("\n");

    return `https://wa.me/919876543210?text=${encodeURIComponent(message)}`;
  }, [form]);

  function updateField(key: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function submitDemo(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <main className="min-h-screen bg-[#fbfaff] text-[#120a2f] antialiased">
      <header className="sticky top-0 z-50 border-b border-[#eee8fb] bg-white/95 shadow-[0_10px_35px_rgba(36,18,74,0.05)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1180px] items-center justify-between px-4 py-3 md:px-5">
          <a href="/buildai" className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-[#6d28d9] via-[#7c3aed] to-[#c026d3] text-base font-black text-white shadow-[0_14px_30px_rgba(109,40,217,0.28)]">
              B
            </span>
            <span className="leading-none">
              <span className="block text-[18px] font-black tracking-[-0.045em]">
                BuildSetu <span className="text-[#6d28d9]">AI</span>
              </span>
              <span className="block text-[10px] font-bold text-[#8a7b9f]">Powered by Sikhadenge</span>
            </span>
          </a>

          <div className="flex items-center gap-2">
            <a href="/buildai" className="hidden rounded-xl border border-[#ded4ee] bg-white px-5 py-2.5 text-xs font-black text-[#150d2f] shadow-sm md:inline-flex">
              Back to BuildAI
            </a>
            <a href="/pricing" className="rounded-xl bg-[#6d28d9] px-5 py-2.5 text-xs font-black text-white shadow-[0_14px_30px_rgba(109,40,217,0.25)]">
              View Pricing
            </a>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden bg-[radial-gradient(circle_at_top,#f2e8ff_0%,#ffffff_44%,#fbfaff_100%)]">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.23] [mask-image:radial-gradient(circle_at_top,black,transparent_72%)]"
          style={{
            backgroundImage:
              "linear-gradient(#cbb8ef 1px, transparent 1px), linear-gradient(90deg, #cbb8ef 1px, transparent 1px)",
            backgroundSize: "58px 58px",
          }}
        />
        <div className="pointer-events-none absolute left-[3%] top-20 h-96 w-96 rounded-full bg-[#e8d7ff] opacity-80 blur-3xl" />
        <div className="pointer-events-none absolute right-[6%] top-28 h-[460px] w-[460px] rounded-full bg-[#eee7ff] opacity-80 blur-3xl" />

        <div className="relative mx-auto grid max-w-[1180px] gap-8 px-4 py-10 md:px-5 lg:grid-cols-2 lg:items-stretch lg:py-14">
          <div className="flex h-full flex-col rounded-[42px] border border-[#e4d6f7] bg-white/78 p-4 shadow-[0_34px_120px_rgba(76,29,149,0.16)] backdrop-blur md:p-6">
            <div className="flex-1 rounded-[34px] bg-[radial-gradient(circle_at_top_left,#ffffff_0%,#fbf7ff_52%,#f3eaff_100%)] p-6 md:p-8">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#e6d7fb] bg-white px-4 py-2 text-[11px] font-black uppercase tracking-[0.1em] text-[#6d28d9] shadow-sm">
                Private product walkthrough
              </div>

              <h1 className="mt-5 max-w-[620px] text-[40px] font-black leading-[0.96] tracking-[-0.075em] text-[#120a2f] md:text-[60px]">
                Book a premium BuildSetu AI demo for your team.
              </h1>

              <p className="mt-5 max-w-[600px] text-[15px] font-semibold leading-8 text-[#5f536f] md:text-[16px]">
                See how your architecture, interior or construction workflow can run with AI renders, BOQ drafts, BBS documentation, client PDFs and payments from one workspace.
              </p>

              <div className="mt-7 grid gap-3 sm:grid-cols-4">
                {outcomes.map(([num, item]) => (
                  <div key={item} className="rounded-2xl border border-[#e8ddf7] bg-white/90 p-4 text-center shadow-[0_14px_42px_rgba(65,29,120,0.06)]">
                    <p className="text-lg font-black text-[#6d28d9]">{num}</p>
                    <p className="mt-1 text-[12px] font-black leading-4 text-[#3a176d]">{item}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 overflow-hidden rounded-[34px] bg-[radial-gradient(circle_at_top_left,#7c3aed_0%,#3b0f80_42%,#160632_100%)] p-5 text-white shadow-[0_24px_80px_rgba(76,29,149,0.22)] md:p-6">
              <div className="grid gap-5 md:grid-cols-[0.82fr_1.18fr] md:items-center">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.14em] text-purple-200">Demo preview</p>
                  <h2 className="mt-2 text-[28px] font-black leading-tight tracking-[-0.06em]">
                    From client brief to proposal-ready workflow
                  </h2>
                  <div className="mt-5 space-y-3">
                    {["AI renders and design previews", "BOQ, BBS and documentation workflow", "Client PDFs and dashboard tracking"].map((item) => (
                      <p key={item} className="flex gap-2 text-sm font-bold leading-6 text-white/84">
                        <span className="text-emerald-300">✓</span>
                        <span>{item}</span>
                      </p>
                    ))}
                  </div>
                </div>

                <div className="relative">
                  <img src={I.cta} alt="BuildSetu AI workflow preview" className="rounded-[26px] border border-white/15 shadow-[0_28px_80px_rgba(0,0,0,0.28)]" />
                  <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 rounded-2xl border border-white/15 bg-white/12 px-4 py-3 text-xs font-black text-white shadow-lg backdrop-blur">
                    Live workflow demo
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex h-full">
            <div className="w-full rounded-[42px] border border-[#e4d6f7] bg-white/88 p-3 shadow-[0_34px_120px_rgba(76,29,149,0.20)] backdrop-blur">
              <div className="flex h-full flex-col overflow-hidden rounded-[36px] border border-[#efe6fb] bg-white">
                <div className="relative overflow-hidden bg-[radial-gradient(circle_at_top_left,#efe3ff,#ffffff_55%)] px-6 pb-5 pt-6 md:px-8">
                  <div className="absolute right-6 top-6 rounded-2xl bg-[#f1e6ff] px-3 py-2 text-xs font-black text-[#6d28d9]">
                    30 min call
                  </div>
                  <h2 className="max-w-[350px] text-[34px] font-black leading-tight tracking-[-0.07em] text-[#2b1457]">
                    Schedule your demo
                  </h2>
                  <p className="mt-3 max-w-[430px] text-sm font-semibold leading-6 text-[#786a91]">
                    Fill the form. Your request opens on WhatsApp with all details ready to send.
                  </p>
                </div>

                <form onSubmit={submitDemo} className="flex flex-1 flex-col space-y-4 px-6 pb-7 pt-5 md:px-8">
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Full name" value={form.name} onChange={(v) => updateField("name", v)} required />
                    <Field label="Phone number" value={form.phone} onChange={(v) => updateField("phone", v)} required />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Email" type="email" value={form.email} onChange={(v) => updateField("email", v)} />
                    <Field label="Company / Studio" value={form.company} onChange={(v) => updateField("company", v)} />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Your role" value={form.role} onChange={(v) => updateField("role", v)} placeholder="Architect, Designer..." />
                    <label className="block">
                      <span className="text-xs font-black uppercase tracking-[0.08em] text-[#6d28d9]">Project type</span>
                      <select
                        value={form.projectType}
                        onChange={(e) => updateField("projectType", e.target.value)}
                        className="mt-2 h-[52px] w-full rounded-2xl border border-[#e4d7f5] bg-white px-4 text-sm font-bold text-[#2b1457] outline-none transition focus:border-[#6d28d9] focus:ring-4 focus:ring-purple-100"
                      >
                        {projectTypes.map((item) => (
                          <option key={item}>{item}</option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <label className="block">
                    <span className="text-xs font-black uppercase tracking-[0.08em] text-[#6d28d9]">Requirement</span>
                    <textarea
                      value={form.requirement}
                      onChange={(e) => updateField("requirement", e.target.value)}
                      placeholder="Example: I want AI renders, BOQ automation, BBS draft and client proposal workflow for my studio."
                      rows={5}
                      className="mt-2 w-full rounded-2xl border border-[#e4d7f5] bg-white px-4 py-3 text-sm font-semibold leading-6 text-[#2b1457] outline-none transition placeholder:text-[#a89ab8] focus:border-[#6d28d9] focus:ring-4 focus:ring-purple-100"
                    />
                  </label>

                  <div className="mt-auto space-y-4 pt-2">
                    <button
                      type="submit"
                      className="flex h-[56px] w-full items-center justify-center rounded-2xl bg-gradient-to-r from-[#6d28d9] via-[#7c3aed] to-[#8b5cf6] px-6 text-sm font-black text-white shadow-[0_22px_55px_rgba(109,40,217,0.34)] transition hover:-translate-y-0.5"
                    >
                      Send Demo Request on WhatsApp →
                    </button>

                    <div className="grid gap-3 text-center text-[12px] font-bold text-[#8b7b9d] sm:grid-cols-3">
                      <span>✓ No obligation</span>
                      <span>✓ Expert walkthrough</span>
                      <span>✓ Setup guidance</span>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1120px] px-4 py-12 md:px-5">
        <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[#6d28d9]">What you will see</p>
            <h2 className="mt-2 text-[34px] font-black leading-tight tracking-[-0.065em] text-[#2b1457] md:text-[48px]">
              A complete AI workspace for AEC delivery
            </h2>
            <p className="mt-4 text-sm font-semibold leading-7 text-[#6b5e7b]">
              The demo covers project intake, design generation, estimation, structural documentation, client proposals and workspace analytics.
            </p>
          </div>

          <div className="overflow-hidden rounded-[34px] border border-[#e8ddf7] bg-white p-3 shadow-[0_26px_90px_rgba(76,29,149,0.11)]">
            <img src={I.explained} alt="BuildSetu AI dashboard demo" className="rounded-[28px] border border-[#eee8f8]" />
          </div>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {modules.map(([title, desc], index) => (
            <div key={title} className="rounded-[28px] border border-[#e8ddf7] bg-gradient-to-br from-white to-[#fbf8ff] p-6 shadow-[0_16px_48px_rgba(65,29,120,0.07)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_70px_rgba(65,29,120,0.10)]">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#f1e6ff] text-lg font-black text-[#6d28d9]">{index + 1}</span>
              <h3 className="mt-5 text-[20px] font-black tracking-[-0.04em] text-[#2b1457]">{title}</h3>
              <p className="mt-3 text-sm font-medium leading-6 text-[#786a91]">{desc}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-xs font-black uppercase tracking-[0.08em] text-[#6d28d9]">{label}</span>
      <input
        type={type}
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-2 h-[52px] w-full rounded-2xl border border-[#e4d7f5] bg-white px-4 text-sm font-bold text-[#2b1457] outline-none transition placeholder:text-[#a89ab8] focus:border-[#6d28d9] focus:ring-4 focus:ring-purple-100"
      />
    </label>
  );
}
