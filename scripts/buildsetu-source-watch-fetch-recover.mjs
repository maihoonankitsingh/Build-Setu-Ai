import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";

const ROOT = process.cwd();
const CHANGES_DIR = path.join(ROOT, "data/buildsetu-source-watch/changes");
const RECOVERY_DIR = path.join(ROOT, "data/buildsetu-source-watch/recovery");
const LATEST_RECOVERY = path.join(RECOVERY_DIR, "latest.json");

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + "\n");
}

function listReports() {
  if (!fs.existsSync(CHANGES_DIR)) return [];
  return fs.readdirSync(CHANGES_DIR)
    .filter((name) => name.startsWith("source-watch-report-") && name.endsWith(".json"))
    .map((name) => path.join(CHANGES_DIR, name))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
}

function classifyError(text) {
  const s = String(text || "").toLowerCase();
  if (s.includes("certificate") || s.includes("issuer certificate")) return "tls_certificate";
  if (s.includes("connection reset")) return "connection_reset";
  if (s.includes("ssl_error_syscall") || s.includes("ssl_connect")) return "ssl_handshake";
  if (s.includes("timeout") || s.includes("timed out")) return "timeout";
  if (s.includes("could not resolve") || s.includes("name or service not known")) return "dns";
  if (s.includes("403")) return "forbidden";
  if (s.includes("404")) return "not_found";
  return "fetch_failed";
}

function sha256(buf) {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

function safeUnlink(file) {
  try { fs.unlinkSync(file); } catch {}
}

function runCurl(url, opts = {}) {
  const tmpBase = path.join("/tmp", `buildsetu_curl_recover_${Date.now()}_${Math.random().toString(16).slice(2)}`);
  const bodyFile = `${tmpBase}.body`;
  const headerFile = `${tmpBase}.headers`;
  const insecure = !!opts.insecure;

  const args = [
    "-L",
    "--silent",
    "--show-error",
    "--compressed",
    "--connect-timeout", "20",
    "--max-time", "75",
    "--retry", "1",
    "--retry-delay", "2",
    "-A", "Mozilla/5.0 (BuildSetu Source Watch; official source monitor)",
    "-H", "Accept: text/html,application/pdf,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "-H", "Accept-Language: en-IN,en;q=0.9,hi;q=0.7",
    "-D", headerFile,
    "-o", bodyFile,
    "-w", "\n__BUILDSETU_HTTP_CODE__:%{http_code}\n__BUILDSETU_EFFECTIVE_URL__:%{url_effective}\n__BUILDSETU_CONTENT_TYPE__:%{content_type}\n",
  ];

  if (insecure) args.unshift("-k");

  args.push(url);

  try {
    const stdout = execFileSync("curl", args, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 90000,
      maxBuffer: 1024 * 1024
    });

    const body = fs.existsSync(bodyFile) ? fs.readFileSync(bodyFile) : Buffer.alloc(0);
    const headers = fs.existsSync(headerFile) ? fs.readFileSync(headerFile, "utf8") : "";

    const codeMatch = stdout.match(/__BUILDSETU_HTTP_CODE__:(\d+)/);
    const effectiveMatch = stdout.match(/__BUILDSETU_EFFECTIVE_URL__:(.*)/);
    const contentTypeMatch = stdout.match(/__BUILDSETU_CONTENT_TYPE__:(.*)/);

    const status = codeMatch ? Number(codeMatch[1]) : 0;
    const effectiveUrl = effectiveMatch ? effectiveMatch[1].trim() : url;
    const contentType = contentTypeMatch ? contentTypeMatch[1].trim() : "";

    safeUnlink(bodyFile);
    safeUnlink(headerFile);

    return {
      ok: status >= 200 && status < 400 && body.length > 128,
      status,
      effectiveUrl,
      contentType,
      bytes: body.length,
      hash: body.length ? sha256(body) : "",
      headersPreview: headers.split(/\r?\n/).slice(0, 20),
      insecure,
      error: null
    };
  } catch (err) {
    const stderr = String(err.stderr || err.message || "");
    safeUnlink(bodyFile);
    safeUnlink(headerFile);
    return {
      ok: false,
      status: 0,
      effectiveUrl: url,
      contentType: "",
      bytes: 0,
      hash: "",
      headersPreview: [],
      insecure,
      error: stderr || err.message || "curl failed"
    };
  }
}

