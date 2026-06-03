import { lookup } from "dns/promises";
import net from "net";

export type BuildSetuPublicUrlCheck = {
  url: URL;
  hostname: string;
  resolvedAddresses: Array<{
    address: string;
    family: number;
  }>;
};

export class BuildSetuUrlSafetyError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "BuildSetuUrlSafetyError";
    this.code = code;
  }
}

export function normalizeBuildSetuHttpUrl(input: unknown) {
  const raw = String(input || "").trim();

  if (!raw) {
    throw new BuildSetuUrlSafetyError("URL_REQUIRED", "Public URL is required.");
  }

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new BuildSetuUrlSafetyError("INVALID_URL", "Enter a valid public URL.");
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new BuildSetuUrlSafetyError("URL_NOT_ALLOWED", "Only http and https URLs are allowed.");
  }

  return url;
}

function isPrivateIPv4(ip: string) {
  const parts = ip.split(".").map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => !Number.isFinite(part) || part < 0 || part > 255)) {
    return true;
  }

  const [a, b] = parts;

  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    a >= 224
  );
}

function isPrivateIPv6(ip: string) {
  const value = ip.toLowerCase();

  return (
    value === "::1" ||
    value === "::" ||
    value.startsWith("fc") ||
    value.startsWith("fd") ||
    value.startsWith("fe80") ||
    value.includes("::ffff:127.") ||
    value.includes("::ffff:10.") ||
    value.includes("::ffff:192.168.")
  );
}

export function isBuildSetuPrivateHostLiteral(hostname: string) {
  const host = String(hostname || "").toLowerCase();

  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host === "metadata.google.internal"
  ) {
    return true;
  }

  const ipType = net.isIP(host);
  if (ipType === 4) return isPrivateIPv4(host);
  if (ipType === 6) return isPrivateIPv6(host);

  return false;
}

export async function assertBuildSetuPublicResolvableUrl(input: URL | string): Promise<BuildSetuPublicUrlCheck> {
  // BUILDSETU_SHARED_PUBLIC_URL_SAFETY_V1
  const url = input instanceof URL ? input : normalizeBuildSetuHttpUrl(input);
  const hostname = url.hostname.toLowerCase();

  if (isBuildSetuPrivateHostLiteral(hostname)) {
    throw new BuildSetuUrlSafetyError("URL_NOT_ALLOWED", "Private, local, or reserved URLs are not allowed.");
  }

  const resolved = await lookup(hostname, { all: true, verbatim: true }).catch(() => []);

  if (!resolved.length) {
    throw new BuildSetuUrlSafetyError("URL_DNS_LOOKUP_FAILED", "Could not resolve URL hostname.");
  }

  const resolvedAddresses = resolved.map((item) => ({
    address: String(item.address || "").toLowerCase(),
    family: Number(item.family || 0),
  }));

  for (const item of resolvedAddresses) {
    if (item.family === 4 && isPrivateIPv4(item.address)) {
      throw new BuildSetuUrlSafetyError("URL_NOT_ALLOWED", "Private, local, or reserved URLs are not allowed.");
    }

    if (item.family === 6 && isPrivateIPv6(item.address)) {
      throw new BuildSetuUrlSafetyError("URL_NOT_ALLOWED", "Private, local, or reserved URLs are not allowed.");
    }
  }

  return {
    url,
    hostname,
    resolvedAddresses,
  };
}

export function buildSetuUrlSafetyErrorPayload(error: unknown) {
  if (error instanceof BuildSetuUrlSafetyError) {
    return {
      ok: false,
      code: error.code,
      error: error.message,
    };
  }

  return {
    ok: false,
    code: "URL_CHECK_FAILED",
    error: "Could not verify public URL safety.",
  };
}
