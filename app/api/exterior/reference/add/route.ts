import { NextResponse } from "next/server";
import { addExteriorReference } from "@/lib/exterior-reference-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const projectId = String(body.projectId || "");
    const fileUrl = String(body.fileUrl || body.url || "");

    if (!projectId) {
      return NextResponse.json({ ok: false, error: "projectId required" }, { status: 400 });
    }

    if (!fileUrl) {
      return NextResponse.json({ ok: false, error: "fileUrl required" }, { status: 400 });
    }

    const reference = await addExteriorReference({
      projectId,
      title: String(body.title || "Exterior Reference"),
      source: String(body.source || "manual_url"),
      role: String(body.role || "primary_facade_reference"),
      fileUrl,
      file: String(body.file || ""),
      isPrimary: Boolean(body.isPrimary ?? true),
      notes: String(body.notes || ""),
    });

    return NextResponse.json({
      ok: true,
      action: "exterior_reference_added",
      reference,
      output: {
        title: "Reference Added",
        summary: `${reference.title} project reference me save ho gaya hai.`,
        imageUrl: reference.fileUrl,
        sections: [
          `Role: ${reference.role}`,
          `Source: ${reference.source}`,
          reference.isPrimary ? "Primary facade reference: yes" : "Primary facade reference: no",
        ],
        nextActions: ["Generate reference-based master concept", "Add more references"],
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || "Reference add failed" },
      { status: 500 }
    );
  }
}
