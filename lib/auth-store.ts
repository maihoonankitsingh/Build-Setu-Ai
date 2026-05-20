import { randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";

export const AUTH_COOKIE = "buildsetu_session";
export const GOOGLE_STATE_COOKIE = "buildsetu_google_state";

const DATA_DIR = path.join(process.cwd(), "data");
const USERS_FILE = path.join(DATA_DIR, "buildsetu-auth-users.json");
const SESSIONS_FILE = path.join(DATA_DIR, "buildsetu-auth-sessions.json");

const DEFAULT_NEW_USER_CREDITS = Number(process.env.DEFAULT_NEW_USER_CREDITS || 3000);

function getDefaultNewUserCredits() {
  if (!Number.isFinite(DEFAULT_NEW_USER_CREDITS) || DEFAULT_NEW_USER_CREDITS < 0) {
    return 3000;
  }
  return Math.floor(DEFAULT_NEW_USER_CREDITS);
}


export type AuthUser = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  provider: "email" | "google" | "mixed";
  passwordHash?: string;
  googleId?: string;
  avatar?: string;
  credits: number;
  createdAt: string;
  updatedAt: string;
};

type SessionRecord = {
  token: string;
  userId: string;
  email: string;
  createdAt: string;
  expiresAt: string;
};

async function ensureDataDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

async function readJson<T>(file: string, fallback: T): Promise<T> {
  try {
    const raw = await fs.readFile(file, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeJson<T>(file: string, data: T) {
  await ensureDataDir();
  await fs.writeFile(file, JSON.stringify(data, null, 2), "utf8");
}

function normalizeEmail(email: string) {
  return String(email || "").trim().toLowerCase();
}

function makeId(prefix: string) {
  return `${prefix}_${Date.now()}_${randomBytes(8).toString("hex")}`;
}

export async function getUsers(): Promise<AuthUser[]> {
  return readJson<AuthUser[]>(USERS_FILE, []);
}

export async function saveUsers(users: AuthUser[]) {
  await writeJson(USERS_FILE, users);
}

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash?: string) {
  if (!storedHash || !storedHash.includes(":")) return false;
  const [salt, hashHex] = storedHash.split(":");
  const expected = Buffer.from(hashHex, "hex");
  const actual = scryptSync(password, salt, 64);
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
}

export async function createEmailUser(input: {
  name: string;
  email: string;
  password: string;
  phone?: string;
}) {
  const email = normalizeEmail(input.email);
  const users = await getUsers();
  const existing = users.find((u) => normalizeEmail(u.email) === email);

  if (existing) {
    if (!existing.passwordHash) {
      existing.passwordHash = hashPassword(input.password);
      existing.provider = existing.provider === "google" ? "mixed" : existing.provider;
      existing.name = input.name || existing.name;
      existing.phone = input.phone || existing.phone;
      existing.updatedAt = new Date().toISOString();
      await saveUsers(users);
      return existing;
    }
    throw new Error("USER_ALREADY_EXISTS");
  }

  const now = new Date().toISOString();
  const user: AuthUser = {
    id: makeId("usr"),
    name: input.name || email.split("@")[0],
    email,
    phone: input.phone || "",
    provider: "email",
    passwordHash: hashPassword(input.password),
    credits: getDefaultNewUserCredits(),
    createdAt: now,
    updatedAt: now,
  };

  users.unshift(user);
  await saveUsers(users);
  return user;
}

export async function findUserByEmail(emailInput: string) {
  const email = normalizeEmail(emailInput);
  const users = await getUsers();
  return users.find((u) => normalizeEmail(u.email) === email) || null;
}

export async function upsertGoogleUser(profile: {
  googleId: string;
  email: string;
  name: string;
  avatar?: string;
}) {
  const email = normalizeEmail(profile.email);
  const users = await getUsers();
  const existing = users.find((u) => normalizeEmail(u.email) === email);

  if (existing) {
    existing.googleId = profile.googleId;
    existing.avatar = profile.avatar || existing.avatar;
    existing.name = profile.name || existing.name;
    existing.provider = existing.passwordHash ? "mixed" : "google";
    existing.updatedAt = new Date().toISOString();
    await saveUsers(users);
    return existing;
  }

  const now = new Date().toISOString();
  const user: AuthUser = {
    id: makeId("usr"),
    name: profile.name || email.split("@")[0],
    email,
    provider: "google",
    googleId: profile.googleId,
    avatar: profile.avatar || "",
    credits: getDefaultNewUserCredits(),
    createdAt: now,
    updatedAt: now,
  };

  users.unshift(user);
  await saveUsers(users);
  return user;
}

export async function createSession(user: AuthUser) {
  const sessions = await readJson<SessionRecord[]>(SESSIONS_FILE, []);
  const token = randomBytes(32).toString("hex");
  const now = new Date();
  const expires = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  sessions.unshift({
    token,
    userId: user.id,
    email: user.email,
    createdAt: now.toISOString(),
    expiresAt: expires.toISOString(),
  });

  await writeJson(SESSIONS_FILE, sessions.slice(0, 5000));
  return token;
}

export async function getUserFromSession(token?: string) {
  if (!token) return null;

  const sessions = await readJson<SessionRecord[]>(SESSIONS_FILE, []);
  const session = sessions.find((s) => s.token === token);

  if (!session) return null;
  if (new Date(session.expiresAt).getTime() < Date.now()) return null;

  const users = await getUsers();
  return users.find((u) => u.id === session.userId) || null;
}

export async function destroySession(token?: string) {
  if (!token) return;
  const sessions = await readJson<SessionRecord[]>(SESSIONS_FILE, []);
  await writeJson(
    SESSIONS_FILE,
    sessions.filter((s) => s.token !== token)
  );
}

export function setSessionCookie(res: NextResponse, token: string) {
  res.cookies.set(AUTH_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 24 * 60 * 60,
  });
}

export function clearSessionCookie(res: NextResponse) {
  res.cookies.set(AUTH_COOKIE, "", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export function safeUser(user: AuthUser) {
  const { passwordHash, ...publicUser } = user;
  return publicUser;
}
