import { mkdir, readFile, writeFile } from "fs/promises";
import { dirname, join } from "path";
import { NextResponse } from "next/server";

const SETTINGS_FILE = join(process.cwd(), "data/generated/workspace-settings.json");

const defaultSettings = {
  companyName: "BuildSetu AI",
  city: "Raipur",
  quality: "Standard",
  currency: "INR",
  coverageRatio: "78",
  steelFactor: "3.8",
  contingency: "5",
  gst: "18",
  rateSource: "BuildSetu Internal Starter Rate Library",
  approvalGate: "AI Final Draft - Engineer Review Required",
};

type WorkspaceSettings = typeof defaultSettings;

async function readSettings(): Promise<WorkspaceSettings> {
  try {
    const raw = await readFile(SETTINGS_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    return { ...defaultSettings, ...(parsed || {}) };
  } catch {
    return defaultSettings;
  }
}

async function writeSettings(settings: WorkspaceSettings) {
  await mkdir(dirname(SETTINGS_FILE), { recursive: true });
  await writeFile(SETTINGS_FILE, JSON.stringify(settings, null, 2), "utf-8");
}

function cleanString(value: unknown, fallback: string) {
  return typeof value === "string" ? value.trim() || fallback : fallback;
}

export async function GET() {
  const settings = await readSettings();
  return NextResponse.json({ ok: true, settings, defaultSettings });
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
    }

    const settings: WorkspaceSettings = {
      companyName: cleanString((body as any).companyName, defaultSettings.companyName),
      city: cleanString((body as any).city, defaultSettings.city),
      quality: cleanString((body as any).quality, defaultSettings.quality),
      currency: cleanString((body as any).currency, defaultSettings.currency),
      coverageRatio: cleanString((body as any).coverageRatio, defaultSettings.coverageRatio),
      steelFactor: cleanString((body as any).steelFactor, defaultSettings.steelFactor),
      contingency: cleanString((body as any).contingency, defaultSettings.contingency),
      gst: cleanString((body as any).gst, defaultSettings.gst),
      rateSource: cleanString((body as any).rateSource, defaultSettings.rateSource),
      approvalGate: cleanString((body as any).approvalGate, defaultSettings.approvalGate),
    };

    await writeSettings(settings);

    return NextResponse.json({ ok: true, settings, defaultSettings });
  } catch (error) {
    console.error("WORKSPACE_SETTINGS_SAVE_ERROR", error);
    return NextResponse.json({ ok: false, error: "Failed to save workspace settings" }, { status: 500 });
  }
}
