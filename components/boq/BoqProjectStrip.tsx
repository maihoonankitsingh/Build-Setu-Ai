"use client";

import type { BoqProject } from "./boqTypes";
import { getProjectBuiltUpArea, getProjectLocation, getProjectStructure, getProjectTitle, getProjectType } from "./boqUtils";

export default function BoqProjectStrip({ project }: { project: BoqProject | null }) {
  const createdAt = project?.createdAt
    ? new Date(project.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
    : "—";

  return (
    <section className="rounded-[24px] border border-[#e7ddff] bg-white p-3 shadow-[0_12px_30px_rgba(33,19,63,0.045)]">
      <div className="grid gap-3 lg:grid-cols-[minmax(280px,1.5fr)_repeat(4,minmax(0,1fr))_120px]">
        <div className="flex items-center gap-3">
          <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-2xl bg-gradient-to-br from-[#efe6ff] to-[#f8fbff] text-2xl">
            🏠
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-wide text-[#817397]">Selected Project</p>
            <h2 className="mt-1 truncate text-[15px] font-black text-[#161032]">{getProjectTitle(project)}</h2>
            <p className="mt-1 text-[11px] font-bold text-[#817397]">{getProjectLocation(project)}</p>
          </div>
        </div>

        {[
          ["Built-up Area", getProjectBuiltUpArea(project), "▥"],
          ["Project Type", getProjectType(project), "⌂"],
          ["Structure", getProjectStructure(project), "⌁"],
          ["Created On", createdAt, "◷"],
        ].map(([label, value, icon]) => (
          <div key={label} className="flex items-center gap-3 border-l border-[#eee8fb] px-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#f3edff] text-[#6d35ff]">{icon}</span>
            <div className="min-w-0">
              <p className="text-[10px] font-black text-[#817397]">{label}</p>
              <p className="mt-1 truncate text-[12px] font-black text-[#21133f]">{value}</p>
            </div>
          </div>
        ))}

        <button className="rounded-2xl border border-[#e4d9ff] bg-[#fbf8ff] px-4 text-xs font-black text-[#6d35ff] hover:bg-[#f3edff]">
          View Project
        </button>
      </div>
    </section>
  );
}
