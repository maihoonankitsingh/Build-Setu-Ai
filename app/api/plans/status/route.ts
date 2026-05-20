import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DATA_DIR = path.join(process.cwd(), "data", "generated");
const DATA_FILE = path.join(DATA_DIR, "plan-subscriptions.json");
const DEMO_EMAIL = "demo@buildsetu.ai";

type PlanStatus = {
  userEmail: string;
  planId: string;
  planName: string;
  interval: "monthly" | "yearly";
  amount: number;
  credits: number;
  status: "ACTIVE";
  paymentId: string;
  orderId: string;
  startedAt: string;
  renewsAt: string;
};

async function readAll(): Promise<PlanStatus[]> {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf8");
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export async function GET() {
  const all = await readAll();
  const current = all.find((item) => item.userEmail === DEMO_EMAIL && item.status === "ACTIVE") || null;

  return NextResponse.json({
    ok: true,
    plan: current,
  });
}
