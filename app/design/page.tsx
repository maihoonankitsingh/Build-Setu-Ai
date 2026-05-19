"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Building2, CheckCircle2, Compass, Home, Loader2, Ruler, ShieldCheck } from "lucide-react";

type Design = {
  id: string;
  createdAt: string;
  projectName: string;
  city: string;
  plotSize: string;
  facing: string;
  floors: string;
  bedrooms: string;
  bathrooms: string;
  parking: string;
  vastu: string;
  budget: string;
  requirement: string;
  status: string;
  draft: {
    summary: string;
    roomSchedule: string[];
    floorPlan: string[];
    vastuNotes: string[];
    structuralNotes: string[];
    reviewChecklist: string[];
    clientNotes: string[];
  };
};

const defaultForm = {
  projectName: "30x40 North Facing House",
  city: "Raipur",
  plotSize: "30x40 ft",
  facing: "North",
  floors: "G+1",
  bedrooms: "3",
  bathrooms: "3",
  parking: "Yes",
  vastu: "Yes",
  budget: "25-35 lakh",
  requirement:
    "Modern family house with parking, living room, kitchen, puja space, staircase, bedrooms, balcony, good light and ventilation.",
};

function Section({ title, icon, items }: { title: string; icon: React.ReactNode; items: string[] }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
          {icon}
        </div>
        <h2 className="text-lg font-bold text-slate-950">{title}</h2>
      </div>
      <div className="space-y-3">
        {items.map((item, index) => (
          <div key={index} className="flex gap-3 rounded-2xl bg-slate-50 p-3 text-sm leading-6 text-slate-700">
            <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-blue-700" />
            <p>{item}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function DesignPage() {
  const [form, setForm] = useState(defaultForm);
  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(true);
  const [error, setError] = useState("");
  const [design, setDesign] = useState<Design | null>(null);
  const [designs, setDesigns] = useState<Design[]>([]);

  function update(key: keyof typeof defaultForm, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function loadDesigns() {
    setListLoading(true);
    try {
      const res = await fetch("/api/design/list", { cache: "no-store" });
      const data = await res.json();
      const items = Array.isArray(data.designs) ? data.designs : [];
      setDesigns(items);
      if (!design && items[0]) setDesign(items[0]);
    } finally {
      setListLoading(false);
    }
  }

  async function generateDesign() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/design/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Design generation failed");
      setDesign(data.design);
      await loadDesigns();
    } catch (err: any) {
      setError(err?.message || "Design generation failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDesigns();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="min-h-screen bg-[#F7F8FB] text-slate-950">
      <section className="mx-auto max-w-7xl px-5 py-8">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-blue-700">BuildSetu AI</p>
            <h1 className="text-3xl font-bold tracking-tight">Naksha Studio</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Plot requirement se planning-level naksha draft, room schedule, vastu notes,
              structural caution aur engineer review checklist generate kare.
            </p>
          </div>
          <a href="/" className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50">
            Back to dashboard
          </a>
        </div>

        <div className="mb-6 rounded-3xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
          <div className="flex gap-3">
            <AlertTriangle className="mt-1 h-5 w-5 shrink-0" />
            <p>
              This is a preliminary AI planning draft. Final naksha, structural drawing,
              column/beam/slab/footing design and construction decision must be reviewed
              and approved by qualified professionals.
            </p>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                <Ruler size={22} />
              </div>
              <div>
                <h2 className="text-lg font-bold">Requirement Input</h2>
                <p className="text-sm text-slate-500">Client requirement se naksha draft generate kare.</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <input className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500" value={form.projectName} onChange={(e) => update("projectName", e.target.value)} placeholder="Project name" />
              <input className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500" value={form.city} onChange={(e) => update("city", e.target.value)} placeholder="City" />
              <input className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500" value={form.plotSize} onChange={(e) => update("plotSize", e.target.value)} placeholder="Plot size" />
              <select className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500" value={form.facing} onChange={(e) => update("facing", e.target.value)}>
                {["North", "South", "East", "West", "North-East", "North-West", "South-East", "South-West"].map((x) => <option key={x}>{x}</option>)}
              </select>
              <select className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500" value={form.floors} onChange={(e) => update("floors", e.target.value)}>
                {["Ground Floor", "G+1", "G+2", "Duplex", "Shop + House"].map((x) => <option key={x}>{x}</option>)}
              </select>
              <input className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500" value={form.budget} onChange={(e) => update("budget", e.target.value)} placeholder="Budget" />
              <input className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500" value={form.bedrooms} onChange={(e) => update("bedrooms", e.target.value)} placeholder="Bedrooms" />
              <input className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500" value={form.bathrooms} onChange={(e) => update("bathrooms", e.target.value)} placeholder="Bathrooms" />
              <select className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500" value={form.parking} onChange={(e) => update("parking", e.target.value)}>
                {["Yes", "No", "Two Wheeler Only", "Car + Two Wheeler"].map((x) => <option key={x}>{x}</option>)}
              </select>
              <select className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500" value={form.vastu} onChange={(e) => update("vastu", e.target.value)}>
                {["Yes", "No", "Flexible"].map((x) => <option key={x}>{x}</option>)}
              </select>
            </div>

            <textarea
              className="mt-4 min-h-32 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm leading-6 outline-none focus:border-blue-500"
              value={form.requirement}
              onChange={(e) => update("requirement", e.target.value)}
              placeholder="Client requirement"
            />

            {error ? (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div>
            ) : null}

            <button
              onClick={generateDesign}
              disabled={loading}
              className="mt-5 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 text-sm font-bold text-white shadow-sm hover:bg-blue-800 disabled:opacity-60"
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : <Home size={18} />}
              {loading ? "Generating Draft..." : "Generate Naksha Draft"}
            </button>

            <div className="mt-6">
              <h3 className="mb-3 text-sm font-bold text-slate-700">Recent Drafts</h3>
              {listLoading ? <p className="text-sm text-slate-500">Loading...</p> : null}
              <div className="space-y-2">
                {designs.slice(0, 5).map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setDesign(item)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 text-left text-sm hover:bg-blue-50"
                  >
                    <div className="font-bold text-slate-900">{item.projectName}</div>
                    <div className="mt-1 text-xs text-slate-500">{item.plotSize} • {item.facing} • {item.city}</div>
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section className="space-y-6">
            {design ? (
              <>
                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 className="text-2xl font-bold tracking-tight">{design.projectName}</h2>
                      <p className="mt-1 text-sm text-slate-500">{design.plotSize} • {design.facing} • {design.floors} • {design.city}</p>
                    </div>
                    <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
                      Engineer Review Required
                    </span>
                  </div>
                  <p className="text-sm leading-6 text-slate-700">{design.draft.summary}</p>
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                  <Section title="Room Schedule" icon={<Home size={20} />} items={design.draft.roomSchedule} />
                  <Section title="Floor Plan Logic" icon={<Building2 size={20} />} items={design.draft.floorPlan} />
                  <Section title="Vastu Notes" icon={<Compass size={20} />} items={design.draft.vastuNotes} />
                  <Section title="Structural Caution" icon={<ShieldCheck size={20} />} items={design.draft.structuralNotes} />
                </div>

                <Section title="Review Checklist" icon={<AlertTriangle size={20} />} items={design.draft.reviewChecklist} />
                <Section title="Client Notes" icon={<CheckCircle2 size={20} />} items={design.draft.clientNotes} />
              </>
            ) : (
              <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
                <Home className="mx-auto h-10 w-10 text-blue-700" />
                <h2 className="mt-4 text-xl font-bold">No naksha draft yet</h2>
                <p className="mt-2 text-sm text-slate-500">Left form fill karke first draft generate karo.</p>
              </div>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}
