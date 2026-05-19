import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb, degrees } from "pdf-lib";
import fs from "fs/promises";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const REPORT_DIR = path.join(process.cwd(), "public", "generated", "reports");

function safeText(value: unknown, fallback = "-") {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  return text || fallback;
}

function money(value: unknown) {
  const n = Number(value || 0);
  if (!Number.isFinite(n)) return "Rs. 0";
  return "Rs. " + n.toLocaleString("en-IN");
}

function shortId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function wrapText(text: string, maxChars = 88) {
  const words = safeText(text).split(/\s+/);
  const lines: string[] = [];
  let line = "";

  for (const word of words) {
    if ((line + " " + word).trim().length > maxChars) {
      if (line) lines.push(line);
      line = word;
    } else {
      line = (line + " " + word).trim();
    }
  }

  if (line) lines.push(line);
  return lines.length ? lines : ["-"];
}

async function readJsonIfExists(filePath: string) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function collectData(projectId: string) {
  const base = process.env.BUILDSETU_INTERNAL_URL || "http://127.0.0.1:3016";

  async function apiJson(endpoint: string) {
    try {
      const res = await fetch(`${base}${endpoint}`, {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      });
      if (!res.ok) return {};
      return await res.json();
    } catch {
      return {};
    }
  }

  function arr(data: any, keys: string[]) {
    if (Array.isArray(data)) return data;
    for (const key of keys) {
      if (Array.isArray(data?.[key])) return data[key];
    }
    return [];
  }

  function matchProjectId(x: any) {
    return String(x?.projectId || x?.project_id || x?.project?.id || "") === projectId;
  }

  const projectsData = await apiJson("/api/projects/list");
  const rendersData = await apiJson("/api/renders/list");
  const boqData = await apiJson("/api/boq/list");
  const bbsData = await apiJson("/api/bbs/list");
  const agreementData = await apiJson("/api/agreements/list");

  const projects = arr(projectsData, ["projects", "data", "items", "rows"]);
  const renders = arr(rendersData, ["renders", "data", "items", "rows"]);
  const boqs = arr(boqData, ["boqs", "boq", "items", "data", "rows"]);
  const bbs = arr(bbsData, ["bbs", "items", "data", "rows"]);
  const agreements = arr(agreementData, ["agreements", "data", "items", "rows"]);

  const project = projects.find((x: any) => String(x.id || x.projectId || x.project_id) === projectId) || null;

  return {
    project,
    renders: renders.filter(matchProjectId).slice(0, 6),
    boqs: boqs.filter(matchProjectId),
    bbs: bbs.filter(matchProjectId),
    agreements: agreements.filter(matchProjectId).slice(0, 3),
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const projectId = safeText(body.projectId, "");

    if (!projectId) {
      return NextResponse.json(
        { ok: false, error: "projectId is required" },
        { status: 400 }
      );
    }

    await fs.mkdir(REPORT_DIR, { recursive: true });

    const data = await collectData(projectId);
    if (!data.project) {
      return NextResponse.json(
        { ok: false, error: "Project not found" },
        { status: 404 }
      );
    }

    const pdf = await PDFDocument.create();
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

    const pageSize: [number, number] = [595.28, 841.89];
    let page = pdf.addPage(pageSize);
    let { width, height } = page.getSize();
    let y = height - 56;
    let pageNo = 1;

    const blue = rgb(0.10, 0.28, 0.70);
    const dark = rgb(0.08, 0.10, 0.16);
    const muted = rgb(0.36, 0.40, 0.48);
    const line = rgb(0.86, 0.88, 0.92);

    function watermark() {
      page.drawText("BUILDSETU AI", {
        x: 110,
        y: 360,
        size: 62,
        font: bold,
        color: rgb(0.94, 0.96, 1),
        rotate: degrees(28),
      });
    }

    function footer() {
      page.drawLine({ start: { x: 40, y: 44 }, end: { x: width - 40, y: 44 }, thickness: 0.6, color: line });
      page.drawText("BuildSetu AI | Powered by Sikhadenge | Professional draft report", {
        x: 40,
        y: 26,
        size: 8,
        font,
        color: muted,
      });
      page.drawText(`Page ${pageNo}`, {
        x: width - 76,
        y: 26,
        size: 8,
        font,
        color: muted,
      });
    }

    function header() {
      watermark();
      page.drawText("BuildSetu AI", { x: 40, y, size: 24, font: bold, color: blue });
      page.drawText("Full Project Report", { x: 40, y: y - 24, size: 12, font, color: muted });
      page.drawText("Powered by Sikhadenge", { x: width - 166, y: y - 2, size: 10, font: bold, color: dark });
      page.drawLine({ start: { x: 40, y: y - 38 }, end: { x: width - 40, y: y - 38 }, thickness: 1, color: line });
      y -= 68;
    }

    function newPage() {
      footer();
      page = pdf.addPage(pageSize);
      pageNo += 1;
      ({ width, height } = page.getSize());
      y = height - 56;
      header();
    }

    function ensure(space = 80) {
      if (y < space) newPage();
    }

    function title(text: string) {
      ensure(90);
      page.drawText(text, { x: 40, y, size: 15, font: bold, color: dark });
      y -= 22;
    }

    function row(label: string, value: unknown) {
      ensure(58);
      page.drawText(label, { x: 48, y, size: 9, font: bold, color: muted });
      const lines = wrapText(safeText(value), 68);
      for (const l of lines.slice(0, 4)) {
        page.drawText(l, { x: 190, y, size: 9, font, color: dark });
        y -= 13;
      }
      y -= 3;
    }

    function paragraph(text: unknown) {
      ensure(70);
      for (const l of wrapText(safeText(text), 92)) {
        ensure(58);
        page.drawText(l, { x: 48, y, size: 9, font, color: dark });
        y -= 13;
      }
      y -= 8;
    }

    header();

    const p: any = data.project;

    page.drawText(safeText(p.name || p.projectName || p.title, "Project Report"), {
      x: 40,
      y,
      size: 21,
      font: bold,
      color: dark,
    });
    y -= 28;

    page.drawText(`Generated: ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}`, {
      x: 40,
      y,
      size: 9,
      font,
      color: muted,
    });
    y -= 34;

    title("Project Summary");
    row("Project Type", p.projectType || p.type);
    row("House Type", p.houseType);
    row("Location", p.location);
    row("Plot Size", `${safeText(p.plotWidth)} x ${safeText(p.plotDepth)}`);
    row("Floors", p.floors);
    row("Facing", p.facing);
    row("Bedrooms", p.bedrooms);
    row("Bathrooms", p.bathrooms);
    row("Budget", p.budget ? money(p.budget) : "-");
    row("Style / Look", p.style || p.look || p.designStyle);

    title("Client Requirement / Brief");
    paragraph(p.prompt || p.brief || p.requirement || p.description || "No detailed brief saved.");

    title("Render Images");
    if (!data.renders.length) {
      paragraph("No render images found for this project.");
    } else {
      for (const r of data.renders as any[]) {
        row("Render Type", r.renderType || r.type);
        row("Room / Area", r.roomType || r.area);
        row("Status", r.status || (r.fallback ? "REVIEW_REQUIRED" : "Generated"));
        row("Image", r.imageUrl || r.url);
      }
    }

    title("BOQ / Estimate Summary");
    if (!data.boqs.length) {
      paragraph("No BOQ records found for this project.");
    } else {
      let total = 0;
      for (const item of data.boqs as any[]) {
        const amount = Number(item.amount || item.total || item.totalAmount || 0);
        if (Number.isFinite(amount)) total += amount;
      }
      row("BOQ Items", data.boqs.length);
      row("Estimated Total", money(total));
      for (const item of (data.boqs as any[]).slice(0, 12)) {
        row(safeText(item.name || item.item || item.description, "Item"), money(item.amount || item.total || item.totalAmount));
      }
    }

    title("BBS / Steel Summary");
    if (!data.bbs.length) {
      paragraph("No BBS records found for this project.");
    } else {
      let totalWeight = 0;
      for (const item of data.bbs as any[]) {
        const weight = Number(item.weight || item.totalWeight || item.totalKg || 0);
        if (Number.isFinite(weight)) totalWeight += weight;
      }
      row("BBS Items", data.bbs.length);
      row("Total Steel Weight", `${totalWeight.toLocaleString("en-IN")} kg`);
      for (const item of (data.bbs as any[]).slice(0, 12)) {
        row(safeText(item.member || item.name || item.barMark, "BBS Item"), `${safeText(item.weight || item.totalWeight || item.totalKg, "0")} kg`);
      }
    }

    title("Agreement Summary");
    if (!data.agreements.length) {
      paragraph("No agreement found for this project.");
    } else {
      const a: any = data.agreements[0];
      row("Client", a.clientName || a.clientCompany || a.ownerName);
      row("Provider", a.providerName || a.providerCompany);
      row("Project Value", a.projectValue ? money(a.projectValue) : "-");
      row("Start Date", a.startDate);
      row("Completion Date", a.completionDate || a.handoverDate);
      row("Jurisdiction", a.jurisdiction);
    }

    title("Professional Note");
    paragraph("This report is generated as a project documentation draft. BOQ, BBS, design scope, commercial terms and agreement content should be reviewed by the responsible architect, engineer, contractor, accountant or legal professional before use.");

    footer();

    const fileName = `buildsetu-project-report-${projectId}-${shortId()}.pdf`;
    const filePath = path.join(REPORT_DIR, fileName);
    const bytes = await pdf.save();
    await fs.writeFile(filePath, bytes);

    return NextResponse.json({
      ok: true,
      projectId,
      fileName,
      pdfUrl: `/generated/reports/${fileName}`,
      downloadUrl: `/api/reports/download-pdf?fileName=${encodeURIComponent(fileName)}`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Report PDF export failed" },
      { status: 500 }
    );
  }
}
