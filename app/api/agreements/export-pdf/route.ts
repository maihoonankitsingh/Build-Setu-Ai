import { NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import {
  PDFDocument,
  StandardFonts,
  rgb,
  degrees,
  type PDFFont,
  type PDFPage,
} from "pdf-lib";
import { prisma } from "@/lib/db";

function safeString(value: unknown) {
  if (typeof value !== "string") return "";
  return value.trim();
}

function cleanPdfText(value?: string | null) {
  return (value || "-")
    .replace(/₹/g, "Rs. ")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\t/g, "  ");
}

function wrapText(text: string, font: PDFFont, fontSize: number, maxWidth: number) {
  const lines: string[] = [];

  for (const rawLine of text.split("\n")) {
    const words = rawLine.split(/\s+/).filter(Boolean);

    if (!words.length) {
      lines.push("");
      continue;
    }

    let line = "";

    for (const word of words) {
      const testLine = line ? `${line} ${word}` : word;
      const width = font.widthOfTextAtSize(testLine, fontSize);

      if (width <= maxWidth) {
        line = testLine;
      } else {
        if (line) lines.push(line);
        line = word;
      }
    }

    if (line) lines.push(line);
  }

  return lines;
}

async function getAgreement(agreementId: string) {
  return prisma.clientAgreement.findUnique({
    where: { id: agreementId },
    include: {
      project: {
        select: {
          id: true,
          title: true,
          projectType: true,
          location: true,
          plotSize: true,
          facing: true,
          floors: true,
          budget: true,
        },
      },
    },
  });
}

