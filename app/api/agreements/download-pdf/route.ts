import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const agreementId = searchParams.get("agreementId");

    if (!agreementId) {
      return NextResponse.json(
        { ok: false, error: "agreementId is required" },
        { status: 400 },
      );
    }

    const safeId = agreementId.replace(/[^a-zA-Z0-9_-]/g, "");
    const filePath = path.join(
      process.cwd(),
      "public",
      "generated",
      "agreements",
      `${safeId}.pdf`,
    );

    const buffer = await readFile(filePath);

    return new Response(buffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="sikhadenge-agreement-${safeId}.pdf"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("AGREEMENT_PDF_DOWNLOAD_ERROR", error);

    return NextResponse.json(
      { ok: false, error: "PDF not found. Export PDF first." },
      { status: 404 },
    );
  }
}