function recoverOne(item) {
  const normal = runCurl(item.url, { insecure: false });
  if (normal.ok) {
    return {
      recovered: true,
      method: "curl_get",
      warning: null,
      result: normal
    };
  }

  const normalClass = classifyError(normal.error);

  if (normalClass === "tls_certificate" || normalClass === "ssl_handshake") {
    const insecure = runCurl(item.url, { insecure: true });
    if (insecure.ok) {
      return {
        recovered: true,
        method: "curl_get_insecure_tls_fallback",
        warning: "Recovered only with TLS verification disabled. Treat as transport recovery, not legal/content verification.",
        result: insecure,
        firstFailure: {
          class: normalClass,
          error: normal.error
        }
      };
    }

    return {
      recovered: false,
      method: "curl_get_then_insecure_tls_fallback",
      failureClass: classifyError(insecure.error || normal.error),
      error: insecure.error || normal.error,
      firstFailure: {
        class: normalClass,
        error: normal.error
      }
    };
  }

  return {
    recovered: false,
    method: "curl_get",
    failureClass: normalClass,
    error: normal.error
  };
}

const reports = listReports();

if (!reports.length) {
  const empty = {
    ok: false,
    generatedAt: new Date().toISOString(),
    reason: "No source-watch reports found.",
    recoveredCount: 0,
    unresolvedCount: 0
  };
  writeJson(LATEST_RECOVERY, empty);
  console.log(JSON.stringify(empty, null, 2));
  process.exit(0);
}

const latestReportFile = reports[0];
const report = readJson(latestReportFile);
const failed = Array.isArray(report.failed) ? report.failed : [];

const recovery = {
  ok: true,
  generatedAt: new Date().toISOString(),
  reportFile: path.relative(ROOT, latestReportFile),
  originalFailedCount: failed.length,
  recoveredCount: 0,
  unresolvedCount: 0,
  recovered: [],
  unresolved: []
};

const unresolved = [];

for (const item of failed) {
  const attempt = recoverOne(item);

  if (attempt.recovered) {
    recovery.recovered.push({
      id: item.id || null,
      title: item.title || null,
      url: item.url || null,
      originalError: item.error || null,
      recoveredAt: recovery.generatedAt,
      method: attempt.method,
      warning: attempt.warning,
      status: attempt.result.status,
      effectiveUrl: attempt.result.effectiveUrl,
      contentType: attempt.result.contentType,
      bytes: attempt.result.bytes,
      hash: attempt.result.hash
    });
  } else {
    const nextItem = {
      ...item,
      errorClass: attempt.failureClass || classifyError(attempt.error),
      recoveryAttemptedAt: recovery.generatedAt,
      recoveryMethod: attempt.method,
      recoveryError: attempt.error
    };
    unresolved.push(nextItem);
    recovery.unresolved.push(nextItem);
  }
}

recovery.recoveredCount = recovery.recovered.length;
recovery.unresolvedCount = unresolved.length;

report.fetchRecovery = recovery;
report.failedOriginal = failed;
report.failed = unresolved;
report.updatedByFetchRecoveryAt = recovery.generatedAt;

const archiveRecoveryFile = path.join(
  RECOVERY_DIR,
  `fetch-recovery-${new Date().toISOString().replace(/[-:]/g, "").replace(/\..+$/, "").replace("T", "_")}.json`
);

writeJson(latestReportFile, report);
writeJson(LATEST_RECOVERY, recovery);
writeJson(archiveRecoveryFile, recovery);

console.log(JSON.stringify(recovery, null, 2));
