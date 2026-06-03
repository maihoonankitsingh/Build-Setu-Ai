import { execFileSync } from "child_process";

export type BuildSetuPdfPageExtract = {
  text: string;
  pageNumber: number;
  sourcePage: number;
  pageIndex: number;
  pageRange: string;
  sourceCitation: string;
  extractionMethod: "pdftotext-layout";
};

function cleanText(value: unknown) {
  return String(value || "")
    .replace(/\r\n/g, "\n")
    .replace(/\u0000/g, "")
    .trim();
}

function extensionOf(fileName: string) {
  const idx = String(fileName || "").lastIndexOf(".");
  return idx >= 0 ? String(fileName).slice(idx).toLowerCase() : "";
}

export function isBuildSetuPdfFile(fileName: string, fileType: string) {
  const ext = extensionOf(fileName);
  const mime = String(fileType || "").toLowerCase();
  return ext === ".pdf" || mime === "application/pdf";
}

export function buildBuildSetuPdfCitation(fileName: string, pageNumber: number) {
  const name = String(fileName || "PDF document").trim() || "PDF document";
  return `${name} — page ${pageNumber}`;
}

export function extractBuildSetuPdfPages(args: {
  absPath: string;
  fileName: string;
  fileType?: string;
  maxBufferBytes?: number;
}) {
  // BUILDSETU_PDF_PAGEWISE_EXTRACTION_V1
  if (!isBuildSetuPdfFile(args.fileName, args.fileType || "")) return [];

  try {
    const stdout = execFileSync("pdftotext", ["-layout", args.absPath, "-"], {
      encoding: "utf8",
      maxBuffer: args.maxBufferBytes || 12 * 1024 * 1024,
    });

    const rawPages = String(stdout || "").split(/\f/g);
    const pages: BuildSetuPdfPageExtract[] = [];

    rawPages.forEach((raw, index) => {
      const text = cleanText(raw);
      if (!text) return;

      const pageNumber = index + 1;
      pages.push({
        text,
        pageNumber,
        sourcePage: pageNumber,
        pageIndex: index,
        pageRange: String(pageNumber),
        sourceCitation: buildBuildSetuPdfCitation(args.fileName, pageNumber),
        extractionMethod: "pdftotext-layout",
      });
    });

    return pages;
  } catch {
    return [];
  }
}

export function formatBuildSetuPdfPagesForText(pages: BuildSetuPdfPageExtract[]) {
  return pages
    .map((page) =>
      [
        `[PDF page ${page.pageNumber}]`,
        `Source citation: ${page.sourceCitation}`,
        page.text,
      ].join("\n"),
    )
    .join("\n\n");
}
