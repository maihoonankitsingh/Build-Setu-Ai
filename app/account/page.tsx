"use client";

import { useEffect, useState } from "react";
import {
  BadgeCheck,
  CalendarDays,
  CreditCard,
  History,
  LogOut,
  Shield,
  User,
  Wallet,
} from "lucide-react";

type AccountUser = {
  id?: string;
  name?: string;
  email?: string;
  role?: string;
  status?: string;
  credits?: number;
};

type PlanStatus = {
  ok?: boolean;
  authenticated?: boolean;
  planId?: string | null;
  planName?: string | null;
  planStatus?: string | null;
  planCycle?: string | null;
  planStartedAt?: string | null;
  planExpiresAt?: string | null;
  credits?: number;
};

type LedgerItem = {
  id?: string;
  createdAt?: string;
  type?: string;
  credits?: number;
  description?: string;
  actionType?: string;
  creditsUsed?: number;
  note?: string;
  amountPaise?: number;
  razorpayPaymentId?: string;
};

function formatNumber(value: unknown) {
  return Number(value || 0).toLocaleString("en-IN");
}

function formatDate(value?: string | null) {
  if (!value) return "Not set";

  try {
    return new Date(value).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "Not set";
  }
}

function daysRemaining(value?: string | null) {
  if (!value) return null;

  const diff = new Date(value).getTime() - Date.now();
  if (!Number.isFinite(diff)) return null;

  return Math.ceil(diff / (24 * 60 * 60 * 1000));
}

function ledgerType(item: LedgerItem) {
  return item.type || item.actionType || "TRANSACTION";
}

function ledgerCredits(item: LedgerItem) {
  if (typeof item.credits === "number") return item.credits;
  if (typeof item.creditsUsed === "number") return item.creditsUsed;
  return 0;
}

function ledgerNote(item: LedgerItem) {
  return item.description || item.note || item.razorpayPaymentId || "Credit transaction";
}

