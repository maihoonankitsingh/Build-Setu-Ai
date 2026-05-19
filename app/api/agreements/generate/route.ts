import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

function safeString(value: unknown) {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
}

function parseStructuredJson(value?: string | null) {
  if (!value) return null;

  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { ok: false, error: "Invalid JSON body" },
        { status: 400 },
      );
    }

    const projectId = safeString(body.projectId);

    if (!projectId) {
      return NextResponse.json(
        { ok: false, error: "projectId is required" },
        { status: 400 },
      );
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        brief: true,
        boqItems: true,
        bbsItems: true,
        renders: {
          orderBy: {
            createdAt: "desc",
          },
          take: 5,
        },
      },
    });

    if (!project) {
      return NextResponse.json(
        { ok: false, error: "Project not found" },
        { status: 404 },
      );
    }

    const structured = parseStructuredJson(project.brief?.structuredJson);
    const projectType = project.projectType || String(structured?.projectType || "Design Project");
    const plotSize = project.plotSize || String(structured?.plotSize || "as per client brief");
    const floors = project.floors || String(structured?.floors || "as per scope");
    const budget = project.budget || String(structured?.budget || "to be finalized");

    const totalBoqAmount = project.boqItems.reduce(
      (sum, item) => sum + Number(item.amount || 0),
      0,
    );

    const totalBbsWeight = project.bbsItems.reduce(
      (sum, item) => sum + Number(item.totalWeight || 0),
      0,
    );

    const title =
      safeString(body.title) ||
      `Client Agreement - ${project.title}`;

    const scope =
      safeString(body.scope) ||
      [
        `Project: ${project.title}`,
        `Type: ${projectType}`,
        `Location: ${project.location || "as per client input"}`,
        `Plot / Area: ${plotSize}`,
        `Floors: ${floors}`,
        `Budget Range: ${budget}`,
        "Scope includes AI-assisted concept planning, design brief preparation, render prompt development, BOQ draft, BBS draft and client-ready documentation support.",
      ].join("\n");

    const deliverables =
      safeString(body.deliverables) ||
      [
        "1. Structured client brief based on provided requirements.",
        "2. Floor plan / layout concept direction.",
        "3. Interior or exterior render preview / prompt output.",
        "4. Draft BOQ / estimate for planning discussion.",
        "5. Draft BBS summary if structural scope is required.",
        "6. Client-ready summary document / proposal draft.",
        "7. Revision notes based on agreed scope.",
      ].join("\n");

    const paymentTerms =
      safeString(body.paymentTerms) ||
      [
        "Booking / project start: 40%",
        "Concept approval stage: 30%",
        "Final draft / document handover: 20%",
        "Revision closure / final files: 10%",
        totalBoqAmount > 0
          ? `Current AI BOQ draft value: ₹${totalBoqAmount.toLocaleString("en-IN")} subject to site verification.`
          : "Final commercial estimate will be confirmed after drawing and site verification.",
      ].join("\n");

    const revisionTerms =
      safeString(body.revisionTerms) ||
      [
        "Two minor revisions are included in the initial agreed scope.",
        "Major layout changes, structural changes, material changes or scope expansion will be treated as additional work.",
        "All revision requests should be shared in written format with clear reference notes.",
      ].join("\n");

    const disclaimer =
      safeString(body.disclaimer) ||
      [
        "AI-generated outputs are planning drafts and must be reviewed by qualified professionals before execution.",
        "Structural drawings, BBS, RCC details, electrical, plumbing, MEP, safety and legal compliance must be verified by licensed professionals.",
        totalBbsWeight > 0
          ? `Current AI BBS draft steel weight: ${totalBbsWeight.toLocaleString("en-IN", { maximumFractionDigits: 2 })} kg, subject to structural engineer approval.`
          : "BBS / structural quantity is not final until approved structural drawings are available.",
        "Final construction should not start only on the basis of AI draft outputs.",
      ].join("\n");

    const agreement = await prisma.clientAgreement.create({
      data: {
        projectId,
        title,
        scope,
        deliverables,
        paymentTerms,
        revisionTerms,
        disclaimer,
        status: "Draft",
      },
    });

    await prisma.toolRun.create({
      data: {
        projectId,
        toolType: "CLIENT_AGREEMENT",
        inputJson: JSON.stringify({
          projectId,
          projectTitle: project.title,
        }),
        outputJson: JSON.stringify({
          agreementId: agreement.id,
          title: agreement.title,
          status: agreement.status,
        }),
        creditsUsed: 1,
        status: "COMPLETED",
      },
    });

    return NextResponse.json({
      ok: true,
      agreement,
    });
  } catch (error) {
    console.error("AGREEMENT_GENERATE_ERROR", error);

    return NextResponse.json(
      { ok: false, error: "Failed to generate client agreement" },
      { status: 500 },
    );
  }
}
