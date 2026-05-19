import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

function safeString(value: unknown, fallback = "") {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : fallback;
}

function parseStructuredJson(value?: string | null) {
  if (!value) return null;

  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function formatMoney(value: number) {
  return `₹${value.toLocaleString("en-IN")}`;
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

    const providerName = safeString(body.providerName, "Sikhadenge Design Partner");
    const providerCompany = safeString(body.providerCompany, "Sikhadenge Build");
    const providerGst = safeString(body.providerGst, "GSTIN to be updated");
    const providerAddress = safeString(body.providerAddress, "Company address to be updated");
    const providerEmail = safeString(body.providerEmail, "support@sikhadenge.in");
    const providerPhone = safeString(body.providerPhone, "Phone to be updated");

    const clientName = safeString(body.clientName, "Client Name");
    const clientCompany = safeString(body.clientCompany, "Client / Owner");
    const clientGst = safeString(body.clientGst, "Not provided");
    const clientAddress = safeString(body.clientAddress, project.location || "Client address to be updated");
    const clientEmail = safeString(body.clientEmail, "Client email to be updated");
    const clientPhone = safeString(body.clientPhone, "Client phone to be updated");

    const startDate = safeString(body.startDate, "To be finalized");
    const completionDate = safeString(body.completionDate, "As per mutually agreed timeline");
    const jurisdiction = safeString(body.jurisdiction, "Raipur, Chhattisgarh");
    const projectValue = safeString(body.projectValue, project.budget || String(structured?.budget || "To be finalized"));

    const projectType = project.projectType || String(structured?.projectType || "Design Project");
    const plotSize = project.plotSize || String(structured?.plotSize || "as per client brief");
    const floors = project.floors || String(structured?.floors || "as per scope");
    const facing = project.facing || String(structured?.facing || "as per site");
    const budget = project.budget || String(structured?.budget || projectValue);

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

    const partyDetails = [
      "1. PARTIES TO THIS AGREEMENT",
      "",
      "This agreement is entered between:",
      "",
      "A. SERVICE PROVIDER / DESIGN CONSULTANT",
      `Name: ${providerName}`,
      `Company / Firm: ${providerCompany}`,
      `GSTIN: ${providerGst}`,
      `Address: ${providerAddress}`,
      `Email: ${providerEmail}`,
      `Phone: ${providerPhone}`,
      "",
      "B. CLIENT / PROJECT OWNER",
      `Name: ${clientName}`,
      `Company / Owner Name: ${clientCompany}`,
      `GSTIN: ${clientGst}`,
      `Address: ${clientAddress}`,
      `Email: ${clientEmail}`,
      `Phone: ${clientPhone}`,
    ].join("\n");

    const projectDetails = [
      "2. PROJECT DETAILS",
      "",
      `Project Name: ${project.title}`,
      `Project Type: ${projectType}`,
      `Location: ${project.location || "To be updated"}`,
      `Plot / Area: ${plotSize}`,
      `Facing: ${facing}`,
      `Floors: ${floors}`,
      `Estimated Project / Design Value: ${projectValue}`,
      `Budget Range: ${budget}`,
      `Start Date: ${startDate}`,
      `Expected Completion / Handover: ${completionDate}`,
    ].join("\n");

    const scope =
      safeString(body.scope) ||
      [
        partyDetails,
        "",
        projectDetails,
        "",
        "3. SCOPE OF WORK",
        "",
        "The Service Provider will provide AI-assisted architecture, interior design and construction documentation support for the above project. Scope may include the following based on selected package and client inputs:",
        "",
        "a. Client requirement analysis and structured design brief.",
        "b. Floor plan / layout concept preparation.",
        "c. Interior design concept / room-wise design direction.",
        "d. Exterior elevation / facade concept direction.",
        "e. Render prompt preparation and AI preview generation.",
        "f. BOQ / estimate draft for material and cost planning.",
        "g. BBS / steel quantity draft where structural scope is required.",
        "h. Client proposal / agreement / presentation documentation.",
        "i. Contractor package support where required.",
        "",
        "Any work not specifically mentioned in this agreement will be treated as additional scope and may require separate commercial approval.",
      ].join("\n");

    const deliverables =
      safeString(body.deliverables) ||
      [
        "4. DELIVERABLES",
        "",
        "Subject to package selection and available project inputs, deliverables may include:",
        "",
        "1. Structured client brief.",
        "2. Floor plan concept direction.",
        "3. Space planning notes.",
        "4. Interior render preview or render prompt.",
        "5. Exterior elevation preview or prompt.",
        "6. Draft BOQ / estimate sheet.",
        "7. Draft BBS / steel summary where applicable.",
        "8. Client-ready project summary.",
        "9. Revision notes and final selected design direction.",
        "10. PDF / presentation package if selected.",
        "",
        "Deliverables are draft/design-stage documents unless explicitly approved and stamped by the relevant licensed professional.",
      ].join("\n");

    const paymentTerms =
      safeString(body.paymentTerms) ||
      [
        "5. COMMERCIALS AND PAYMENT TERMS",
        "",
        `Estimated Project / Design Value: ${projectValue}`,
        totalBoqAmount > 0
          ? `AI BOQ Draft Value: ${formatMoney(totalBoqAmount)} subject to site verification and final drawings.`
          : "AI BOQ draft value: Not generated / to be finalized after project inputs.",
        "",
        "Suggested payment milestone:",
        "a. Booking / project initiation: 40%",
        "b. Concept design submission: 30%",
        "c. Final draft / documentation stage: 20%",
        "d. Revision closure / handover: 10%",
        "",
        "Payment terms:",
        "1. Work will begin after advance payment confirmation.",
        "2. Final files may be withheld until agreed payments are cleared.",
        "3. Government fees, consultant fees, site visits, travel, print, material samples, legal approvals and third-party charges are excluded unless mentioned separately.",
        "4. GST / applicable taxes will be charged as per law if applicable.",
      ].join("\n");

    const revisionTerms =
      safeString(body.revisionTerms) ||
      [
        "6. TIMELINE, REVISION AND CLIENT RESPONSIBILITY",
        "",
        `Project Start Date: ${startDate}`,
        `Expected Completion / Handover: ${completionDate}`,
        "",
        "Revision policy:",
        "1. Two minor revisions are included after first concept submission.",
        "2. Minor revisions include small changes in layout, color, material preference or room arrangement.",
        "3. Major revisions include plot size change, floor count change, structural change, design style change, room count change, or complete rework. Major revisions will be charged separately.",
        "4. Delay in client feedback, payment, site measurement, reference sharing or approval will extend the timeline.",
        "",
        "Client responsibility:",
        "1. Client must provide correct site dimensions, photos, location, facing, requirements and budget.",
        "2. Client must verify all dimensions and site conditions before execution.",
        "3. Client must confirm vastu, local bye-laws, approval requirements and construction constraints before final execution.",
        "4. Client must not start construction only on AI draft output.",
      ].join("\n");

    const disclaimer =
      safeString(body.disclaimer) ||
      [
        "7. TERMS, CONDITIONS AND DISCLAIMER",
        "",
        "Professional review:",
        "1. AI-generated outputs are concept and planning drafts.",
        "2. Structural drawings, RCC details, BBS, MEP, electrical, plumbing, fire safety, sanction drawings and legal compliance must be reviewed and approved by qualified/licensed professionals.",
        totalBbsWeight > 0
          ? `3. AI BBS draft steel weight: ${totalBbsWeight.toLocaleString("en-IN", { maximumFractionDigits: 2 })} kg, subject to structural engineer approval.`
          : "3. BBS / structural quantity is not final until approved structural drawings are available.",
        "",
        "Usage rights:",
        "4. The client may use final approved deliverables for the mentioned project only after payment clearance.",
        "5. The Service Provider may use non-confidential design visuals for portfolio/marketing unless the client requests written confidentiality.",
        "",
        "Execution responsibility:",
        "6. Contractor execution, site safety, material quality, labour quality and supervision are separate responsibilities unless explicitly included in the scope.",
        "7. Any cost estimate / BOQ is indicative and subject to market rate, site condition, specification and final drawings.",
        "",
        "Cancellation:",
        "8. Advance payment may be non-refundable after project work has started.",
        "9. If the project is paused for more than 30 days due to client-side delay, revised timeline and cost may apply.",
        "",
        "Dispute and jurisdiction:",
        `10. Any dispute will first be resolved mutually in writing. If unresolved, jurisdiction will be ${jurisdiction}.`,
        "",
        "Acceptance:",
        "11. By approving this agreement or making the first payment, both parties accept the scope, payment terms, revision policy and disclaimers mentioned above.",
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
          providerName,
          providerCompany,
          providerGst,
          clientName,
          clientCompany,
          clientGst,
          projectValue,
          startDate,
          completionDate,
          jurisdiction,
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