export default function AccountPage() {
  const [me, setMe] = useState<AccountUser | null>(null);
  const [balance, setBalance] = useState<any>(null);
  const [plan, setPlan] = useState<PlanStatus | null>(null);
  const [history, setHistory] = useState<LedgerItem[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const meRes = await fetch("/api/auth/me", {
        cache: "no-store",
        credentials: "same-origin",
      });
      const meData = await meRes.json().catch(() => null);

      if (!meRes.ok || !meData?.ok || !meData?.authenticated) {
        window.location.href = "/login";
        return;
      }

      setMe(meData.user);

      const [balRes, planRes, historyRes] = await Promise.all([
        fetch("/api/credits/balance", {
          cache: "no-store",
          credentials: "same-origin",
        }),
        fetch("/api/plans/status", {
          cache: "no-store",
          credentials: "same-origin",
        }),
        fetch("/api/credits/history", {
          cache: "no-store",
          credentials: "same-origin",
        }),
      ]);

      const balData = await balRes.json().catch(() => null);
      const planData = await planRes.json().catch(() => null);
      const historyData = await historyRes.json().catch(() => null);

      setBalance(balData || null);
      setPlan(planData || null);

      const ledger = historyData?.transactions || historyData?.history || [];
      setHistory(Array.isArray(ledger) ? ledger : []);
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "same-origin",
    });
    window.location.href = "/login";
  }

  useEffect(() => {
    load();
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#fbf8ff] p-8 text-sm font-bold text-[#21133f]">
        Loading account...
      </main>
    );
  }

  const credits = Number(balance?.credits ?? me?.credits ?? plan?.credits ?? 0);
  const expiryDays = daysRemaining(plan?.planExpiresAt);
  const isActivePlan = String(plan?.planStatus || "").toLowerCase() === "active";

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#f3e8ff_0%,#fbf8ff_38%,#ffffff_100%)] p-5 text-[#21133f]">
      <section className="mx-auto max-w-[1180px]">
        <header className="mb-5 flex flex-col gap-4 rounded-[28px] border border-[#eadcff] bg-white p-5 shadow-[0_22px_70px_rgba(76,29,149,0.08)] md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#7c3aed]">
              BuildSetu Account
            </p>
            <h1 className="mt-1 text-3xl font-black tracking-[-0.06em]">
              {me?.name || me?.email}
            </h1>
            <p className="mt-2 text-sm font-semibold text-[#786a91]">{me?.email}</p>
          </div>

          <div className="flex flex-wrap gap-3">
            <a
              href="/"
              className="flex h-11 items-center rounded-2xl border border-[#e6d9f4] bg-[#fbf8ff] px-5 text-sm font-black text-[#21133f]"
            >
              Dashboard
            </a>
            <button
              onClick={logout}
              className="flex h-11 items-center gap-2 rounded-2xl bg-[#21133f] px-5 text-sm font-black text-white"
            >
              <LogOut size={17} />
              Logout
            </button>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-4">
          <div className="rounded-[24px] border border-[#eadcff] bg-white p-5 shadow-sm">
            <Wallet className="h-7 w-7 text-[#7c3aed]" />
            <p className="mt-3 text-xs font-black uppercase text-[#8b7ca6]">Credits</p>
            <p className="mt-1 text-3xl font-black tracking-[-0.06em]">
              {formatNumber(credits)}
            </p>
          </div>

          <div className="rounded-[24px] border border-[#eadcff] bg-white p-5 shadow-sm">
            <User className="h-7 w-7 text-[#7c3aed]" />
            <p className="mt-3 text-xs font-black uppercase text-[#8b7ca6]">Role</p>
            <p className="mt-1 text-xl font-black">{me?.role || "Designer"}</p>
          </div>

          <div className="rounded-[24px] border border-[#eadcff] bg-white p-5 shadow-sm">
            <Shield className="h-7 w-7 text-emerald-500" />
            <p className="mt-3 text-xs font-black uppercase text-[#8b7ca6]">Account Status</p>
            <p className="mt-1 text-xl font-black">{me?.status || "ACTIVE"}</p>
          </div>

          <a
            href="/pricing"
            className="rounded-[24px] bg-gradient-to-r from-[#6d28d9] to-[#c026d3] p-5 text-white shadow-sm"
          >
            <CreditCard className="h-7 w-7" />
            <p className="mt-3 text-xs font-black uppercase text-white/70">Upgrade</p>
            <p className="mt-1 text-xl font-black">Plans & Credits</p>
          </a>
        </section>

        <section className="mt-5 grid gap-4 lg:grid-cols-[1fr_1.25fr]">
          <div className="rounded-[28px] border border-[#eadcff] bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <BadgeCheck className="h-5 w-5 text-[#7c3aed]" />
              <h2 className="text-xl font-black tracking-[-0.04em]">Plan & Subscription</h2>
            </div>

            <div className="mt-5 grid gap-3">
              <InfoRow label="Current Plan" value={plan?.planName || "Free"} />
              <InfoRow label="Plan Status" value={plan?.planStatus || "Free"} />
              <InfoRow label="Billing Cycle" value={plan?.planCycle || "Free"} />
              <InfoRow label="Started At" value={formatDate(plan?.planStartedAt)} />
              <InfoRow label="Expires At" value={formatDate(plan?.planExpiresAt)} />
            </div>

            <div className="mt-5 rounded-3xl bg-[#fbf8ff] p-4">
              <div className="flex items-start gap-3">
                <CalendarDays className="mt-1 h-5 w-5 text-[#7c3aed]" />
                <div>
                  <p className="text-sm font-black text-[#21133f]">
                    {isActivePlan
                      ? expiryDays !== null
                        ? `${Math.max(expiryDays, 0)} days remaining`
                        : "Active monthly subscription"
                      : "No active paid monthly subscription"}
                  </p>
                  <p className="mt-1 text-xs font-semibold leading-5 text-[#786a91]">
                    Email reminders are currently on hold. Subscription expiry logic is kept in backend for future activation.
                  </p>
                </div>
              </div>
            </div>

            <a
              href="/pricing"
              className="mt-5 flex h-12 items-center justify-center rounded-2xl bg-[#21133f] text-sm font-black text-white"
            >
              Renew / Upgrade Plan
            </a>
          </div>

          <div className="rounded-[28px] border border-[#eadcff] bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <History className="h-5 w-5 text-[#7c3aed]" />
              <h2 className="text-xl font-black tracking-[-0.04em]">Recent credit ledger</h2>
            </div>

            <div className="mt-4 space-y-3">
              {history.length ? (
                history.slice(0, 20).map((item, index) => {
                  const amount = ledgerCredits(item);
                  const positive = amount > 0;

                  return (
                    <div
                      key={item.id || `${item.createdAt || "ledger"}-${index}`}
                      className="rounded-2xl border border-[#eee6f8] bg-[#fbf8ff] p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-black">
                            {ledgerType(item)} · {positive ? "+" : ""}
                            {formatNumber(amount)} credits
                          </p>
                          <p className="mt-1 text-xs text-[#786a91]">{ledgerNote(item)}</p>
                        </div>
                        <p className="shrink-0 text-[11px] font-bold text-[#9a88b3]">
                          {formatDate(item.createdAt)}
                        </p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="rounded-2xl bg-[#fbf8ff] p-4 text-sm text-[#786a91]">
                  No credit activity yet.
                </p>
              )}
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-[#eee6f8] bg-[#fbf8ff] px-4 py-3">
      <p className="text-xs font-black uppercase tracking-[0.08em] text-[#8b7ca6]">{label}</p>
      <p className="text-right text-sm font-black text-[#21133f]">{value}</p>
    </div>
  );
}
