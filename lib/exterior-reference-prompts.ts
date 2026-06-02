import type { ExteriorReferenceAsset } from "@/lib/exterior-reference-store";

export const EXTERIOR_VIEW_LABELS: Record<string, string> = {
  FRONT_ELEVATION: "Front Elevation",
  FRONT_LEFT_3_4: "Front Left 3/4 View",
  FRONT_RIGHT_3_4: "Front Right 3/4 View",
  STREET_WIDE: "Street Wide View",
  LEFT_SIDE_ELEVATION: "Left Side View",
  RIGHT_SIDE_ELEVATION: "Right Side View",
  REAR_ELEVATION: "Rear View",
  DAYLIGHT_VIEW: "Daylight Clean View",
  EVENING_HERO: "Evening Hero View",
  NIGHT_VIEW: "Night View",
  GATE_FOCUS: "Gate Close-up View",
  BALCONY_FOCUS: "Balcony Close-up View",
  ENTRANCE_FOCUS: "Entrance Close-up View",
  MATERIAL_CLOSEUP: "Material Highlight View",
  WORKING_ELEVATION: "Working Elevation Presentation",
};

function refLines(refs: ExteriorReferenceAsset[]) {
  if (!refs.length) return "No external reference images provided.";

  return refs
    .map((ref, index) => {
      return `${index + 1}. ${ref.title} | role=${ref.role} | source=${ref.source} | primary=${ref.isPrimary ? "yes" : "no"} | url=${ref.fileUrl}`;
    })
    .join("\n");
}

export function buildReferenceDrivenMasterPrompt(input: {
  projectTitle?: string;
  userPrompt: string;
  references: ExteriorReferenceAsset[];
}) {
  const refs = input.references || [];
  const hasRefs = refs.length > 0;
  const primary = refs.find((ref) => ref.isPrimary) || refs.find((ref) => ref.role === "primary_facade_reference");

  return `Create ONE premium final exterior master design for this house project.

Project:
${input.projectTitle || "Exterior house project"}

User requirements:
${input.userPrompt || "Modern premium residential exterior elevation."}

Reference images:
${refLines(refs)}

Reference usage rule:
${
  hasRefs
    ? `Use the provided reference image(s) as visual direction. The primary reference is: ${primary?.title || "the primary facade reference"}.`
    : "No reference image is provided, so create a strong original master exterior concept from the project brief."
}

If references are provided:
- Use the primary facade reference as the main style/facade direction.
- Preserve the reference's overall architectural feel, massing direction, material mood, balcony/facade language and premium character.
- Adapt it to the user's project requirements.
- Do not copy logos, people, signage, watermark or unrelated background.
- Do not create a random unrelated design.

Generate:
- one final hero/master exterior concept only
- client-presentation quality
- realistic Indian residential proportions
- premium modern facade
- clear gate, boundary wall, balcony, windows, main door and lighting
- strong visual identity that can be locked as source image for future views

Important:
This image will become the LOCKED MASTER DESIGN for future views.
The facade identity must be clear, balanced, memorable and easy to preserve in next views.`;
}

export function buildReferenceDrivenViewPrompt(input: {
  viewType: string;
  viewLabel?: string;
  masterImageUrl: string;
  userPrompt?: string;
  references: ExteriorReferenceAsset[];
}) {
  const label = input.viewLabel || EXTERIOR_VIEW_LABELS[input.viewType] || input.viewType;
  const supportRefs = input.references || [];

  return `Use the LOCKED MASTER EXTERIOR IMAGE as the exact primary reference.

Locked master image:
${input.masterImageUrl}

Generate:
${label}

User instruction:
${input.userPrompt || `Generate ${label} of the same house.`}

Support reference images, if any:
${refLines(supportRefs)}

Strict preservation rules:
- Preserve the same exact house identity.
- Preserve overall house shape and massing.
- Preserve number of floors.
- Preserve facade composition.
- Preserve balcony position, size, railing style and wall frame.
- Preserve gate and boundary wall style.
- Preserve window and door placement as much as possible.
- Preserve material layout.
- Preserve white/grey/wood or selected color palette.
- Preserve lighting mood and premium exterior character.

Allowed changes:
- camera angle
- viewpoint
- perspective
- scene framing
- daylight/night mood only if requested

Forbidden:
- Do not redesign the house.
- Do not create a different facade.
- Do not add or remove major windows, balcony, floors, gate or wall.
- Do not change material family.
- Do not make four different designs.
- Do not ignore the master image.

Output must look like the same approved master house seen from the requested view: ${label}.`;
}

export function buildReferenceInstructionSummary(refs: ExteriorReferenceAsset[]) {
  if (!refs.length) {
    return "No reference image selected. Master will be generated from project brief.";
  }

  const primary = refs.find((ref) => ref.isPrimary) || refs.find((ref) => ref.role === "primary_facade_reference");

  return [
    primary ? `Primary reference: ${primary.title}` : "No primary reference marked.",
    `Total references: ${refs.length}`,
    "Reference role: used for master design direction.",
    "After master lock, locked master becomes primary source for all views.",
  ];
}
