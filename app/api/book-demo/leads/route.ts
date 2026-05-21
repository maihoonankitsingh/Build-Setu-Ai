import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type DemoLead = {
  id: string;
  name: string;
  phone: string;
  email: string;
  company: string;
  role: string;
  projectType: string;
  requirement: string;
  source: string;
  status: "NEW";
  createdAt: string;
  userAgent?: string;
  ip?: string;
};

const DATA_DIR = path.join(process.cwd(), "data", "runtime");
const LEADS_FILE = path.join(DATA_DIR, "book-demo-leads.json");

function clean(value: unknown) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, 1000);
}

async function readLeads(): Promise<DemoLead[]> {
  try {
    const raw = await fs.readFile(LEADS_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeLeads(leads: DemoLead[]) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(LEADS_FILE, JSON.stringify(leads, null, 2), "utf8");
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));

    const lead: DemoLead = {
      id: `demo_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name: clean(body.name),
      phone: clean(body.phone),
      email: clean(body.email),
      company: clean(body.company),
      role: clean(body.role),
      projectType: clean(body.projectType),
      requirement: clean(body.requirement),
      source: clean(body.source) || "book-demo",
      status: "NEW",
      createdAt: new Date().toISOString(),
      userAgent: request.headers.get("user-agent") || undefined,
      ip:
        request.headers.get("cf-connecting-ip") ||
        request.headers.get("x-forwarded-for") ||
        undefined,
    };

    if (!lead.name || !lead.phone) {
      return NextResponse.json(
        { ok: false, error: "Name and phone are required." },
        { status: 400 }
      );
    }

    const leads = await readLeads();
    leads.unshift(lead);
    await writeLeads(leads.slice(0, 1000));

    return NextResponse.json({ ok: true, leadId: lead.id });
  } catch (error) {
    console.error("BOOK_DEMO_LEAD_ERROR", error);
    return NextResponse.json(
      { ok: false, error: "Could not save demo lead." },
      { status: 500 }
    );
  }
}
