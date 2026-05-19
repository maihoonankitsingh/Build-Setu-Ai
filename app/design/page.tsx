"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Compass,
  History,
  Home,
  Loader2,
  Ruler,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

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

const defaultPrompt =
  "30x40 North facing plot Raipur me G+1 modern family house ka naksha banao. Ground floor me car parking, living room, kitchen, dining, puja space, common toilet, staircase aur guest room chahiye. First floor me 3 bedrooms, balcony, attached toilet, good light ventilation aur vastu friendly planning chahiye. Budget 25-35 lakh.";

const defaultFacts = {
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
};

function inferFacts(prompt: string, facts: typeof defaultFacts) {
  const text = prompt.toLowerCase();

  let plotSize = facts.plotSize;
  const plotMatch = prompt.match(/(\d+\s*[xX×]\s*\d+\s*(?:ft|feet|sqft)?)/);
  if (plotMatch?.[1]) plotSize = plotMatch[1].replace(/\s+/g, " ").trim();

  let facing = facts.facing;
  for (const item of ["North-East", "North-West", "South-East", "South-West", "North", "South", "East", "West"]) {
    if (text.includes(item.toLowerCase())) facing = item;
  }

  let floors = facts.floors;
  if (text.includes("g+2")) floors = "G+2";
  else if (text.includes("g+1") || text.includes("first floor")) floors = "G+1";
  else if (text.includes("duplex")) floors = "Duplex";
  else if (text.includes("shop")) floors = "Shop + House";
  else if (text.includes("ground floor")) floors = "Ground Floor";

  let parking = facts.parking;
  if (text.includes("no parking")) parking = "No";
  else if (text.includes("parking") || text.includes("car")) parking = "Yes";

  let vastu = facts.vastu;
  if (text.includes("no vastu")) vastu = "No";
  else if (text.includes("vastu")) vastu = "Yes";

  let bedrooms = facts.bedrooms;
  const bedMatch = text.match(/(\d+)\s*(?:bedroom|bedrooms|bhk|bed)/);
  if (bedMatch?.[1]) bedrooms = bedMatch[1];

  let bathrooms = facts.bathrooms;
  const bathMatch = text.match(/(\d+)\s*(?:bathroom|bathrooms|toilet|toilets)/);
  if (bathMatch?.[1]) bathrooms = bathMatch[1];

  return { ...facts, plotSize, facing, floors, parking, vastu, bedrooms, bathrooms };
}

