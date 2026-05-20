"use client";

import { FormEvent, useMemo, useState } from "react";

const I = {
  hero: "/buildai/images/landing/hero-main-person-tablet.png",
  explained: "/buildai/images/landing/buildai-explained-dashboard.png",
  render: "/buildai/images/landing/feature-ai-interior-exterior-render.png",
  boq: "/buildai/images/landing/feature-boq-estimation-automation.png",
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
  ["AI Renders", "Interior, exterior and client-ready visuals"],
  ["BOQ & Estimate", "Cost summaries, quantities and reports"],
  ["BBS Workflow", "Review-ready structural documentation drafts"],
  ["Client PDFs", "Branded proposals and project documents"],
  ["Payments", "Lead capture, payment and project tracking"],
  ["Dashboard", "Credits, analytics and workspace control"],
];

const agenda = [
  "Map your current client brief, render, BOQ and document workflow",
  "Show the BuildSetu AI dashboard, project tools and credit system",
  "Explain how your team can generate renders, BOQ, BBS and proposals",
  "Recommend the right plan, onboarding flow and next implementation steps",
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

    return `https://wa.me/916388424652?text=${encodeURIComponent(message)}`;
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
      <header className="sticky top-0 z-50 border-b border-[#eee8fb] bg-white/94 shadow-[0_10px_35px_rgba(36,18,74,0.04)] backdrop-blur-xl">
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
            <a href="/pricing" className="hidden rounded-xl border border-[#ded4ee] bg-white px-5 py-2.5 text-xs font-black text-[#150d2f] shadow-sm md:inline-flex">
              View Pricing
            </a>
            <a href="/login" className="rounded-xl bg-[#6d28d9] px-5 py-2.5 text-xs font-black text-white shadow-[0_14px_30px_rgba(109,40,217,0.25)]">
              Login
            </a>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden bg-[radial-gradient(circle_at_top,#f2e8ff_0%,#ffffff_45%,#fbfaff_100%)]">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.22] [mask-image:radial-gradient(circle_at_top,black,transparent_72%)]"
          style={{
            backgroundImage:
              "linear-gradient(#cbb8ef 1px, transparent 1px), linear-gradient(90deg, #cbb8ef 1px, transparent 1px)",
            backgroundSize: "56px 56px",
          }}
        />
        <div className="pointer-events-none absolute left-[4%] top-24 h-96 w-96 rounded-full bg-[#e9d7ff] opacity-75 blur-3xl" />
        <div className="pointer-events-none absolute right-[8%] top-32 h-[420px] w-[420px] rounded-full bg-[#ede9ff] opacity-75 blur-3xl" />

        <div className="relative mx-auto grid max-w-[1180px] gap-8 px-4 py-12 md:px-5 lg:grid-cols-[1.02fr_0.98fr] lg:items-center lg:py-16">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#e6d7fb] bg-white px-4 py-2 text-[11px] font-black uppercase tracking-[0.1em] text-[#6d28d9] shadow-sm">
              Private BuildSetu AI Demo
            </div>

            <h1 className="max-w-[660px] text-[44px] font-black leading-[0.94] tracking-[-0.08em] text-[#120a2f] md:text-[72px]">
              See your design workflow running on BuildSetu AI.
            </h1>

            <p className="mt-5 max-w-[630px] text-[16px] font-semibold leading-8 text-[#5f536f] md:text-[17px]">
              Book a guided walkthrough for AI renders, BOQ drafts, BBS documentation, branded proposals, lead capture and credit-based project workflows.
            </p>

            <div className="mt-7 grid max-w-[620px] gap-3 sm:grid-cols-3">
              <Stat value="30 min" label="Product walkthrough" />
              <Stat value="AEC" label="Architecture workflow" />
              <Stat value="1:1" label="Setup guidance" />
            </div>

            <div className="mt-8 overflow-hidden rounded-[34px] border border-[#e8ddf7] bg-white/80 p-3 shadow-[0_26px_90px_rgba(76,29,149,0.14)] backdrop-blur">
              <div className="relative overflow-hidden rounded-[28px] bg-[radial-gradient(circle_at_top_left,#efe3ff,#ffffff_48%,#f8f4ff)] p-4 md:p-5">
                <div className="grid gap-4 md:grid-cols-[1.1fr_0.9fr] md:items-center">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-[#6d28d9]">Demo preview</p>
                    <h2 className="mt-2 text-[28px] font-black leading-tight tracking-[-0.06em] text-[#2b1457]">
                      From client brief to proposal in one workspace
                    </h2>
                    <div className="mt-4 space-y-2.5">
                      {agenda.slice(0, 3).map((item) => (
                        <p key={item} className="flex gap-2 text-sm font-bold leading-6 text-[#5f5476]">
                          <span className="mt-0.5 text-[#6d28d9]">✓</span>
                          <span>{item}</span>
                        </p>
                      ))}
                    </div>
                  </div>
                  <img src={I.cta} alt="BuildSetu AI workflow preview" className="rounded-[24px] border border-[#eee8f8] shadow-[0_18px_60px_rgba(76,29,149,0.14)]" />
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[38px] border border-[#e4d6f7] bg-white/82 p-3 shadow-[0_32px_110px_rgba(76,29,149,0.18)] backdrop-blur">
            <div className="overflow-hidden rounded-[32px] border border-[#efe6fb] bg-white">
              <div className="relative bg-[radial-gradient(circle_at_top_left,#efe3ff,#ffffff_55%)] px-6 pb-5 pt-6 md:px-8">
                <div className="absolute right-6 top-6 rounded-2xl bg-[#f1e6ff] px-3 py-2 text-xs font-black text-[#6d28d9]">
                  Demo Call
                </div>
                <h2 className="max-w-[330px] text-[34px] font-black leading-tight tracking-[-0.07em] text-[#2b1457]">
                  Schedule your workspace demo
                </h2>
                <p className="mt-3 max-w-[420px] text-sm font-semibold leading-6 text-[#786a91]">
                  Share your requirement. The request opens on WhatsApp with all details filled.
                </p>
              </div>

              <form onSubmit={submitDemo} className="space-y-4 px-6 pb-7 pt-5 md:px-8">
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
                    rows={4}
                    className="mt-2 w-full rounded-2xl border border-[#e4d7f5] bg-white px-4 py-3 text-sm font-semibold leading-6 text-[#2b1457] outline-none transition placeholder:text-[#a89ab8] focus:border-[#6d28d9] focus:ring-4 focus:ring-purple-100"
                  />
                </label>

                <button
                  type="submit"
                  className="flex h-[54px] w-full items-center justify-center rounded-2xl bg-gradient-to-r from-[#6d28d9] via-[#7c3aed] to-[#8b5cf6] px-6 text-sm font-black text-white shadow-[0_20px_48px_rgba(109,40,217,0.32)] transition hover:-translate-y-0.5"
                >
                  Send Demo Request on WhatsApp →
                </button>

                <div className="grid gap-3 pt-1 text-center text-[12px] font-bold text-[#8b7b9d] sm:grid-cols-3">
                  <span>✓ No obligation</span>
                  <span>✓ Expert walkthrough</span>
                  <span>✓ Setup guidance</span>
                </div>
              </form>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1120px] px-4 py-12 md:px-5">
        <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[#6d28d9]">Modules included in demo</p>
            <h2 className="mt-2 text-[34px] font-black leading-tight tracking-[-0.065em] text-[#2b1457] md:text-[48px]">
              A premium AI workspace for AEC teams
            </h2>
            <p className="mt-4 text-sm font-semibold leading-7 text-[#6b5e7b]">
              The demo shows the real workflow: project brief, design visuals, estimates, structural documentation, client proposals and team dashboard.
            </p>
          </div>

          <div className="overflow-hidden rounded-[34px] border border-[#e8ddf7] bg-white p-3 shadow-[0_26px_90px_rgba(76,29,149,0.10)]">
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

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-[24px] border border-[#e8ddf7] bg-white/86 p-5 text-center shadow-[0_16px_44px_rgba(65,29,120,0.08)] backdrop-blur">
      <p className="text-3xl font-black tracking-[-0.07em] text-[#6d28d9]">{value}</p>
      <p className="mt-1 text-xs font-extrabold leading-4 text-[#81758f]">{label}</p>
    </div>
  );
}
