import { execFileSync } from "child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "fs";
import { tmpdir } from "os";
import path from "path";

export type BuildSetuPdfPageExtract = {
  text: string;
  pageNumber: number;
  sourcePage: number;
  pageIndex: number;
  pageRange: string;
  sourceCitation: string;
  extractionMethod: "pdftotext-layout" | "tesseract-ocr";
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

function runBuildSetuPdfCommand(command: string, args: string[], timeout = 45000) {
  try {
    return execFileSync(command, args, {
      encoding: "utf8",
      timeout,
      maxBuffer: 16 * 1024 * 1024,
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch {
    return "";
  }
}

function getBuildSetuPdfPageCount(absPath: string) {
  const out = runBuildSetuPdfCommand("pdfinfo", [absPath], 15000);
  const match = out.match(/Pages:\s*(\d+)/i);
  const pages = match ? Number(match[1]) : 0;
  return Number.isFinite(pages) && pages > 0 ? Math.min(pages, 40) : 0;
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

function extractBuildSetuPdfTextPages(args: {
  absPath: string;
  fileName: string;
  maxBufferBytes?: number;
}) {
  try {
    const stdout = execFileSync("pdftotext", ["-layout", args.absPath, "-"], {
      encoding: "utf8",
      maxBuffer: args.maxBufferBytes || 12 * 1024 * 1024,
      timeout: 45000,
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

function ocrBuildSetuPdfPage(absPath: string, fileName: string, pageNumber: number) {
  // BUILDSETU_SCANNED_PDF_OCR_V1
  const workDir = mkdtempSync(path.join(tmpdir(), "buildsetu-pdf-ocr-"));

  try {
    const imagePath = path.join(workDir, `page-${pageNumber}.png`);
    const textBase = path.join(workDir, `page-${pageNumber}`);
    const textPath = `${textBase}.txt`;

    runBuildSetuPdfCommand(
      "gs",
      [
        "-q",
        "-dSAFER",
        "-dBATCH",
        "-dNOPAUSE",
        "-sDEVICE=pnggray",
        "-r220",
        `-dFirstPage=${pageNumber}`,
        `-dLastPage=${pageNumber}`,
        `-sOutputFile=${imagePath}`,
        absPath,
      ],
      60000,
    );

    if (!existsSync(imagePath)) return null;

    runBuildSetuPdfCommand(
      "tesseract",
      [imagePath, textBase, "-l", "eng", "--psm", "6"],
      60000,
    );

    if (!existsSync(textPath)) return null;

    const text = cleanText(readFileSync(textPath, "utf8"));
    if (!text) return null;

    return {
      text,
      pageNumber,
      sourcePage: pageNumber,
      pageIndex: pageNumber - 1,
      pageRange: String(pageNumber),
      sourceCitation: buildBuildSetuPdfCitation(fileName, pageNumber),
      extractionMethod: "tesseract-ocr" as const,
    };
  } catch {
    return null;
  } finally {
    try {
      rmSync(workDir, { recursive: true, force: true });
    } catch {
      // ignore cleanup failure
    }
  }
}

function extractBuildSetuScannedPdfOcrPages(args: {
  absPath: string;
  fileName: string;
}) {
  const pageCount = getBuildSetuPdfPageCount(args.absPath);
  if (!pageCount) return [];

  const pages: BuildSetuPdfPageExtract[] = [];

  for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
    const page = ocrBuildSetuPdfPage(args.absPath, args.fileName, pageNumber);
    if (page) pages.push(page);
  }

  return pages;
}

export function extractBuildSetuPdfPages(args: {
  absPath: string;
  fileName: string;
  fileType?: string;
  maxBufferBytes?: number;
}) {
  // BUILDSETU_PDF_PAGEWISE_EXTRACTION_V1
  if (!isBuildSetuPdfFile(args.fileName, args.fileType || "")) return [];

  const textPages = extractBuildSetuPdfTextPages({
    absPath: args.absPath,
    fileName: args.fileName,
    maxBufferBytes: args.maxBufferBytes,
  });

  if (textPages.length) return textPages;

  return extractBuildSetuScannedPdfOcrPages({
    absPath: args.absPath,
    fileName: args.fileName,
  });
}

export function formatBuildSetuPdfPagesForText(pages: BuildSetuPdfPageExtract[]) {
  return pages
    .map((page) =>
      [
        `[PDF page ${page.pageNumber}]`,
        `Source citation: ${page.sourceCitation}`,
        `Extraction method: ${page.extractionMethod}`,
        page.text,
      ].join("\n"),
    )
    .join("\n\n");
}
