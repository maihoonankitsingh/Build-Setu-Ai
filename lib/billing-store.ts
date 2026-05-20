import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { getUsers, saveUsers, type AuthUser } from "@/lib/auth-store";

const DATA_DIR = path.join(process.cwd(), "data");
const ORDERS_FILE = path.join(DATA_DIR, "buildsetu-billing-orders.json");
const HISTORY_FILE = path.join(DATA_DIR, "buildsetu-credit-history.json");

export type BillingOrder = {
  id: string;
  razorpayOrderId: string;
  userId: string;
  email: string;
  type: "credits" | "plan";
  status: "created" | "verified" | "failed";
  amountPaise: number;
  currency: "INR";
  credits: number;
  planId?: string;
  planName?: string;
  receipt: string;
  razorpayPaymentId?: string;
  createdAt: string;
  updatedAt: string;
};

export type CreditHistoryItem = {
  id: string;
  userId: string;
  email: string;
  type: "PURCHASE" | "USE" | "PLAN_UPGRADE" | "ADMIN";
  credits: number;
  amountPaise?: number;
  description: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  createdAt: string;
};

export const CREDIT_PACKS: Record<string, { label: string; credits: number; amountPaise: number }> = {
  "starter": { label: "Starter Credit Pack", credits: 3000, amountPaise: 0 },
  "pro": { label: "Pro Credit Pack", credits: 200000, amountPaise: 499900 },
  "pro-credit": { label: "Pro Credit Pack", credits: 200000, amountPaise: 499900 },
  "pro-credit-pack": { label: "Pro Credit Pack", credits: 200000, amountPaise: 499900 },
  "agency": { label: "Agency Credit Pack", credits: 700000, amountPaise: 1100 },
};

export const PLAN_PACKS: Record<string, { label: string; credits: number; amountPaise: number }> = {
  "pro": { label: "BuildSetu Pro", credits: 200000, amountPaise: 499900 },
  "studio": { label: "BuildSetu Studio", credits: 700000, amountPaise: 1100 },
  "agency": { label: "BuildSetu Agency", credits: 1500000, amountPaise: 2999900 },
};

async function ensureDir() {
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
  await ensureDir();
  await fs.writeFile(file, JSON.stringify(data, null, 2), "utf8");
}

export async function readOrders(): Promise<BillingOrder[]> {
  return readJson<BillingOrder[]>(ORDERS_FILE, []);
}

export async function saveOrders(orders: BillingOrder[]) {
  await writeJson(ORDERS_FILE, orders);
}

export async function readHistory(): Promise<CreditHistoryItem[]> {
  return readJson<CreditHistoryItem[]>(HISTORY_FILE, []);
}

export async function appendHistory(item: Omit<CreditHistoryItem, "id" | "createdAt">) {
  const history = await readHistory();
  history.unshift({
    id: `hist_${Date.now()}_${randomBytes(5).toString("hex")}`,
    createdAt: new Date().toISOString(),
    ...item,
  });
  await writeJson(HISTORY_FILE, history.slice(0, 10000));
}

export async function saveBillingOrder(order: BillingOrder) {
  const orders = await readOrders();
  orders.unshift(order);
  await saveOrders(orders.slice(0, 10000));
}

export async function updateBillingOrder(orderId: string, patch: Partial<BillingOrder>) {
  const orders = await readOrders();
  const index = orders.findIndex((o) => o.razorpayOrderId === orderId || o.id === orderId);
  if (index === -1) return null;

  orders[index] = {
    ...orders[index],
    ...patch,
    updatedAt: new Date().toISOString(),
  };

  await saveOrders(orders);
  return orders[index];
}

export async function findBillingOrder(razorpayOrderId: string) {
  const orders = await readOrders();
  return orders.find((o) => o.razorpayOrderId === razorpayOrderId) || null;
}

export async function addCreditsToUser(userId: string, credits: number) {
  const users = await getUsers();
  const user = users.find((u) => u.id === userId);

  if (!user) {
    throw new Error("USER_NOT_FOUND");
  }

  user.credits = Number(user.credits || 0) + Number(credits || 0);
  user.updatedAt = new Date().toISOString();

  await saveUsers(users);
  return user;
}

export async function setUserPlan(userId: string, planId: string, planName: string) {
  const users = await getUsers();
  const user = users.find((u) => u.id === userId) as any;

  if (!user) {
    throw new Error("USER_NOT_FOUND");
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  user.planId = planId;
  user.planName = planName;
  user.planStatus = "active";
  user.planCycle = "monthly";
  user.planStartedAt = now.toISOString();
  user.planExpiresAt = expiresAt.toISOString();
  user.planUpdatedAt = now.toISOString();
  user.subscriptionReminderKeys = [];
  user.updatedAt = now.toISOString();

  await saveUsers(users);
  return user;
}

export function getRazorpayKeys() {
  const keyId = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "";
  const keySecret = process.env.RAZORPAY_KEY_SECRET || "";
  return { keyId, keySecret };
}

export async function createRazorpayOrder(input: {
  amountPaise: number;
  receipt: string;
  notes: Record<string, string>;
}) {
  const { keyId, keySecret } = getRazorpayKeys();

  if (!keyId || !keySecret) {
    throw new Error("RAZORPAY_KEYS_MISSING");
  }

  const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");

  const res = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      "Authorization": `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: input.amountPaise,
      currency: "INR",
      receipt: input.receipt,
      notes: input.notes,
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    console.error("Razorpay order create failed", data);
    throw new Error("RAZORPAY_ORDER_FAILED");
  }

  return data as { id: string; amount: number; currency: string; receipt: string };
}

export function verifyRazorpaySignature(input: {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}) {
  const { keySecret } = getRazorpayKeys();

  if (!keySecret) return false;

  const generated = createHmac("sha256", keySecret)
    .update(`${input.razorpayOrderId}|${input.razorpayPaymentId}`)
    .digest("hex");

  const a = Buffer.from(generated);
  const b = Buffer.from(input.razorpaySignature || "");

  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function makeReceipt(prefix: string) {
  return `${prefix}_${Date.now()}_${randomBytes(3).toString("hex")}`.slice(0, 40);
}
