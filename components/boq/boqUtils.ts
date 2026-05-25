import type { BoqItem, BoqProject, CategorySummaryRow } from "./boqTypes";

export function toNumber(value: unknown, fallback = 0) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
}

export function formatCurrency(value: unknown) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(toNumber(value));
}

export function formatNumber(value: unknown) {
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 2,
  }).format(toNumber(value));
}

export function getProjectTitle(project: BoqProject | null) {
  return project?.title || project?.name || "Selected Project";
}

export function getProjectLocation(project: BoqProject | null) {
  return project?.location || project?.city || "Raipur, Chhattisgarh";
}

export function getProjectBuiltUpArea(project: BoqProject | null) {
  if (!project) return "—";

  const direct =
    toNumber(project.builtUpArea, 0) ||
    toNumber(project.builtupArea, 0) ||
    toNumber(project.constructionArea, 0) ||
    toNumber(project.totalBuiltUpArea, 0);

  if (direct > 0) return `${formatNumber(direct)} sq.ft`;

  const title = getProjectTitle(project).replace(/×/g, "x");
  const match = title.match(/(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)/i);
  if (match) {
    const area = Number(match[1]) * Number(match[2]) * 0.78;
    return `${formatNumber(area)} sq.ft`;
  }

  const plotArea = toNumber(project.plotArea, 0) || toNumber(project.area, 0);
  if (plotArea > 0) return `${formatNumber(plotArea * 0.78)} sq.ft`;

  return "—";
}

export function getProjectStructure(project: BoqProject | null) {
  const title = getProjectTitle(project);
  const direct = project?.structure || "";
  if (direct) return direct;

  const gPlus = title.match(/g\s*\+\s*(\d+)/i);
  if (gPlus) return `G+${gPlus[1]}`;

  if (/duplex/i.test(title)) return "G+1";
  return "G";
}

export function getProjectType(project: BoqProject | null) {
  return project?.projectType || project?.type || "Residential";
}

export function getItemCode(item: BoqItem) {
  return item.itemCode || item.code || "—";
}

export function getBoqCategory(item: BoqItem) {
  const text = `${item.itemCode || ""} ${item.description || ""} ${item.drawingRef || ""}`.toLowerCase();

  if (text.includes("earth") || text.includes("excavation") || text.includes("site clearing") || text.includes("layout")) return "Earthwork";
  if (text.includes("pcc") || text.includes("rcc") || text.includes("concrete") || text.includes("formwork")) return "Concrete Work";
  if (text.includes("reinforcement") || text.includes("steel") || text.includes("bar")) return "Reinforcement";
  if (text.includes("brick") || text.includes("masonry") || text.includes("block")) return "Masonry Work";
  if (text.includes("plaster") || text.includes("paint") || text.includes("putty") || text.includes("flooring") || text.includes("tile")) return "Finishes";
  if (text.includes("electrical") || text.includes("wiring")) return "Electrical";
  if (text.includes("plumbing") || text.includes("sanitary")) return "Plumbing";
  if (text.includes("door") || text.includes("window") || text.includes("joinery")) return "Doors & Windows";
  if (text.includes("contingency") || text.includes("wastage") || text.includes("supervision")) return "Contingency";
  return "Other";
}

export function buildCategorySummary(items: BoqItem[], totalAmount: number): CategorySummaryRow[] {
  const colors = ["#6d35ff", "#5d9cff", "#63d99c", "#ffac45", "#ff6f91", "#14b8a6", "#f97316", "#8b5cf6"];
  const map = new Map<string, number>();

  items.forEach((item) => {
    const category = getBoqCategory(item);
    map.set(category, (map.get(category) || 0) + toNumber(item.amount));
  });

  return Array.from(map.entries())
    .map(([category, amount], index) => ({
      category,
      amount,
      percent: totalAmount ? Number(((amount / totalAmount) * 100).toFixed(1)) : 0,
      color: colors[index % colors.length],
    }))
    .sort((a, b) => b.amount - a.amount);
}

export function buildConicGradient(summary: CategorySummaryRow[]) {
  if (!summary.length) return "conic-gradient(#efe7ff 0deg 360deg)";

  let start = 0;
  const parts = summary.map((row) => {
    const end = start + row.percent;
    const part = `${row.color} ${start}% ${end}%`;
    start = end;
    return part;
  });

  return `conic-gradient(${parts.join(", ")})`;
}
