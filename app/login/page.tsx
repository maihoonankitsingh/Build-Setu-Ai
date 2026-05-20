"use client";

import { useState } from "react";
import { ArrowRight, Lock, Mail, Sparkles } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function login() {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Login failed");
      }

      window.location.href = data.user?.role === "ADMIN" ? "/admin" : "/account";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#f4e8ff_0%,#ffffff_45%,#ffffff_100%)] px-5 py-10 text-[#21133f]">
      <section className="mx-auto grid max-w-[980px] gap-6 lg:grid-cols-[1fr_420px] lg:items-center">
        <div>
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-black uppercase tracking-wide text-[#7c3aed] shadow-sm ring-1 ring-[#eadcff]">
            <Sparkles size={15} />
            BuildSetu AI
          </div>
          <h1 className="text-[44px] font-black leading-none tracking-[-0.07em] md:text-[64px]">
            Login to your AI workspace
          </h1>
          <p className="mt-5 max-w-xl text-[15px] leading-7 text-[#786a91]">
            Access credits, plans, projects, renders, BOQ, BBS, reports and client-ready documents.
          </p>
        </div>

        <div className="rounded-[28px] border border-[#e8def7] bg-white p-6 shadow-[0_22px_70px_rgba(65,29,120,0.10)]">
          <h2 className="text-2xl font-black tracking-[-0.05em]">Sign in</h2>
          <p className="mt-2 text-sm text-[#786a91]">Use the login details generated after purchase.</p>

          <label className="mt-6 block text-sm font-black text-[#21133f]">Email</label>
          <div className="mt-2 flex h-12 items-center gap-3 rounded-2xl border border-[#e5daf4] bg-[#fbf8ff] px-4">
            <Mail size={18} className="text-[#7c3aed]" />
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-transparent text-sm font-bold outline-none"
              placeholder="you@example.com"
            />
          </div>

          <label className="mt-4 block text-sm font-black text-[#21133f]">Password</label>
          <div className="mt-2 flex h-12 items-center gap-3 rounded-2xl border border-[#e5daf4] bg-[#fbf8ff] px-4">
            <Lock size={18} className="text-[#7c3aed]" />
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              className="w-full bg-transparent text-sm font-bold outline-none"
              placeholder="password"
              onKeyDown={(e) => {
                if (e.key === "Enter") login();
              }}
            />
          </div>

          {error ? (
            <div className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
              {error}
            </div>
          ) : null}

          <button
            onClick={login}
            disabled={loading}
            className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#6d28d9] to-[#c026d3] text-sm font-black text-white shadow-[0_14px_34px_rgba(124,58,237,0.25)] disabled:opacity-70"
          >
            {loading ? "Signing in..." : "Login"}
            <ArrowRight size={18} />
          </button>

          <p className="mt-4 text-center text-xs font-bold text-[#8b7ca6]">
            Account is created automatically after successful payment.
          </p>
        </div>
      </section>
    </main>
  );
}
