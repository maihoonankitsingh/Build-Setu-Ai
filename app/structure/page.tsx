"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  ClipboardList,
  Columns3,
  History,
  Loader2,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

type Structure = {
  id: string;
  createdAt: string;
  projectName: string;
  city: string;
  plotSize: string;
  floors: string;
  buildingType: string;
  soilType: string;
  span: string;
  requirement: string;
  status: string;
  draft: {
    summary: string;
    columnGrid: string[];
    beamSlabNotes: string[];
    foundationNotes: string[];
    loadPathWarnings: string[];
    engineerChecklist: string[];
    bbsHandoffNotes: string[];
  };
};

const defaultPrompt =
  "30x40 North facing G+1 residential house ke liye preliminary structure draft banao. Parking, living room, kitchen, staircase, first floor bedrooms aur balcony hai. Column grid idea, beam slab notes, foundation caution, load path warning aur engineer review checklist chahiye.";

const defaultFacts = {
  projectName: "30x40 G+1 Structure Draft",
  city: "Raipur",
  plotSize: "30x40 ft",
  floors: "G+1",
  buildingType: "Residential",
  soilType: "Unknown / to be tested",
  span: "10-12 ft typical room span",
};

function inferFacts(prompt: string, facts: typeof defaultFacts) {
  const text = prompt.toLowerCase();

  let plotSize = facts.plotSize;
  const plotMatch = prompt.match(/(\d+\s*[xX×]\s*\d+\s*(?:ft|feet|sqft)?)/);
  if (plotMatch?.[1]) plotSize = plotMatch[1].replace(/\s+/g, " ").trim();

  let floors = facts.floors;
  if (text.includes("g+2")) floors = "G+2";
  else if (text.includes("g+1") || text.includes("first floor")) floors = "G+1";
  else if (text.includes("duplex")) floors = "Duplex";
  else if (text.includes("ground floor")) floors = "Ground Floor";

  let buildingType = facts.buildingType;
  if (text.includes("commercial") || text.includes("shop")) buildingType = "Commercial / Mixed Use";
  else if (text.includes("residential") || text.includes("house")) buildingType = "Residential";

  let soilType = facts.soilType;
  if (text.includes("black cotton")) soilType = "Black cotton soil";
  else if (text.includes("hard soil")) soilType = "Hard soil";
  else if (text.includes("filled")) soilType = "Filled soil";

  return { ...facts, plotSize, floors, buildingType, soilType };
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
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700">
          {icon}
        </div>
        <h2 className="text-lg font-bold text-slate-950">{title}</h2>
      </div>

      <div className="space-y-3">
        {items.map((item, index) => (
          <div key={index} className="flex gap-3 rounded-2xl bg-slate-50 p-3 text-sm leading-6 text-slate-700">
            <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-indigo-700" />
            <p>{item}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function StructurePage() {
  const [prompt, setPrompt] = useState(defaultPrompt);
  const [facts, setFacts] = useState(defaultFacts);
  const [structure, setStructure] = useState<Structure | null>(null);
  const [structures, setStructures] = useState<Structure[]>([]);
  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(true);
  const [error, setError] = useState("");

  function updateFact(key: keyof typeof defaultFacts, value: string) {
    setFacts((prev) => ({ ...prev, [key]: value }));
  }

  async function loadStructures() {
    setListLoading(true);
    try {
      const res = await fetch("/api/structure/list", { cache: "no-store" });
      const data = await res.json();
      const items = Array.isArray(data.structures) ? data.structures : [];
      setStructures(items);
      if (!structure && items[0]) setStructure(items[0]);
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

      const res = await fetch("/api/structure/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...inferred,
          requirement: prompt,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Structure output generation failed");
      }

      setStructure(data.structure);
      await loadStructures();
    } catch (err: any) {
      setError(err?.message || "Structure output generation failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStructures();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="min-h-screen bg-[#F7F8FB] text-slate-950">
      <section className="mx-auto max-w-7xl px-5 py-8">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-indigo-700">BuildSetu AI</p>
            <h1 className="text-3xl font-bold tracking-tight">Structure Studio</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Prompt se preliminary column grid, beam/slab notes, foundation caution,
              load path warning aur engineer review checklist generate kare.
            </p>
          </div>

          <div className="flex gap-3">
            <a href="/design" className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50">
              Naksha Studio
            </a>
            <a href="/" className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50">
              Dashboard
            </a>
          </div>
        </div>

        <div className="mb-6 rounded-3xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-900">
          <div className="flex gap-3">
            <AlertTriangle className="mt-1 h-5 w-5 shrink-0" />
            <p>
              Preliminary structural draft only. Is output ko construction drawing, structural design,
              reinforcement drawing ya engineer approval ke replacement ke roop me use nahi karna hai.
            </p>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <section className="space-y-5">
            <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-700 text-white">
                  <Sparkles size={22} />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Direct Structure Prompt</h2>
                  <p className="text-sm text-slate-500">Emergent-style: requirement likho, output direct milega.</p>
                </div>
              </div>

              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="min-h-[230px] w-full resize-none rounded-3xl border border-slate-200 bg-slate-50 px-5 py-4 text-[15px] leading-7 text-slate-800 outline-none focus:border-indigo-500 focus:bg-white"
                placeholder="Example: 30x40 G+1 house ke liye preliminary column grid aur beam slab notes banao..."
              />

              <div className="mt-4 flex flex-wrap gap-2">
                {[
                  "30x40 G+1",
                  "Column grid idea",
                  "Beam slab notes",
                  "Foundation caution",
                  "BBS handoff",
                  "Engineer checklist",
                ].map((chip) => (
                  <button
                    key={chip}
                    onClick={() => setPrompt((prev) => `${prev}\n${chip}`)}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-indigo-50 hover:text-indigo-700"
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
                className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-indigo-700 px-5 text-sm font-bold text-white shadow-sm hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
                {loading ? "Generating Structure Draft..." : "Generate Structure Output"}
              </button>
            </div>

            <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="mb-4 text-sm font-bold text-slate-700">Detected / Optional Structure Facts</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <input className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-500" value={facts.projectName} onChange={(e) => updateFact("projectName", e.target.value)} placeholder="Project name" />
                <input className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-500" value={facts.city} onChange={(e) => updateFact("city", e.target.value)} placeholder="City" />
                <input className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-500" value={facts.plotSize} onChange={(e) => updateFact("plotSize", e.target.value)} placeholder="Plot size" />
                <select className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-500" value={facts.floors} onChange={(e) => updateFact("floors", e.target.value)}>
                  {["Ground Floor", "G+1", "G+2", "Duplex", "Shop + House"].map((x) => <option key={x}>{x}</option>)}
                </select>
                <select className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-500" value={facts.buildingType} onChange={(e) => updateFact("buildingType", e.target.value)}>
                  {["Residential", "Commercial / Mixed Use", "Interior Renovation", "Industrial Shed"].map((x) => <option key={x}>{x}</option>)}
                </select>
                <input className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-500" value={facts.soilType} onChange={(e) => updateFact("soilType", e.target.value)} placeholder="Soil type" />
                <input className="sm:col-span-2 rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-500" value={facts.span} onChange={(e) => updateFact("span", e.target.value)} placeholder="Approx span" />
              </div>
            </div>

            <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <History className="h-4 w-4 text-indigo-700" />
                <h3 className="text-sm font-bold text-slate-700">Recent Structure Outputs</h3>
              </div>

              {listLoading ? <p className="text-sm text-slate-500">Loading...</p> : null}

              <div className="space-y-2">
                {structures.slice(0, 6).map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setStructure(item)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 text-left text-sm hover:bg-indigo-50"
                  >
                    <div className="font-bold text-slate-900">{item.projectName}</div>
                    <div className="mt-1 text-xs text-slate-500">{item.plotSize} • {item.floors} • {item.city}</div>
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section className="space-y-6">
            {structure ? (
              <>
                <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 className="text-2xl font-bold tracking-tight">{structure.projectName}</h2>
                      <p className="mt-1 text-sm text-slate-500">
                        {structure.plotSize} • {structure.floors} • {structure.buildingType} • {structure.city}
                      </p>
                    </div>
                    <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-800">
                      Not For Construction
                    </span>
                  </div>
                  <p className="text-sm leading-6 text-slate-700">{structure.draft.summary}</p>
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                  <OutputBlock title="Preliminary Column Grid" icon={<Columns3 size={20} />} items={structure.draft.columnGrid} />
                  <OutputBlock title="Beam / Slab Notes" icon={<Building2 size={20} />} items={structure.draft.beamSlabNotes} />
                  <OutputBlock title="Foundation Notes" icon={<ShieldCheck size={20} />} items={structure.draft.foundationNotes} />
                  <OutputBlock title="Load Path Warnings" icon={<AlertTriangle size={20} />} items={structure.draft.loadPathWarnings} />
                </div>

                <OutputBlock title="Engineer Review Checklist" icon={<ClipboardList size={20} />} items={structure.draft.engineerChecklist} />
                <OutputBlock title="BBS Handoff Notes" icon={<CheckCircle2 size={20} />} items={structure.draft.bbsHandoffNotes} />
              </>
            ) : (
              <div className="rounded-[2rem] border border-slate-200 bg-white p-8 text-center shadow-sm">
                <ShieldCheck className="mx-auto h-10 w-10 text-indigo-700" />
                <h2 className="mt-4 text-xl font-bold">Structure output yahan aayega</h2>
                <p className="mt-2 text-sm text-slate-500">
                  Left prompt me requirement likho aur Generate Structure Output click karo.
                </p>
              </div>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}
