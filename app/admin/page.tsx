"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  CreditCard,
  Database,
  Gauge,
  History,
  KeyRound,
  LogOut,
  Plus,
  RefreshCcw,
  Search,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
  Wallet,
  Zap,
} from "lucide-react";

function money(value: number) {
  return "₹" + Number(value || 0).toLocaleString("en-IN");
}

function num(value: number) {
  return Number(value || 0).toLocaleString("en-IN");
}

function fmtDate(value: string) {
  if (!value) return "-";
  return new Date(value).toLocaleString("en-IN");
}

export default function AdminPage() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/admin/overview", { cache: "no-store" });
      const json = await res.json();

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Admin access required");
      }

      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Admin access required");
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  async function adjustCredits(userId: string, mode: "ADD" | "DEDUCT") {
    const rawCredits = window.prompt(`${mode === "ADD" ? "Add" : "Deduct"} how many credits?`);

    if (!rawCredits) return;

    const credits = Number(rawCredits.replaceAll(",", ""));

    if (!Number.isFinite(credits) || credits <= 0) {
      alert("Invalid credit amount");
      return;
    }

    const note =
      window.prompt("Note for ledger", `Admin ${mode.toLowerCase()} ${num(credits)} credits`) ||
      `Admin ${mode.toLowerCase()} credits`;

    const res = await fetch("/api/admin/users/credits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, mode, credits, note }),
    });

    const json = await res.json();

    if (!res.ok || !json.ok) {
      alert(json.error || "Failed to update credits");
      return;
    }

    await load();
  }

  useEffect(() => {
    load();
  }, []);

  const filteredUsers = useMemo(() => {
    const users = data?.users || [];
    const q = query.trim().toLowerCase();

    if (!q) return users;

    return users.filter((user: any) =>
      [user.name, user.email, user.phone, user.role, user.status]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [data, query]);

  if (error) {
    return (
      <main className="min-h-screen bg-[#f8f5ff] p-6 text-[#21133f]">
        <div className="mx-auto max-w-lg rounded-[28px] border border-[#e8def7] bg-white p-7 shadow-[0_20px_60px_rgba(65,29,120,0.10)]">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f1e6ff] text-[#7c3aed]">
            <KeyRound size={26} />
          </div>
          <h1 className="mt-5 text-3xl font-black tracking-[-0.06em]">Admin login required</h1>
          <p className="mt-2 text-sm leading-6 text-[#786a91]">{error}</p>
          <a
            href="/login"
            className="mt-6 inline-flex h-12 items-center justify-center rounded-2xl bg-[#21133f] px-6 text-sm font-black text-white"
          >
            Login
          </a>
        </div>
      </main>
    );
  }

  if (loading || !data) {
    return (
      <main className="min-h-screen bg-[#f8f5ff] p-8 text-[#21133f]">
        <div className="mx-auto max-w-[1320px] rounded-[28px] bg-white p-8 shadow-sm">
          <p className="text-sm font-black text-[#7c3aed]">Loading BuildSetu admin...</p>
        </div>
      </main>
    );
  }

  const summary = data.summary || {};

  const kpis = [
    {
      label: "Users",
      value: num(summary.userCount),
      sub: `${num(summary.activeUserCount)} active`,
      icon: Users,
      tone: "purple",
    },
    {
      label: "Revenue",
      value: money(summary.verifiedRevenue),
      sub: `${num(summary.verifiedPaymentCount)} verified payments`,
      icon: TrendingUp,
      tone: "green",
    },
    {
      label: "Wallet Credits",
      value: num(summary.totalWalletCredits),
      sub: `${num(summary.totalCreditsUsed)} used`,
      icon: Wallet,
      tone: "purple",
    },
    {
      label: "Tool Runs",
      value: num(summary.toolRunCount),
      sub: `${num(summary.projectCount)} projects`,
      icon: Zap,
      tone: "orange",
    },
    {
      label: "Subscriptions",
      value: num(summary.activeSubscriptionCount),
      sub: `${num(summary.paymentCount)} total payments`,
      icon: CreditCard,
      tone: "purple",
    },
  ];

  return (
    <main className="min-h-screen bg-[#f8f5ff] text-[#21133f]">
      <section className="mx-auto grid max-w-[1500px] gap-5 p-5 lg:grid-cols-[270px_1fr]">
        <aside className="rounded-[30px] border border-[#e8def7] bg-[#21133f] p-5 text-white shadow-[0_24px_70px_rgba(33,19,63,0.18)]">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#7c3aed] to-[#c026d3]">
              <Sparkles size={24} />
            </div>
            <div>
              <p className="text-lg font-black leading-tight">BuildSetu</p>
              <p className="text-xs font-bold text-white/60">SaaS Admin</p>
            </div>
          </div>

          <nav className="mt-8 space-y-2">
            {[
              ["Overview", Gauge],
              ["Users", Users],
              ["Payments", CreditCard],
              ["Credit Ledger", Wallet],
              ["Tool Analytics", BarChart3],
              ["System Health", ShieldCheck],
            ].map(([label, Icon]: any, index) => (
              <a
                key={label}
                href={`#${label.toLowerCase().replaceAll(" ", "-")}`}
                className={`flex h-11 items-center gap-3 rounded-2xl px-4 text-sm font-black ${
                  index === 0 ? "bg-white text-[#21133f]" : "text-white/70 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon size={18} />
                {label}
              </a>
            ))}
          </nav>

          <div className="mt-8 rounded-3xl bg-white/10 p-4">
            <p className="text-xs font-black uppercase tracking-wide text-white/50">System mode</p>
            <p className="mt-2 text-lg font-black">Production</p>
            <p className="mt-1 text-xs leading-5 text-white/60">
              Auth, admin, credits and Razorpay foundation active.
            </p>
          </div>

          <button
            onClick={logout}
            className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-white text-sm font-black text-[#21133f]"
          >
            <LogOut size={17} />
            Logout
          </button>
        </aside>

        <section className="space-y-5">
          <header className="rounded-[30px] border border-[#e8def7] bg-white p-5 shadow-[0_18px_55px_rgba(65,29,120,0.06)]">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-[#f1e6ff] px-3 py-1 text-[11px] font-black uppercase tracking-wide text-[#7c3aed]">
                  <Activity size={13} />
                  SaaS Control Center
                </div>
                <h1 className="mt-3 text-[38px] font-black leading-none tracking-[-0.07em]">
                  Admin dashboard
                </h1>
                <p className="mt-2 text-sm leading-6 text-[#786a91]">
                  Users, credits, payments, plans, tool usage, ledger and system health in one place.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="flex h-12 min-w-[280px] items-center gap-3 rounded-2xl border border-[#e5daf4] bg-[#fbf8ff] px-4">
                  <Search size={18} className="text-[#7c3aed]" />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search users, email, role..."
                    className="w-full bg-transparent text-sm font-bold outline-none"
                  />
                </div>
                <button
                  onClick={load}
                  className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#21133f] px-5 text-sm font-black text-white"
                >
                  <RefreshCcw size={17} />
                  Refresh
                </button>
              </div>
            </div>
          </header>

          <section id="overview" className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {kpis.map((card) => {
              const Icon = card.icon;

              return (
                <div
                  key={card.label}
                  className="rounded-[26px] border border-[#e8def7] bg-white p-5 shadow-[0_14px_42px_rgba(65,29,120,0.05)]"
                >
                  <div className="flex items-center justify-between">
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
                        card.tone === "green"
                          ? "bg-emerald-50 text-emerald-600"
                          : card.tone === "orange"
                            ? "bg-orange-50 text-orange-600"
                            : "bg-[#f1e6ff] text-[#7c3aed]"
                      }`}
                    >
                      <Icon size={23} />
                    </div>
                    <ArrowUpRight size={18} className="text-[#b9aecb]" />
                  </div>
                  <p className="mt-4 text-xs font-black uppercase tracking-wide text-[#8b7ca6]">
                    {card.label}
                  </p>
                  <p className="mt-1 text-[28px] font-black tracking-[-0.07em] text-[#21133f]">
                    {card.value}
                  </p>
                  <p className="mt-1 text-xs font-bold text-[#8b7ca6]">{card.sub}</p>
                </div>
              );
            })}
          </section>

          <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
            <div id="users" className="rounded-[30px] border border-[#e8def7] bg-white p-5 shadow-[0_18px_55px_rgba(65,29,120,0.05)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-black tracking-[-0.05em]">User management</h2>
                  <p className="mt-1 text-sm text-[#786a91]">Search, inspect and adjust user credits.</p>
                </div>
                <span className="rounded-full bg-[#f1e6ff] px-3 py-1 text-xs font-black text-[#7c3aed]">
                  {num(filteredUsers.length)} users
                </span>
              </div>

              <div className="mt-5 overflow-hidden rounded-[22px] border border-[#eee6f8]">
                <div className="grid grid-cols-[1.4fr_0.7fr_0.8fr_0.8fr] bg-[#fbf8ff] px-4 py-3 text-xs font-black uppercase tracking-wide text-[#8b7ca6]">
                  <span>User</span>
                  <span>Role</span>
                  <span>Credits</span>
                  <span>Actions</span>
                </div>

                <div className="max-h-[460px] overflow-auto">
                  {filteredUsers.map((user: any) => (
                    <div
                      key={user.id}
                      className="grid grid-cols-[1.4fr_0.7fr_0.8fr_0.8fr] items-center border-t border-[#eee6f8] px-4 py-4 text-sm"
                    >
                      <div>
                        <p className="font-black text-[#21133f]">{user.name || "Unnamed user"}</p>
                        <p className="mt-1 text-xs font-bold text-[#786a91]">{user.email || user.phone || user.id}</p>
                        <p className="mt-1 text-[11px] text-[#a197b0]">Joined {fmtDate(user.createdAt)}</p>
                      </div>
                      <div>
                        <span className="rounded-full bg-[#f1e6ff] px-3 py-1 text-xs font-black text-[#7c3aed]">
                          {user.role}
                        </span>
                      </div>
                      <div className="font-black">{num(user.credits)}</div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => adjustCredits(user.id, "ADD")}
                          className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600"
                          title="Add credits"
                        >
                          <Plus size={16} />
                        </button>
                        <button
                          onClick={() => adjustCredits(user.id, "DEDUCT")}
                          className="flex h-9 items-center justify-center rounded-xl bg-red-50 px-3 text-xs font-black text-red-600"
                        >
                          Deduct
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div id="system-health" className="rounded-[30px] border border-[#e8def7] bg-white p-5 shadow-[0_18px_55px_rgba(65,29,120,0.05)]">
              <h2 className="text-2xl font-black tracking-[-0.05em]">System health</h2>
              <p className="mt-1 text-sm text-[#786a91]">Core SaaS services status.</p>

              <div className="mt-5 space-y-3">
                {[
                  ["Auth sessions", "Active", "green"],
                  ["Razorpay checkout", "Connected", "green"],
                  ["Credit ledger", "Tracking", "green"],
                  ["Payment table", summary.paymentCount ? "Receiving data" : "Ready, no records yet", "orange"],
                  ["Demo user dependency", "Pending removal", "orange"],
                  ["Webhook backup", "Next phase", "orange"],
                ].map(([label, status, tone]) => (
                  <div key={label} className="flex items-center justify-between rounded-2xl border border-[#eee6f8] bg-[#fbf8ff] px-4 py-3">
                    <span className="text-sm font-black">{label}</span>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-black ${
                        tone === "green"
                          ? "bg-emerald-50 text-emerald-600"
                          : "bg-orange-50 text-orange-600"
                      }`}
                    >
                      {status}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-5 rounded-[22px] bg-[#21133f] p-5 text-white">
                <p className="text-xs font-black uppercase tracking-wide text-white/50">Next priority</p>
                <h3 className="mt-2 text-xl font-black">User-wise checkout mapping</h3>
                <p className="mt-2 text-sm leading-6 text-white/65">
                  Next patch will create buyer account after payment and remove demo wallet usage.
                </p>
              </div>
            </div>
          </section>

          <section className="grid gap-5 xl:grid-cols-2">
            <div id="credit-ledger" className="rounded-[30px] border border-[#e8def7] bg-white p-5 shadow-[0_18px_55px_rgba(65,29,120,0.05)]">
              <div className="flex items-center gap-2">
                <History size={20} className="text-[#7c3aed]" />
                <h2 className="text-2xl font-black tracking-[-0.05em]">Credit ledger</h2>
              </div>

              <div className="mt-5 space-y-3">
                {(data.transactions || []).slice(0, 12).map((txn: any) => (
                  <div key={txn.id} className="rounded-2xl border border-[#eee6f8] bg-[#fbf8ff] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-black">
                        {txn.actionType} · {txn.creditsUsed > 0 ? "+" : ""}
                        {num(txn.creditsUsed)} credits
                      </p>
                      <p className="text-xs font-bold text-[#8b7ca6]">{fmtDate(txn.createdAt)}</p>
                    </div>
                    <p className="mt-1 text-xs leading-5 text-[#786a91]">
                      {txn.user?.email || "No user"} · {txn.note || "No note"}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div id="tool-analytics" className="rounded-[30px] border border-[#e8def7] bg-white p-5 shadow-[0_18px_55px_rgba(65,29,120,0.05)]">
              <div className="flex items-center gap-2">
                <BarChart3 size={20} className="text-[#7c3aed]" />
                <h2 className="text-2xl font-black tracking-[-0.05em]">Tool analytics</h2>
              </div>

              <div className="mt-5 space-y-3">
                {(data.toolStats || []).slice(0, 10).map((tool: any) => {
                  const max = Math.max(...(data.toolStats || []).map((t: any) => t.count), 1);
                  const width = Math.max(8, Math.round((tool.count / max) * 100));

                  return (
                    <div key={tool.toolType} className="rounded-2xl border border-[#eee6f8] bg-[#fbf8ff] p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-black">{tool.toolType}</p>
                        <p className="text-xs font-bold text-[#8b7ca6]">{num(tool.count)} runs</p>
                      </div>
                      <div className="mt-3 h-2 rounded-full bg-[#eee6f8]">
                        <div
                          className="h-2 rounded-full bg-gradient-to-r from-[#6d28d9] to-[#c026d3]"
                          style={{ width: `${width}%` }}
                        />
                      </div>
                      <p className="mt-2 text-xs text-[#786a91]">{num(tool.creditsUsed)} credits used</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          <section id="payments" className="rounded-[30px] border border-[#e8def7] bg-white p-5 shadow-[0_18px_55px_rgba(65,29,120,0.05)]">
            <div className="flex items-center gap-2">
              <Database size={20} className="text-[#7c3aed]" />
              <h2 className="text-2xl font-black tracking-[-0.05em]">Payments & activity</h2>
            </div>

            <div className="mt-5 grid gap-5 xl:grid-cols-2">
              <div>
                <h3 className="text-sm font-black uppercase tracking-wide text-[#8b7ca6]">Recent payments</h3>
                <div className="mt-3 space-y-3">
                  {(data.payments || []).length ? (
                    data.payments.slice(0, 10).map((payment: any) => (
                      <div key={payment.id} className="rounded-2xl border border-[#eee6f8] bg-[#fbf8ff] p-4">
                        <p className="text-sm font-black">
                          {payment.itemName || payment.type} · {money(payment.amount)}
                        </p>
                        <p className="mt-1 text-xs text-[#786a91]">
                          {payment.user?.email || "No user"} · {payment.status}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-dashed border-[#e8def7] bg-[#fbf8ff] p-5 text-sm font-bold text-[#786a91]">
                      Payment model is ready. New verified payments will appear here after buyer-account checkout mapping.
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-black uppercase tracking-wide text-[#8b7ca6]">Recent activity</h3>
                <div className="mt-3 max-h-[420px] space-y-3 overflow-auto">
                  {(data.recentActivity || []).slice(0, 15).map((item: any) => (
                    <div key={item.id} className="rounded-2xl border border-[#eee6f8] bg-[#fbf8ff] p-4">
                      <div className="flex items-center justify-between gap-3">
                        <span className="rounded-full bg-[#f1e6ff] px-3 py-1 text-[10px] font-black text-[#7c3aed]">
                          {item.type}
                        </span>
                        <span className="text-[11px] font-bold text-[#8b7ca6]">{fmtDate(item.createdAt)}</span>
                      </div>
                      <p className="mt-2 text-sm font-black">{item.title}</p>
                      <p className="mt-1 text-xs leading-5 text-[#786a91]">{item.subtitle}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </section>
      </section>
    </main>
  );
}
