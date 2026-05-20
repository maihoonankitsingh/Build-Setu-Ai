"use client";

import { useEffect, useState } from "react";
import { CreditCard, History, LogOut, Shield, User, Wallet } from "lucide-react";

export default function AccountPage() {
  const [me, setMe] = useState<any>(null);
  const [balance, setBalance] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const meRes = await fetch("/api/auth/me", { cache: "no-store" });
      const meData = await meRes.json();

      if (!meRes.ok || !meData.ok) {
        window.location.href = "/login";
        return;
      }

      setMe(meData.user);

      const balRes = await fetch("/api/credits/balance", { cache: "no-store" });
      const balData = await balRes.json();
      setBalance(balData);

      const historyRes = await fetch("/api/credits/history", { cache: "no-store" });
      const historyData = await historyRes.json();
      setHistory(Array.isArray(historyData.transactions) ? historyData.transactions : []);
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  useEffect(() => {
    load();
  }, []);

  if (loading) {
    return <main className="p-8 text-sm font-bold">Loading account...</main>;
  }

  return (
    <main className="min-h-screen bg-[#fbf8ff] p-5 text-[#21133f]">
      <section className="mx-auto max-w-[1180px]">
        <header className="mb-5 flex items-center justify-between rounded-[24px] bg-white p-5 shadow-sm">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-[#7c3aed]">BuildSetu Account</p>
            <h1 className="mt-1 text-3xl font-black tracking-[-0.06em]">{me?.name || me?.email}</h1>
          </div>
          <button
            onClick={logout}
            className="flex h-11 items-center gap-2 rounded-2xl bg-[#21133f] px-5 text-sm font-black text-white"
          >
            <LogOut size={17} />
            Logout
          </button>
        </header>

        <section className="grid gap-4 md:grid-cols-4">
          <div className="rounded-[22px] bg-white p-5 shadow-sm">
            <Wallet className="h-7 w-7 text-[#7c3aed]" />
            <p className="mt-3 text-xs font-black uppercase text-[#8b7ca6]">Credits</p>
            <p className="mt-1 text-3xl font-black tracking-[-0.06em]">
              {(balance?.credits || me?.credits || 0).toLocaleString("en-IN")}
            </p>
          </div>

          <div className="rounded-[22px] bg-white p-5 shadow-sm">
            <User className="h-7 w-7 text-[#7c3aed]" />
            <p className="mt-3 text-xs font-black uppercase text-[#8b7ca6]">Role</p>
            <p className="mt-1 text-xl font-black">{me?.role}</p>
          </div>

          <div className="rounded-[22px] bg-white p-5 shadow-sm">
            <Shield className="h-7 w-7 text-emerald-500" />
            <p className="mt-3 text-xs font-black uppercase text-[#8b7ca6]">Status</p>
            <p className="mt-1 text-xl font-black">{me?.status}</p>
          </div>

          <a href="/pricing" className="rounded-[22px] bg-gradient-to-r from-[#6d28d9] to-[#c026d3] p-5 text-white shadow-sm">
            <CreditCard className="h-7 w-7" />
            <p className="mt-3 text-xs font-black uppercase text-white/70">Upgrade</p>
            <p className="mt-1 text-xl font-black">Plans & Credits</p>
          </a>
        </section>

        <section className="mt-5 rounded-[24px] bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-[#7c3aed]" />
            <h2 className="text-xl font-black tracking-[-0.04em]">Recent credit ledger</h2>
          </div>

          <div className="mt-4 space-y-3">
            {history.length ? (
              history.slice(0, 20).map((item) => (
                <div key={item.id} className="rounded-2xl border border-[#eee6f8] bg-[#fbf8ff] p-4">
                  <p className="text-sm font-black">
                    {item.actionType} · {item.creditsUsed > 0 ? "+" : ""}
                    {Number(item.creditsUsed).toLocaleString("en-IN")} credits
                  </p>
                  <p className="mt-1 text-xs text-[#786a91]">{item.note}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-[#786a91]">No credit activity yet.</p>
            )}
          </div>
        </section>
      </section>
    </main>
  );
}
