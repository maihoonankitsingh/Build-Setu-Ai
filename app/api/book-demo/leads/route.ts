import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function clean(value: unknown, max = 1000) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));

    const name = clean(body.name, 160);
    const phone = clean(body.phone, 40);

    if (!name || !phone) {
      return NextResponse.json(
        { ok: false, error: "Name and phone are required." },
        { status: 400 }
      );
    }

    const lead = await prisma.bookDemoLead.create({
      data: {
        name,
        phone,
        email: clean(body.email, 180),
        company: clean(body.company, 180),
        role: clean(body.role, 120),
        projectType: clean(body.projectType, 180),
        requirement: clean(body.requirement, 1200),
        source: clean(body.source, 80) || "book-demo",
        status: "NEW",
        userAgent: request.headers.get("user-agent") || "",
        ipAddress:
          request.headers.get("cf-connecting-ip") ||
          request.headers.get("x-forwarded-for") ||
          "",
      },
    });

    return NextResponse.json({ ok: true, leadId: lead.id });
  } catch (error) {
    console.error("BOOK_DEMO_LEAD_ERROR", error);
    return NextResponse.json(
      { ok: false, error: "Could not save demo lead." },
      { status: 500 }
    );
  }
}
