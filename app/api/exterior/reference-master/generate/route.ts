import { NextResponse } from "next/server";
import { getExteriorReferenceContext } from "@/lib/exterior-reference-store";
import { buildReferenceDrivenMasterPrompt, buildReferenceInstructionSummary } from "@/lib/exterior-reference-prompts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function originFromReq(req: Request) {
  return new URL(req.url).origin;
}


function internalApiUrl(path: string) {
  const port = process.env.PORT || "3016";
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `http://127.0.0.1:${port}${cleanPath}`;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const projectId = String(body.projectId || "");
    const projectTitle = String(body.projectTitle || "");
    const userPrompt = String(body.prompt || body.userPrompt || "");
    const dryRun = Boolean(body.dryRun);
    const referenceAssetIds = Array.isArray(body.referenceAssetIds) ? body.referenceAssetIds.map(String) : [];

    if (!projectId) {
      return NextResponse.json({ ok: false, error: "projectId required" }, { status: 400 });
    }

    const referenceContext = await getExteriorReferenceContext(projectId, referenceAssetIds);

    const finalPrompt = buildReferenceDrivenMasterPrompt({
      projectTitle,
      userPrompt,
      references: referenceContext.references,
    });

    if (dryRun) {
      return NextResponse.json({
        ok: true,
        action: "reference_master_prompt_ready",
        dryRun: true,
        prompt: finalPrompt,
        referenceSummary: buildReferenceInstructionSummary(referenceContext.references),
        referenceContext,
        output: {
          title: "Reference Master Prompt Ready",
          summary: "Dry-run mode: image generate nahi hua. Prompt ready hai.",
          imageUrl: referenceContext.primaryImageUrl || "",
          sections: buildReferenceInstructionSummary(referenceContext.references),
          nextActions: ["Generate Master Concept", "Lock Master", "Generate Views"],
        },
      });
    }

    const res = await fetch(internalApiUrl("/api/exterior/master/generate"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId,
        projectTitle,
        prompt: finalPrompt,
        sourcePrompt: finalPrompt,
        userPrompt,
        referenceAssetIds,
        referenceImageUrls: referenceContext.referenceImageUrls,
        primaryReferenceImageUrl: referenceContext.primaryImageUrl,
        generationMode: "reference_driven_master",
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok || !data?.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: data?.error || `Master generation failed HTTP ${res.status}`,
          prompt: finalPrompt,
          referenceContext,
        },
        { status: res.status || 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      action: "reference_master_generated",
      prompt: finalPrompt,
      referenceContext,
      ...data,
      output: {
        ...(data.output || {}),
        title: data.output?.title || "Reference Master Generated",
        summary: data.output?.summary || "Reference ke basis par master exterior concept generate ho gaya.",
        referenceSummary: buildReferenceInstructionSummary(referenceContext.references),
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || "Reference master generation failed" },
      { status: 500 }
    );
  }
}