function OutputBlock({
  title,
  icon,
  items,
}: {
  title: string;
  icon: React.ReactNode;
  items: string[];
}) {
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
  const [prompt, setPrompt] = useState(defaultPrompt);
  const [facts, setFacts] = useState(defaultFacts);
  const [design, setDesign] = useState<Design | null>(null);
  const [designs, setDesigns] = useState<Design[]>([]);
  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(true);
  const [error, setError] = useState("");

  function updateFact(key: keyof typeof defaultFacts, value: string) {
    setFacts((prev) => ({ ...prev, [key]: value }));
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

  async function generateDirectOutput() {
    setLoading(true);
    setError("");

    try {
      const inferred = inferFacts(prompt, facts);
      setFacts(inferred);

      const res = await fetch("/api/design/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...inferred,
          requirement: prompt,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Naksha output generation failed");
      }

      setDesign(data.design);
      await loadDesigns();
    } catch (err: any) {
      setError(err?.message || "Naksha output generation failed");
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
              Requirement likho aur direct planning output lo: room schedule, floor plan logic,
              vastu notes, structural caution aur review checklist.
            </p>
          </div>

          <div className="flex gap-3">
            <a
              href="/reports"
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
            >
              Reports
            </a>
            <a
              href="/"
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
            >
              Dashboard
            </a>
          </div>
        </div>

        <div className="mb-6 rounded-3xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
          <div className="flex gap-3">
            <AlertTriangle className="mt-1 h-5 w-5 shrink-0" />
            <p>
              Output AI planning draft hai. Final naksha, column, beam, slab, footing,
              reinforcement aur construction decision qualified architect/engineer review ke bina use nahi karna hai.
            </p>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <section className="space-y-5">
            <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-700 text-white">
                  <Sparkles size={22} />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Direct Naksha Prompt</h2>
                  <p className="text-sm text-slate-500">Emergent-style: requirement likho, output direct milega.</p>
                </div>
              </div>

              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="min-h-[230px] w-full resize-none rounded-3xl border border-slate-200 bg-slate-50 px-5 py-4 text-[15px] leading-7 text-slate-800 outline-none focus:border-blue-500 focus:bg-white"
                placeholder="Example: 30x40 north facing plot me G+1 house ka naksha banao..."
              />

              <div className="mt-4 flex flex-wrap gap-2">
                {[
                  "30x40 North G+1",
                  "Shop + House",
                  "Vastu friendly",
                  "Low budget plan",
                  "Duplex with parking",
                  "Rental floor plan",
                ].map((chip) => (
                  <button
                    key={chip}
                    onClick={() => setPrompt((prev) => `${prev}\n${chip}`)}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-blue-50 hover:text-blue-700"
                  >
                    + {chip}
                  </button>
                ))}
              </div>

              {error ? (
                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  {error}
                </div>
              ) : null}

              <button
                onClick={generateDirectOutput}
                disabled={loading || !prompt.trim()}
                className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-blue-700 px-5 text-sm font-bold text-white shadow-sm hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
                {loading ? "Generating Direct Output..." : "Generate Direct Naksha Output"}
              </button>
            </div>

            <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="mb-4 text-sm font-bold text-slate-700">Detected / Optional Project Facts</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <input className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500" value={facts.projectName} onChange={(e) => updateFact("projectName", e.target.value)} placeholder="Project name" />
                <input className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500" value={facts.city} onChange={(e) => updateFact("city", e.target.value)} placeholder="City" />
                <input className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500" value={facts.plotSize} onChange={(e) => updateFact("plotSize", e.target.value)} placeholder="Plot size" />
                <select className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500" value={facts.facing} onChange={(e) => updateFact("facing", e.target.value)}>
                  {["North", "South", "East", "West", "North-East", "North-West", "South-East", "South-West"].map((x) => <option key={x}>{x}</option>)}
                </select>
                <select className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500" value={facts.floors} onChange={(e) => updateFact("floors", e.target.value)}>
                  {["Ground Floor", "G+1", "G+2", "Duplex", "Shop + House"].map((x) => <option key={x}>{x}</option>)}
                </select>
                <input className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500" value={facts.budget} onChange={(e) => updateFact("budget", e.target.value)} placeholder="Budget" />
              </div>
            </div>

            <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <History className="h-4 w-4 text-blue-700" />
                <h3 className="text-sm font-bold text-slate-700">Recent Outputs</h3>
              </div>

              {listLoading ? <p className="text-sm text-slate-500">Loading...</p> : null}

              <div className="space-y-2">
                {designs.slice(0, 6).map((item) => (
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
                <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 className="text-2xl font-bold tracking-tight">{design.projectName}</h2>
                      <p className="mt-1 text-sm text-slate-500">
                        {design.plotSize} • {design.facing} • {design.floors} • {design.city}
                      </p>
                    </div>
                    <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
                      Engineer Review Required
                    </span>
                  </div>
                  <p className="text-sm leading-6 text-slate-700">{design.draft.summary}</p>
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                  <OutputBlock title="Room Schedule" icon={<Home size={20} />} items={design.draft.roomSchedule} />
                  <OutputBlock title="Floor Plan Logic" icon={<Building2 size={20} />} items={design.draft.floorPlan} />
                  <OutputBlock title="Vastu Notes" icon={<Compass size={20} />} items={design.draft.vastuNotes} />
                  <OutputBlock title="Structural Caution" icon={<ShieldCheck size={20} />} items={design.draft.structuralNotes} />
                </div>

                <OutputBlock title="Review Checklist" icon={<AlertTriangle size={20} />} items={design.draft.reviewChecklist} />
                <OutputBlock title="Client Notes" icon={<CheckCircle2 size={20} />} items={design.draft.clientNotes} />
              </>
            ) : (
              <div className="rounded-[2rem] border border-slate-200 bg-white p-8 text-center shadow-sm">
                <Ruler className="mx-auto h-10 w-10 text-blue-700" />
                <h2 className="mt-4 text-xl font-bold">Direct output yahan aayega</h2>
                <p className="mt-2 text-sm text-slate-500">
                  Left prompt me client requirement likho aur Generate Direct Naksha Output click karo.
                </p>
              </div>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}
