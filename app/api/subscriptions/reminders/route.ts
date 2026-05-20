import { NextRequest, NextResponse } from "next/server";
import { getUsers, saveUsers } from "@/lib/auth-store";

const DAY = 24 * 60 * 60 * 1000;

function daysLeftUntil(expiresAt: string) {
  const diff = new Date(expiresAt).getTime() - Date.now();
  return Math.ceil(diff / DAY);
}

async function sendReminderEmail(input: {
  email: string;
  name?: string;
  planName: string;
  daysLeft: number;
  expiresAt: string;
}) {
  const apiKey = process.env.RESEND_API_KEY || "";
  const from = process.env.SUBSCRIPTION_REMINDER_FROM || "BuildSetu AI <noreply@build.sikhadenge.in>";

  const subject = `BuildSetu AI subscription expires in ${input.daysLeft} day${input.daysLeft === 1 ? "" : "s"}`;

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#21133f">
      <h2>BuildSetu AI subscription reminder</h2>
      <p>Hello ${input.name || "there"},</p>
      <p>Your <b>${input.planName}</b> monthly subscription will expire in <b>${input.daysLeft} day${input.daysLeft === 1 ? "" : "s"}</b>.</p>
      <p>Expiry date: <b>${new Date(input.expiresAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</b></p>
      <p>Please renew your plan to continue using BuildSetu AI premium workflow.</p>
      <p><a href="https://build.sikhadenge.in/pricing" style="display:inline-block;background:#6d28d9;color:#fff;padding:12px 18px;border-radius:12px;text-decoration:none;font-weight:700">Renew Subscription</a></p>
      <p>BuildSetu AI</p>
    </div>
  `;

  if (!apiKey) {
    console.log("SUBSCRIPTION_REMINDER_EMAIL_SKIPPED_NO_RESEND_KEY", {
      email: input.email,
      daysLeft: input.daysLeft,
      planName: input.planName,
      expiresAt: input.expiresAt,
    });
    return { sent: false, skipped: "RESEND_API_KEY_MISSING" };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: input.email,
      subject,
      html,
    }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    console.error("SUBSCRIPTION_REMINDER_EMAIL_FAILED", {
      email: input.email,
      status: res.status,
      data,
    });
    return { sent: false, error: data };
  }

  return { sent: true, data };
}

async function runReminders(request: NextRequest) {
  const secret = process.env.SUBSCRIPTION_CRON_SECRET || "";
  const requestSecret =
    request.headers.get("x-cron-secret") ||
    request.nextUrl.searchParams.get("secret") ||
    "";

  if (!secret || requestSecret !== secret) {
    return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  }

  const users = await getUsers();
  const nowIso = new Date().toISOString();

  const result = {
    checked: users.length,
    expired: 0,
    reminderDue: 0,
    reminderSent: 0,
    reminderSkipped: 0,
  };

  for (const user of users as any[]) {
    if (!user.email || user.planStatus !== "active" || !user.planExpiresAt) continue;

    const expiresAtMs = new Date(user.planExpiresAt).getTime();

    if (expiresAtMs <= Date.now()) {
      user.planStatus = "expired";
      user.planId = "free";
      user.planName = "Free";
      user.planExpiredAt = nowIso;
      user.updatedAt = nowIso;
      result.expired += 1;
      continue;
    }

    const daysLeft = daysLeftUntil(user.planExpiresAt);

    if (daysLeft < 1 || daysLeft > 6) continue;

    result.reminderDue += 1;

    const reminderKey = `${user.planExpiresAt}:DAYS_LEFT_${daysLeft}`;
    const sentKeys = Array.isArray(user.subscriptionReminderKeys)
      ? user.subscriptionReminderKeys
      : [];

    if (sentKeys.includes(reminderKey)) {
      result.reminderSkipped += 1;
      continue;
    }

    const emailResult = await sendReminderEmail({
      email: user.email,
      name: user.name,
      planName: user.planName || "BuildSetu AI Plan",
      daysLeft,
      expiresAt: user.planExpiresAt,
    });

    user.subscriptionReminderKeys = [...sentKeys, reminderKey];
    user.lastSubscriptionReminderAt = nowIso;
    user.updatedAt = nowIso;

    if (emailResult.sent) result.reminderSent += 1;
    else result.reminderSkipped += 1;
  }

  await saveUsers(users);

  return NextResponse.json({
    ok: true,
    ...result,
  });
}

export async function GET(request: NextRequest) {
  return runReminders(request);
}

export async function POST(request: NextRequest) {
  return runReminders(request);
}