async function createAgreementPdf(
  agreement: NonNullable<Awaited<ReturnType<typeof getAgreement>>>,
) {
  const pdfDoc = await PDFDocument.create();

  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontItalic = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const margin = 42;
  const contentWidth = pageWidth - margin * 2;

  let page: PDFPage = pdfDoc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  function drawFooter(currentPage: PDFPage, pageIndex?: number, totalPages?: number) {
    currentPage.drawText("BUILDSETU AI", {
      x: 95,
      y: 382,
      size: 50,
      font: fontBold,
      color: rgb(0.82, 0.76, 0.92),
      opacity: 0.15,
      rotate: degrees(35),
    });

    currentPage.drawLine({
      start: { x: margin, y: 44 },
      end: { x: pageWidth - margin, y: 44 },
      thickness: 0.7,
      color: rgb(0.86, 0.82, 0.92),
    });

    currentPage.drawText("BuildSetu AI | Powered by Sikhadenge | Professional draft subject to legal/professional review", {
      x: margin,
      y: 27,
      size: 7.2,
      font: fontRegular,
      color: rgb(0.42, 0.36, 0.52),
    });

    if (pageIndex && totalPages) {
      currentPage.drawText(`Page ${pageIndex} of ${totalPages}`, {
        x: pageWidth - margin - 62,
        y: 27,
        size: 7.2,
        font: fontRegular,
        color: rgb(0.42, 0.36, 0.52),
      });
    }
  }

  function newPage() {
    drawFooter(page);
    page = pdfDoc.addPage([pageWidth, pageHeight]);
    y = pageHeight - margin;
  }

  function ensureSpace(height: number) {
    if (y - height < 62) {
      newPage();
    }
  }

  function drawWrappedText(text: string, size = 9.2, font = fontRegular, lineHeight = 13.2, color = rgb(0.25, 0.19, 0.36)) {
    const lines = wrapText(cleanPdfText(text), font, size, contentWidth);

    for (const line of lines) {
      ensureSpace(lineHeight);
      page.drawText(line || " ", {
        x: margin,
        y,
        size,
        font,
        color,
      });
      y -= lineHeight;
    }
  }

  function addSection(title: string, content?: string | null) {
    ensureSpace(48);

    y -= 8;

    page.drawRectangle({
      x: margin,
      y: y - 5,
      width: contentWidth,
      height: 21,
      color: rgb(0.96, 0.93, 1),
      borderColor: rgb(0.86, 0.82, 0.92),
      borderWidth: 0.5,
    });

    page.drawText(title, {
      x: margin + 10,
      y,
      size: 11.2,
      font: fontBold,
      color: rgb(0.13, 0.08, 0.25),
    });

    y -= 23;
    drawWrappedText(content || "-", 9.0, fontRegular, 13.1);
    y -= 5;
  }

  // Top brand header
  page.drawRectangle({
    x: 0,
    y: pageHeight - 98,
    width: pageWidth,
    height: 98,
    color: rgb(0.98, 0.96, 1),
  });

  page.drawText("BuildSetu AI", {
    x: margin,
    y: pageHeight - 48,
    size: 22,
    font: fontBold,
    color: rgb(0.49, 0.23, 0.93),
  });

  page.drawText("Powered by Sikhadenge", {
    x: margin,
    y: pageHeight - 64,
    size: 8.5,
    font: fontRegular,
    color: rgb(0.42, 0.36, 0.52),
  });

  page.drawText("Professional Client Agreement", {
    x: pageWidth - margin - 235,
    y: pageHeight - 48,
    size: 17,
    font: fontBold,
    color: rgb(0.08, 0.04, 0.18),
  });

  page.drawText("Architecture | Interior | BOQ | BBS | Documentation", {
    x: pageWidth - margin - 235,
    y: pageHeight - 64,
    size: 8.5,
    font: fontRegular,
    color: rgb(0.42, 0.36, 0.52),
  });

  y = pageHeight - 128;

  // Agreement title card
  page.drawRectangle({
    x: margin,
    y: y - 76,
    width: contentWidth,
    height: 76,
    color: rgb(1, 1, 1),
    borderColor: rgb(0.86, 0.82, 0.92),
    borderWidth: 0.7,
  });

  page.drawText(cleanPdfText(agreement.title), {
    x: margin + 14,
    y: y - 22,
    size: 13.2,
    font: fontBold,
    color: rgb(0.13, 0.08, 0.25),
  });

  page.drawText(`Document ID: ${agreement.id}`, {
    x: margin + 14,
    y: y - 40,
    size: 8,
    font: fontRegular,
    color: rgb(0.42, 0.36, 0.52),
  });

  page.drawText(`Generated: ${new Date().toLocaleDateString("en-IN")}`, {
    x: pageWidth - margin - 145,
    y: y - 40,
    size: 8,
    font: fontRegular,
    color: rgb(0.42, 0.36, 0.52),
  });

  page.drawText("Status: Draft Agreement", {
    x: margin + 14,
    y: y - 58,
    size: 8,
    font: fontItalic,
    color: rgb(0.42, 0.36, 0.52),
  });

  y -= 102;

  // Project summary grid
  const meta = [
    ["Project", agreement.project?.title || "-"],
    ["Type", agreement.project?.projectType || "-"],
    ["Location", agreement.project?.location || "-"],
    ["Plot", agreement.project?.plotSize || "-"],
    ["Facing", agreement.project?.facing || "-"],
    ["Floors", agreement.project?.floors || "-"],
    ["Budget", agreement.project?.budget || "-"],
    ["Agreement", agreement.status || "-"],
  ];

  const cellW = contentWidth / 2;
  const cellH = 24;

  ensureSpace(cellH * 4 + 20);

  for (let i = 0; i < meta.length; i++) {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = margin + col * cellW;
    const cellY = y - row * cellH;

    page.drawRectangle({
      x,
      y: cellY - 18,
      width: cellW,
      height: cellH,
      color: i % 4 < 2 ? rgb(0.985, 0.975, 1) : rgb(1, 1, 1),
      borderColor: rgb(0.90, 0.87, 0.94),
      borderWidth: 0.35,
    });

    page.drawText(meta[i][0], {
      x: x + 8,
      y: cellY - 7,
      size: 7.3,
      font: fontBold,
      color: rgb(0.42, 0.36, 0.52),
    });

    page.drawText(cleanPdfText(meta[i][1]).slice(0, 46), {
      x: x + 72,
      y: cellY - 7,
      size: 7.3,
      font: fontRegular,
      color: rgb(0.13, 0.08, 0.25),
    });
  }

  y -= cellH * 4 + 12;

  addSection("1. Party Details, Project Details and Scope of Work", agreement.scope);
  addSection("2. Deliverables", agreement.deliverables);
  addSection("3. Commercials and Payment Terms", agreement.paymentTerms);
  addSection("4. Timeline, Revision Policy and Client Responsibility", agreement.revisionTerms);
  addSection("5. Terms, Conditions and Professional Disclaimer", agreement.disclaimer);

  ensureSpace(110);
  y -= 10;

  page.drawText("Acceptance and Signatures", {
    x: margin,
    y,
    size: 12,
    font: fontBold,
    color: rgb(0.13, 0.08, 0.25),
  });

  y -= 20;

  page.drawText("Both parties confirm that they have read and understood this draft agreement.", {
    x: margin,
    y,
    size: 8.5,
    font: fontRegular,
    color: rgb(0.25, 0.19, 0.36),
  });

  y -= 52;

  page.drawLine({
    start: { x: margin, y },
    end: { x: margin + 205, y },
    thickness: 1,
    color: rgb(0.78, 0.72, 0.85),
  });

  page.drawLine({
    start: { x: pageWidth - margin - 205, y },
    end: { x: pageWidth - margin, y },
    thickness: 1,
    color: rgb(0.78, 0.72, 0.85),
  });

  y -= 14;

  page.drawText("Service Provider Signature", {
    x: margin,
    y,
    size: 8.5,
    font: fontRegular,
    color: rgb(0.36, 0.31, 0.47),
  });

  page.drawText("Client Signature", {
    x: pageWidth - margin - 205,
    y,
    size: 8.5,
    font: fontRegular,
    color: rgb(0.36, 0.31, 0.47),
  });

  const pages = pdfDoc.getPages();
  pages.forEach((pdfPage, index) => drawFooter(pdfPage, index + 1, pages.length));

  return Buffer.from(await pdfDoc.save());
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

    const agreementId = safeString(body.agreementId);

    if (!agreementId) {
      return NextResponse.json(
        { ok: false, error: "agreementId is required" },
        { status: 400 },
      );
    }

    const agreement = await getAgreement(agreementId);

    if (!agreement) {
      return NextResponse.json(
        { ok: false, error: "Agreement not found" },
        { status: 404 },
      );
    }

    const outputDir = path.join(process.cwd(), "public", "generated", "agreements");
    await mkdir(outputDir, { recursive: true });

    const fileName = `${agreement.id}.pdf`;
    const filePath = path.join(outputDir, fileName);
    const pdfBuffer = await createAgreementPdf(agreement);

    await writeFile(filePath, pdfBuffer);

    const pdfUrl = `/generated/agreements/${fileName}`;
    const downloadUrl = `/api/agreements/download-pdf?agreementId=${agreement.id}`;

    return NextResponse.json({
      ok: true,
      pdfUrl,
      downloadUrl,
      fileName,
      agreementId: agreement.id,
    });
  } catch (error) {
    console.error("AGREEMENT_PDF_EXPORT_ERROR", error);

    const message = error instanceof Error ? error.message : "Failed to export agreement PDF";

    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 },
    );
  }
}
