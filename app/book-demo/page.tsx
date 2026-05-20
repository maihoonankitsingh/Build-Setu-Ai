"use client";

import { FormEvent, useMemo, useState } from "react";

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

const demoAgenda = [
  "Understand your current design, BOQ, BBS and client-document workflow",
  "Show BuildSetu AI modules for renders, estimation, PDFs and payments",
  "Recommend the right plan, credits and onboarding flow",
  "Explain implementation for your team or studio",
];

const modules = [
  "AI Interior & Exterior Renders",
  "BOQ & Estimate Drafts",
  "BBS Documentation Workflow",
  "Client Proposal PDFs",
  "Lead Forms & Payments",
  "Dashboard & Credit Tracking",
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
      <header className="border-b border-[#eee8fb] bg-white/94 shadow-[0_10px_35px_rgba(36,18,74,0.04)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1180px] items-center justify-between px-4 py-3 md:px-5">
          <a href="/buildai" className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-[#6d28d9] via-[#7c3aed] to-[#c026d3] text-base font-black text-white shadow-[0_14px_30px_rgba(109,40,217,0.28)]">
              B
            </span>
            <span className="leading-none">
              <span className="block text-[18px] font-black tracking-[-0.045em]">
                BuildSetu <span className="text-[#6d28d9]">AI</span>
              </span>
              <span className="block text-[10px] font-bold tracking-[-0.01em] text-[#8a7b9f]">
                Powered by Sikhadenge
              </span>
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

      <section className="relative overflow-hidden bg-[radial-gradient(circle_at_top,#f2e8ff_0%,#ffffff_48%,#fbfaff_100%)]">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.2] [mask-image:radial-gradient(circle_at_top,black,transparent_72%)]"
          style={{
            backgroundImage:
              "linear-gradient(#cbb8ef 1px, transparent 1px), linear-gradient(90deg, #cbb8ef 1px, transparent 1px)",
            backgroundSize: "56px 56px",
          }}
        />
        <div className="pointer-events-none absolute left-[5%] top-24 h-80 w-80 rounded-full bg-[#e9d7ff] opacity-70 blur-3xl" />
        <div className="pointer-events-none absolute right-[8%] top-36 h-96 w-96 rounded-full bg-[#ede9ff] opacity-70 blur-3xl" />

        <div className="relative mx-auto grid max-w-[1180px] gap-8 px-4 py-12 md:px-5 lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:py-16">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#e6d7fb] bg-white px-4 py-2 text-[11px] font-black uppercase tracking-[0.08em] text-[#6d28d9] shadow-sm">
              Book a BuildSetu AI product demo
            </div>

            <h1 className="max-w-[640px] text-[42px] font-black leading-[0.96] tracking-[-0.075em] text-[#120a2f] md:text-[66px]">
              See how BuildSetu AI fits your project workflow.
            </h1>

            <p className="mt-5 max-w-[620px] text-[16px] font-semibold leading-8 text-[#5f536f]">
              Get a guided walkthrough for AI renders, BOQ, BBS, client PDFs, payment flows and dashboard setup for your architecture, interior or construction team.
            </p>

            <div className="mt-7 grid gap-3 sm:grid-cols-3">
              <Stat value="30 min" label="Product walkthrough" />
              <Stat value="AEC" label="Focused workflow" />
              <Stat value="1:1" label="Implementation guidance" />
            </div>

            <div className="mt-8 rounded-[28px] border border-[#e8ddf7] bg-white/82 p-5 shadow-[0_20px_70px_rgba(65,29,120,0.08)] backdrop-blur">
              <h2 className="text-[20px] font-black tracking-[-0.04em] text-[#2b1457]">What we will cover</h2>
              <div className="mt-4 space-y-3">
                {demoAgenda.map((item) => (
                  <p key={item} className="flex gap-3 text-sm font-semibold leading-6 text-[#5f5476]">
                    <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#f1e6ff] text-[11px] font-black text-[#6d28d9]">✓</span>
                    <span>{item}</span>
                  </p>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-[34px] border border-[#e8ddf7] bg-white p-4 shadow-[0_28px_100px_rgba(76,29,149,0.14)] md:p-6">
            <div className="rounded-[26px] bg-gradient-to-br from-[#f8f2ff] to-white p-5 md:p-6">
              <h2 className="text-[28px] font-black tracking-[-0.06em] text-[#2b1457]">Schedule your demo</h2>
              <p className="mt-2 text-sm font-medium leading-6 text-[#786a91]">
                Fill the details. We will receive your requirement on WhatsApp and help you with the best setup.
              </p>

              <form onSubmit={submitDemo} className="mt-6 space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Full name" value={form.name} onChange={(v) => updateField("name", v)} required />
                  <Field label="Phone number" value={form.phone} onChange={(v) => updateField("phone", v)} required />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Email" type="email" value={form.email} onChange={(v) => updateField("email", v)} />
                  <Field label="Company / Studio" value={form.company} onChange={(v) => updateField("company", v)} />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Your role" value={form.role} onChange={(v) => updateField("role", v)} placeholder="Architect, Designer, Contractor..." />
                  <label className="block">
                    <span className="text-xs font-black uppercase tracking-[0.08em] text-[#6d28d9]">Project type</span>
                    <select
                      value={form.projectType}
                      onChange={(e) => updateField("projectType", e.target.value)}
                      className="mt-2 h-12 w-full rounded-2xl border border-[#e4d7f5] bg-white px-4 text-sm font-bold text-[#2b1457] outline-none transition focus:border-[#6d28d9] focus:ring-4 focus:ring-purple-100"
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
                    placeholder="Example: I want AI renders, BOQ automation and client proposal PDF workflow for my interior studio."
                    rows={4}
                    className="mt-2 w-full rounded-2xl border border-[#e4d7f5] bg-white px-4 py-3 text-sm font-semibold leading-6 text-[#2b1457] outline-none transition placeholder:text-[#a89ab8] focus:border-[#6d28d9] focus:ring-4 focus:ring-purple-100"
                  />
                </label>

                <button
                  type="submit"
                  className="flex h-13 w-full items-center justify-center rounded-2xl bg-gradient-to-r from-[#6d28d9] to-[#8b5cf6] px-6 text-sm font-black text-white shadow-[0_18px_42px_rgba(109,40,217,0.28)]"
                >
                  Send Demo Request on WhatsApp →
                </button>

                <p className="text-center text-xs font-bold leading-5 text-[#8b7b9d]">
                  By submitting, you agree to be contacted about BuildSetu AI demo and onboarding.
                </p>
              </form>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1040px] px-4 py-12 md:px-5">
        <div className="text-center">
          <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[#6d28d9]">Modules included in demo</p>
          <h2 className="mt-2 text-[32px] font-black tracking-[-0.065em] text-[#2b1457] md:text-[42px]">
            One workspace for construction documentation
          </h2>
        </div>

        <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {modules.map((item, index) => (
            <div key={item} className="rounded-[26px] border border-[#e8ddf7] bg-gradient-to-br from-white to-[#fbf8ff] p-6 shadow-[0_16px_48px_rgba(65,29,120,0.07)]">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#f1e6ff] text-lg font-black text-[#6d28d9]">{index + 1}</span>
              <h3 className="mt-5 text-[19px] font-black tracking-[-0.04em] text-[#2b1457]">{item}</h3>
              <p className="mt-3 text-sm font-medium leading-6 text-[#786a91]">
                See how this module can reduce manual work and improve client-ready delivery.
              </p>
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
        className="mt-2 h-12 w-full rounded-2xl border border-[#e4d7f5] bg-white px-4 text-sm font-bold text-[#2b1457] outline-none transition placeholder:text-[#a89ab8] focus:border-[#6d28d9] focus:ring-4 focus:ring-purple-100"
      />
    </label>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-[22px] border border-[#e8ddf7] bg-white/84 p-5 text-center shadow-[0_12px_38px_rgba(65,29,120,0.06)] backdrop-blur">
      <p className="text-3xl font-black tracking-[-0.07em] text-[#6d28d9]">{value}</p>
      <p className="mt-1 text-xs font-extrabold text-[#81758f]">{label}</p>
    </div>
  );
}
