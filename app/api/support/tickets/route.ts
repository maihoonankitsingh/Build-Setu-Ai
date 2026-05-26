import { mkdir, readFile, writeFile } from "fs/promises";
import { dirname, join } from "path";
import { NextResponse } from "next/server";

type SupportTicket = {
  id: string;
  type: string;
  priority: string;
  area: string;
  subject: string;
  details: string;
  contact: string;
  status: string;
  createdAt: string;
};

const TICKETS_FILE = join(process.cwd(), "data/generated/support-tickets.json");

async function readTickets(): Promise<SupportTicket[]> {
  try {
    const raw = await readFile(TICKETS_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeTickets(tickets: SupportTicket[]) {
  await mkdir(dirname(TICKETS_FILE), { recursive: true });
  await writeFile(TICKETS_FILE, JSON.stringify(tickets, null, 2), "utf-8");
}

function cleanString(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

export async function GET() {
  const tickets = await readTickets();
  return NextResponse.json({ ok: true, tickets });
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
    }

    const subject = cleanString((body as any).subject);
    const details = cleanString((body as any).details);

    if (!subject || !details) {
      return NextResponse.json({ ok: false, error: "Subject and details are required" }, { status: 400 });
    }

    const ticket: SupportTicket = {
      id: `SUP-${Date.now()}`,
      type: cleanString((body as any).type, "General Support"),
      priority: cleanString((body as any).priority, "Medium"),
      area: cleanString((body as any).area, "Workspace"),
      subject,
      details,
      contact: cleanString((body as any).contact),
      status: "Open",
      createdAt: new Date().toISOString(),
    };

    const tickets = await readTickets();
    const nextTickets = [ticket, ...tickets].slice(0, 200);
    await writeTickets(nextTickets);

    return NextResponse.json({ ok: true, ticket, tickets: nextTickets });
  } catch (error) {
    console.error("SUPPORT_TICKET_SAVE_ERROR", error);
    return NextResponse.json({ ok: false, error: "Failed to save support ticket" }, { status: 500 });
  }
}
