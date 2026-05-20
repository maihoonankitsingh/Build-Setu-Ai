import crypto from "crypto";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";

export const SESSION_COOKIE = "buildsetu_session";

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;

function getSecret() {
  return (
    process.env.AUTH_SECRET ||
    process.env.RAZORPAY_KEY_SECRET ||
    "buildsetu-dev-session-secret-change-this"
  );
}

function b64url(input: Buffer | string) {
  return Buffer.from(input)
    .toString("base64")
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/g, "");
}

function fromB64url(input: string) {
  const normalized = input.replaceAll("-", "+").replaceAll("_", "/");
  const pad = normalized.length % 4 ? "=".repeat(4 - (normalized.length % 4)) : "";
  return Buffer.from(normalized + pad, "base64");
}

function sign(value: string) {
  return b64url(crypto.createHmac("sha256", getSecret()).update(value).digest());
}

function safeEqual(a: string, b: string) {
  const aa = Buffer.from(a);
  const bb = Buffer.from(b);

  if (aa.length !== bb.length) return false;

  return crypto.timingSafeEqual(aa, bb);
}

export function generatePassword(length = 12) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789@#$";
  let output = "";

  for (let i = 0; i < length; i += 1) {
    output += alphabet[crypto.randomInt(0, alphabet.length)];
  }

  return output;
}

export function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");

  return `scrypt:${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string | null | undefined) {
  if (!stored) return false;

  const [method, salt, originalHash] = stored.split(":");

  if (method !== "scrypt" || !salt || !originalHash) return false;

  const hash = crypto.scryptSync(password, salt, 64).toString("hex");

  return safeEqual(hash, originalHash);
}

export function createSessionToken(user: {
  id: string;
  email?: string | null;
  role?: string | null;
}) {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    userId: user.id,
    email: user.email || null,
    role: user.role || "DESIGNER",
    iat: now,
    exp: now + SESSION_TTL_SECONDS,
  };

  const body = b64url(JSON.stringify(payload));
  const signature = sign(body);

  return `${body}.${signature}`;
}

export function parseSessionToken(token: string | undefined | null) {
  if (!token || !token.includes(".")) return null;

  const [body, signature] = token.split(".");

  if (!body || !signature) return null;
  if (!safeEqual(sign(body), signature)) return null;

  try {
    const payload = JSON.parse(fromB64url(body).toString("utf8"));

    if (!payload?.userId || !payload?.exp) return null;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;

    return payload as {
      userId: string;
      email?: string | null;
      role?: string | null;
      iat: number;
      exp: number;
    };
  } catch {
    return null;
  }
}

export async function getAuthUserFromRequest(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = parseSessionToken(token);

  if (!session?.userId) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      credits: true,
      status: true,
      lastLoginAt: true,
      createdAt: true,
    },
  });

  if (!user || user.status !== "ACTIVE") return null;

  return user;
}

export function publicUser(user: any) {
  if (!user) return null;

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    credits: user.credits,
    status: user.status,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
  };
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  };
}
