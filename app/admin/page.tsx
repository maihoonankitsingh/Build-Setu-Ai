"use client";

import { useEffect, useState } from "react";
import { BarChart3, CreditCard, Database, LogOut, Users, Wallet } from "lucide-react";

function money(value: number) {
  return "₹" + Number(value || 0).toLocaleString("en-IN");
}

export default function AdminPage() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");

  async function load() {
    const res = await fetch("/api/admin/overview", { cache: "no-store" });
    const json = await res.json();

    if (!res.ok || !json.ok) {
      setError(json.error || "Admin access required");
      return;
    }

    setData(json);
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  useEffect(() => {
    load();
  }, []);

  if (error) {
    return (
      <main className="min-h-screen bg-[#fbf8ff] p-8 text-[#21133f]">
        <div className="mx-auto max-w-lg rounded-[24px] bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-black">Admin login required</h1>
          <p className="mt-2 text-sm text-[#786a91]">{error}</p>
          <a href="/login" className="mt-5 inline-flex rounded-2xl bg-[#21133f] px-5 py-3 text-sm font-black text-white">
            Login
          </a>
        </div>
      </main>
    );
  }

  if (!data) return <main className="p-8 text-sm font-bold">Loading admin...</main>;

  const cards = [
    ["Users", data.summary.userCount, Users],
    ["Payments", data.summary.paymentCount, CreditCard],
    ["Transactions", data.summary.transactionCount, Wallet],
    ["Tool Runs", data.summary.toolRunCount, BarChart3],
  ];

  return (
    <main className="min-h-screen bg-[#fbf8ff] p-5 text-[#21133f]">
      <section className="mx-auto max-w-[1320px]">
        <header className="mb-5 flex items-center justify-between rounded-[24px] bg-white p-5 shadow-sm">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-[#7c3aed]">BuildSetu Admin</p>
            <h1 className="mt-1 text-3xl font-black tracking-[-0.06em]">SaaS Control Center</h1>
          </div>
          <button onClick={logout} className="flex h-11 items-center gap-2 rounded-2xl bg-[#21133f] px-5 text-sm font-black text-white">
            <LogOut size={17} />
            Logout
          </button>
        </header>

        <section className="grid gap-4 md:grid-cols-5">
          {cards.map(([label, value, Icon]: any) => (
            <div key={label} className="rounded-[22px] bg-white p-5 shadow-sm">
              <Icon className="h-7 w-7 text-[#7c3aed]" />
              <p className="mt-3 text-xs font-black uppercase text-[#8b7ca6]">{label}</p>
              <p className="mt-1 text-3xl font-black tracking-[-0.06em]">{Number(value).toLocaleString("en-IN")}</p>
            </div>
          ))}
          <div className="rounded-[22px] bg-gradient-to-r from-[#6d28d9] to-[#c026d3] p-5 text-white shadow-sm">
            <Database className="h-7 w-7" />
            <p className="mt-3 text-xs font-black uppercase text-white/70">Verified Revenue</p>
            <p className="mt-1 text-3xl font-black tracking-[-0.06em]">{money(data.summary.verifiedRevenue)}</p>
          </div>
        </section>

        <section className="mt-5 grid gap-5 lg:grid-cols-2">
          <div className="rounded-[24px] bg-white p-5 shadow-sm">
            <h2 className="text-xl font-black tracking-[-0.04em]">Latest users</h2>
            <div className="mt-4 space-y-3">
              {data.users.map((user: any) => (
                <div key={user.id} className="rounded-2xl border border-[#eee6f8] bg-[#fbf8ff] p-4">
                  <p className="text-sm font-black">{user.name || user.email || "Unnamed user"}</p>
                  <p className="mt-1 text-xs text-[#786a91]">
                    {user.email} · {user.role} · {Number(user.credits).toLocaleString("en-IN")} credits
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[24px] bg-white p-5 shadow-sm">
            <h2 className="text-xl font-black tracking-[-0.04em]">Latest ledger</h2>
            <div className="mt-4 space-y-3">
              {data.transactions.map((txn: any) => (
                <div key={txn.id} className="rounded-2xl border border-[#eee6f8] bg-[#fbf8ff] p-4">
                  <p className="text-sm font-black">
                    {txn.actionType} · {txn.creditsUsed > 0 ? "+" : ""}
                    {Number(txn.creditsUsed).toLocaleString("en-IN")} credits
                  </p>
                  <p className="mt-1 text-xs text-[#786a91]">
                    {txn.user?.email || "No user"} · {txn.note}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
