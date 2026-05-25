"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  BadgeCheck,
  Building2,
  CalendarDays,
  Coins,
  CreditCard,
  LogOut,
  Mail,
  Phone,
  ShieldCheck,
  User,
  Wallet,
} from "lucide-react";

type AnyRecord = Record<string, any>;

function formatCredits(value: any) {
  const number = Number(value || 0);
  return new Intl.NumberFormat("en-IN").format(number);
}

function safeText(value: any, fallback = "Not set") {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

function getUserImage(user: AnyRecord | null) {
  return (
    user?.image ||
    user?.picture ||
    user?.avatar ||
    user?.avatarUrl ||
    user?.photoURL ||
    user?.photoUrl ||
    user?.profileImage ||
    ""
  );
}

function getInitials(name: string, email: string) {
  const source = name || email || "BuildSetu AI";
  const initials = source
    .replace(/@.*/, "")
    .split(/[.\s_-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return initials || "BS";
}

export default function AccountPage() {
  const [user, setUser] = useState<AnyRecord | null>(null);
  const [overview, setOverview] = useState<AnyRecord | null>(null);
  const [balance, setBalance] = useState<AnyRecord | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadAccount() {
      setLoading(true);

      const safeFetch = async (url: string) => {
        try {
          const res = await fetch(url, {
            cache: "no-store",
            credentials: "include",
          });
          if (!res.ok) return null;
          return await res.json();
        } catch {
          return null;
        }
      };

      const [meData, overviewData, balanceData, historyData] = await Promise.all([
        safeFetch("/api/auth/me"),
        safeFetch("/api/dashboard/overview"),
        safeFetch("/api/credits/balance"),
        safeFetch("/api/credits/history"),
      ]);

      if (!mounted) return;

      const authUser = meData?.user || meData || null;
      setUser(authUser);
      setOverview(overviewData || null);
      setBalance(balanceData || null);

      const ledger =
        historyData?.history ||
        historyData?.transactions ||
        historyData?.creditTransactions ||
        historyData?.items ||
        [];

      setHistory(Array.isArray(ledger) ? ledger.slice(0, 8) : []);
      setLoading(false);
    }

    loadAccount();

    return () => {
      mounted = false;
    };
  }, []);

  const profile = useMemo(() => {
    const name =
      user?.name ||
      user?.fullName ||
      user?.displayName ||
      user?.email?.split("@")?.[0] ||
      "BuildSetu User";

    const email = user?.email || "";
    const phone = user?.phone || user?.mobile || "";
    const company = user?.company || user?.companyName || user?.studioName || "";
    const role = user?.role || "Designer";
    const image = getUserImage(user);

    const credits =
      balance?.credits ??
      balance?.balance ??
      overview?.creditsLeft ??
      user?.credits ??
      0;

    const plan =
      user?.plan ||
      user?.currentPlan ||
      overview?.plan ||
      overview?.currentPlan ||
      "Free";

    const status =
      user?.status ||
      user?.accountStatus ||
      overview?.accountStatus ||
      "Active";

    const subscriptionStatus =
      user?.subscriptionStatus ||
      overview?.subscriptionStatus ||
      "active";

    return {
      name,
      email,
      phone,
      company,
      role,
      image,
      credits,
      plan,
      status,
      subscriptionStatus,
      initials: getInitials(name, email),
    };
  }, [user, overview, balance]);

  async function logout() {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch {
      // fallback below
    }

    window.location.href = "/login";
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#fbf9ff] px-5 py-8 text-[#16072f]">
        <section className="mx-auto max-w-6xl rounded-[28px] border border-violet-100 bg-white p-8 shadow-sm">
          <div className="h-8 w-52 animate-pulse rounded-xl bg-violet-100" />
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="h-32 animate-pulse rounded-[24px] bg-violet-50" />
            <div className="h-32 animate-pulse rounded-[24px] bg-violet-50" />
            <div className="h-32 animate-pulse rounded-[24px] bg-violet-50" />
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#fbf9ff] px-4 py-6 text-[#15042e] md:px-6 md:py-8">
      <section className="mx-auto max-w-6xl space-y-5">
        <div className="overflow-hidden rounded-[30px] border border-violet-100 bg-white shadow-[0_18px_60px_rgba(77,33,156,0.08)]">
          <div className="flex flex-col gap-5 border-b border-violet-100 bg-gradient-to-r from-white via-[#fbf7ff] to-white p-5 md:flex-row md:items-center md:justify-between md:p-7">
            <div className="flex items-center gap-4">
              <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-[24px] border border-violet-100 bg-violet-700 text-white shadow-sm">
                {profile.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profile.image}
                    alt={profile.name}
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-2xl font-black">
                    {profile.initials}
                  </div>
                )}
              </div>

              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.28em] text-violet-600">
                  BuildSetu Account
                </p>
                <h1 className="mt-1 truncate text-2xl font-black tracking-tight md:text-3xl">
                  {profile.name}
                </h1>
                <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-violet-900/60">
                  <Mail className="h-4 w-4" />
                  <span className="truncate">{safeText(profile.email)}</span>
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => (window.location.href = "/")}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-violet-100 bg-white px-5 py-3 text-sm font-black text-[#15042e] shadow-sm transition hover:bg-violet-50"
              >
                <ArrowLeft className="h-4 w-4" />
                Dashboard
              </button>

              <button
                type="button"
                onClick={logout}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#241044] px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-[#351969]"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </div>
          </div>

          <div className="grid gap-4 p-5 md:grid-cols-4 md:p-7">
            <div className="rounded-[24px] border border-violet-100 bg-white p-5 shadow-sm">
              <Wallet className="h-7 w-7 text-violet-600" />
              <p className="mt-4 text-xs font-black uppercase tracking-widest text-violet-900/50">
                Credits
              </p>
              <p className="mt-1 text-3xl font-black tracking-tight">
                {formatCredits(profile.credits)}
              </p>
            </div>

            <div className="rounded-[24px] border border-violet-100 bg-white p-5 shadow-sm">
              <User className="h-7 w-7 text-violet-600" />
              <p className="mt-4 text-xs font-black uppercase tracking-widest text-violet-900/50">
                Role
              </p>
              <p className="mt-1 text-xl font-black capitalize">
                {safeText(profile.role)}
              </p>
            </div>

            <div className="rounded-[24px] border border-violet-100 bg-white p-5 shadow-sm">
              <ShieldCheck className="h-7 w-7 text-emerald-500" />
              <p className="mt-4 text-xs font-black uppercase tracking-widest text-violet-900/50">
                Account Status
              </p>
              <p className="mt-1 text-xl font-black uppercase">
                {safeText(profile.status)}
              </p>
            </div>

            <button
              type="button"
              onClick={() => (window.location.href = "/pricing")}
              className="rounded-[24px] bg-gradient-to-br from-violet-700 to-fuchsia-500 p-5 text-left text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
            >
              <CreditCard className="h-7 w-7" />
              <p className="mt-4 text-xs font-black uppercase tracking-widest text-white/70">
                Upgrade
              </p>
              <p className="mt-1 text-xl font-black">Plans & Credits</p>
            </button>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
          <section className="rounded-[30px] border border-violet-100 bg-white p-5 shadow-[0_18px_60px_rgba(77,33,156,0.08)] md:p-7">
            <div className="flex items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 text-xl font-black">
                <BadgeCheck className="h-5 w-5 text-violet-600" />
                User Profile
              </h2>
              <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-black uppercase tracking-widest text-violet-700">
                Google synced
              </span>
            </div>

            <div className="mt-5 grid gap-3">
              <ProfileRow icon={<User />} label="Name" value={profile.name} />
              <ProfileRow icon={<Mail />} label="Email" value={profile.email} />
              <ProfileRow icon={<Phone />} label="Phone" value={profile.phone} />
              <ProfileRow icon={<Building2 />} label="Company / Studio" value={profile.company} />
              <ProfileRow icon={<ShieldCheck />} label="Role" value={profile.role} />
            </div>

            <div className="mt-5 rounded-[22px] bg-violet-50 p-4">
              <p className="text-sm font-bold leading-6 text-violet-950/70">
                Profile photo Google/Gmail login se auto show hoga, jab auth response me
                image/picture/avatar available hoga. Phone aur company backend field me set
                hone ke baad yahin show honge.
              </p>
            </div>
          </section>

          <section className="rounded-[30px] border border-violet-100 bg-white p-5 shadow-[0_18px_60px_rgba(77,33,156,0.08)] md:p-7">
            <h2 className="flex items-center gap-2 text-xl font-black">
              <CalendarDays className="h-5 w-5 text-violet-600" />
              Plan & Subscription
            </h2>

            <div className="mt-5 grid gap-3">
              <InfoRow label="Current Plan" value={profile.plan} />
              <InfoRow label="Plan Status" value={profile.subscriptionStatus} />
              <InfoRow label="Billing Cycle" value={user?.billingCycle || "free"} />
              <InfoRow label="Started At" value={user?.subscriptionStartedAt || user?.startedAt || "Not set"} />
              <InfoRow label="Expires At" value={user?.subscriptionExpiresAt || user?.expiresAt || "Not set"} />
            </div>

            <button
              type="button"
              onClick={() => (window.location.href = "/pricing")}
              className="mt-5 w-full rounded-2xl bg-[#241044] px-5 py-3 text-sm font-black text-white transition hover:bg-[#351969]"
            >
              Renew / Upgrade Plan
            </button>
          </section>
        </div>

        <section className="rounded-[30px] border border-violet-100 bg-white p-5 shadow-[0_18px_60px_rgba(77,33,156,0.08)] md:p-7">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-xl font-black">
                <Coins className="h-5 w-5 text-violet-600" />
                Recent Credit Ledger
              </h2>
              <p className="mt-1 text-sm font-semibold text-violet-950/50">
                Latest credit purchases and tool usage.
              </p>
            </div>

            <button
              type="button"
              onClick={() => (window.location.href = "/credits")}
              className="rounded-2xl border border-violet-100 bg-violet-50 px-4 py-2 text-sm font-black text-violet-700 transition hover:bg-violet-100"
            >
              View Credits
            </button>
          </div>

          <div className="mt-5 space-y-3">
            {history.length ? (
              history.map((item, index) => {
                const type = item.type || item.actionType || item.action || "LEDGER";
                const amount =
                  item.creditsUsed ??
                  item.credits ??
                  item.amount ??
                  item.delta ??
                  0;
                const description =
                  item.description ||
                  item.note ||
                  item.reason ||
                  `${type} ${amount} credits`;
                const createdAt =
                  item.createdAt ||
                  item.created_at ||
                  item.date ||
                  "";

                return (
                  <div
                    key={item.id || index}
                    className="flex flex-col gap-2 rounded-[22px] border border-violet-100 bg-[#fbf8ff] p-4 md:flex-row md:items-center md:justify-between"
                  >
                    <div>
                      <p className="font-black uppercase">
                        {type} {Number(amount) > 0 ? "+" : ""}
                        {formatCredits(amount)} credits
                      </p>
                      <p className="mt-1 text-sm font-semibold text-violet-950/50">
                        {description}
                      </p>
                    </div>
                    <p className="text-xs font-black text-violet-900/45">
                      {createdAt ? new Date(createdAt).toLocaleString("en-IN") : ""}
                    </p>
                  </div>
                );
              })
            ) : (
              <div className="rounded-[22px] border border-dashed border-violet-200 bg-violet-50 p-6 text-center">
                <p className="font-black">No credit ledger found</p>
                <p className="mt-1 text-sm font-semibold text-violet-950/50">
                  Purchases and tool usage will appear here.
                </p>
              </div>
            )}
          </div>
        </section>
      </section>
    </main>
  );
}

function ProfileRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: any;
}) {
  return (
    <div className="flex items-center gap-3 rounded-[18px] border border-violet-100 bg-[#fbf8ff] px-4 py-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-violet-600 shadow-sm [&_svg]:h-5 [&_svg]:w-5">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-black uppercase tracking-widest text-violet-900/45">
          {label}
        </p>
        <p className="truncate text-sm font-black text-[#15042e]">
          {safeText(value)}
        </p>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: any }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-[18px] border border-violet-100 bg-[#fbf8ff] px-4 py-3">
      <p className="text-xs font-black uppercase tracking-widest text-violet-900/45">
        {label}
      </p>
      <p className="max-w-[55%] truncate text-sm font-black capitalize text-[#15042e]">
        {safeText(value)}
      </p>
    </div>
  );
}
