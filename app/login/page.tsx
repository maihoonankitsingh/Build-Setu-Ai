"use client";

import Link from "next/link";
import {
  ArrowRight,
  Building2,
  Calculator,
  Eye,
  EyeOff,
  FileText,
  Home,
  Lock,
  Mail,
  ShieldCheck,
  Sparkles,
  User,
  Wand2,
} from "lucide-react";
import { useEffect, useState } from "react";

type Mode = "login" | "signup";

function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06L5.84 9.9C6.71 7.3 9.14 5.38 12 5.38z" />
    </svg>
  );
}

const features = [
  { label: "AI Brief", icon: Wand2 },
  { label: "Renders", icon: Home },
  { label: "BOQ / BBS", icon: Calculator },
  { label: "Client PDF", icon: FileText },
];

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>("login");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("mode") === "signup") setMode("signup");
  }, []);

  const isSignup = mode === "signup";

  return (
    <main className="min-h-screen overflow-hidden bg-[#fbf8ff] px-4 py-3 text-[#241247] sm:px-5">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute -left-28 -top-32 h-80 w-80 rounded-full bg-[#8B5CF6]/20 blur-3xl" />
        <div className="absolute -right-28 top-16 h-80 w-80 rounded-full bg-[#C084FC]/20 blur-3xl" />
        <div className="absolute bottom-[-150px] left-[36%] h-80 w-80 rounded-full bg-[#7C3AED]/10 blur-3xl" />
      </div>

      <section className="relative mx-auto flex min-h-[calc(100vh-24px)] max-w-4xl items-center justify-center">
        <div className="grid w-full overflow-hidden rounded-[26px] border border-[#eadcff] bg-white shadow-[0_22px_80px_rgba(80,43,130,0.14)] lg:grid-cols-[0.92fr_0.9fr]">
          <aside className="relative flex min-h-[430px] flex-col justify-center bg-gradient-to-br from-[#ffffff] via-[#fbf7ff] to-[#f1e5ff] p-5 sm:p-6">
            <div className="absolute right-5 top-5 hidden rounded-full bg-white/80 px-4 py-2 text-xs font-semibold text-[#6f42c1] shadow-sm sm:block">
              Powered by Sikhadenge
            </div>

            <Link href="/buildai" className="inline-flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[#7C2FEF] text-white shadow-[0_12px_25px_rgba(124,47,239,0.28)]">
                <Building2 className="h-5 w-5" />
              </span>
              <span>
                <span className="block text-xl font-bold tracking-[-0.04em] text-[#241247]">
                  BuildSetu
                </span>
                <span className="block -mt-1 text-xl font-bold tracking-[-0.04em] text-[#8B5CF6]">
                  AI
                </span>
              </span>
            </Link>

            <div className="mt-5 max-w-md">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#eadcff] bg-white px-3 py-1.5 text-xs font-semibold text-[#6f42c1] shadow-sm">
                <Sparkles className="h-3.5 w-3.5" />
                AI construction workspace
              </div>

              <h1 className="text-[24px] font-bold leading-[1.05] tracking-[-0.05em] text-[#241247] sm:text-[34px]">
                Manage your design and construction workflow.
              </h1>

              <p className="mt-3 text-xs font-medium leading-5 text-[#7d6a9d]">
                Create project briefs, interior renders, elevation concepts, BOQ drafts, BBS summaries and client-ready PDFs in one workspace.
              </p>
            </div>

            <div className="mt-4 grid max-w-md grid-cols-2 gap-2.5">
              {features.map(({ label, icon: Icon }) => (
                <div
                  key={label}
                  className="flex items-center gap-3 rounded-2xl border border-[#eadcff] bg-white p-2.5 shadow-sm"
                >
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-xl bg-[#f0ddff] text-[#7C2FEF]">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="text-xs font-semibold text-[#4d376f]">{label}</span>
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-2xl border border-[#eadcff] bg-white p-3 shadow-sm">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#7C2FEF]" />
                <p className="text-xs font-medium leading-5 text-[#7d6a9d]">
                  AI outputs are drafts for planning and discussion. Construction-critical documents need professional review.
                </p>
              </div>
            </div>
          </aside>

          <section className="flex min-h-[430px] items-center justify-center bg-white p-4 sm:p-5">
            <div className="w-full max-w-[350px]">
              <div className="grid grid-cols-2 rounded-2xl bg-[#f0e2ff] p-1">
                <button
                  type="button"
                  onClick={() => setMode("login")}
                  className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
                    !isSignup
                      ? "bg-[#241247] text-white shadow-sm"
                      : "text-[#6f42c1] hover:bg-white/60"
                  }`}
                >
                  Login
                </button>
                <button
                  type="button"
                  onClick={() => setMode("signup")}
                  className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
                    isSignup
                      ? "bg-[#241247] text-white shadow-sm"
                      : "text-[#6f42c1] hover:bg-white/60"
                  }`}
                >
                  Signup
                </button>
              </div>

              <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7C2FEF]">
                  {isSignup ? "Create account" : "Secure login"}
                </p>
                <h2 className="mt-2 text-[24px] font-bold tracking-[-0.045em] text-[#241247]">
                  {isSignup ? "Start BuildSetu AI" : "Welcome back"}
                </h2>
                <p className="mt-2 text-xs font-medium leading-5 text-[#7d6a9d]">
                  {isSignup
                    ? "Create your workspace and start managing AI projects."
                    : "Login to access credits, projects, tools and exports."}
                </p>
              </div>

              <a
                href="/api/auth/google"
                className="mt-4 flex w-full items-center justify-center gap-3 rounded-2xl border border-[#eadcff] bg-white px-4 py-2.5 text-sm font-semibold text-[#241247] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <GoogleIcon />
                Continue with Google
              </a>

              <div className="my-3 flex items-center gap-3">
                <div className="h-px flex-1 bg-[#eadcff]" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#a18abf]">
                  or email
                </span>
                <div className="h-px flex-1 bg-[#eadcff]" />
              </div>

              <form
                method="POST"
                action={isSignup ? "/api/auth/signup" : "/api/auth/login"}
                className="space-y-2.5"
              >
                {isSignup && (
                  <label className="block">
                    <span className="mb-1 block text-[11px] font-semibold text-[#4d376f]">
                      Full name
                    </span>
                    <div className="flex items-center gap-3 rounded-2xl border border-[#eadcff] bg-[#fbf8ff] px-3 py-2 focus-within:border-[#7C2FEF] focus-within:bg-white">
                      <User className="h-4 w-4 text-[#7C2FEF]" />
                      <input
                        name="name"
                        required
                        placeholder="Your name"
                        className="w-full bg-transparent text-sm font-medium text-[#241247] outline-none placeholder:text-[#a796bd]"
                      />
                    </div>
                  </label>
                )}

                <label className="block">
                  <span className="mb-1 block text-[11px] font-semibold text-[#4d376f]">
                    Email
                  </span>
                  <div className="flex items-center gap-3 rounded-2xl border border-[#eadcff] bg-[#fbf8ff] px-3 py-2 focus-within:border-[#7C2FEF] focus-within:bg-white">
                    <Mail className="h-4 w-4 text-[#7C2FEF]" />
                    <input
                      type="email"
                      name="email"
                      required
                      placeholder="you@example.com"
                      className="w-full bg-transparent text-sm font-medium text-[#241247] outline-none placeholder:text-[#a796bd]"
                    />
                  </div>
                </label>

                <label className="block">
                  <span className="mb-1 block text-[11px] font-semibold text-[#4d376f]">
                    Password
                  </span>
                  <div className="flex items-center gap-3 rounded-2xl border border-[#eadcff] bg-[#fbf8ff] px-3 py-2 focus-within:border-[#7C2FEF] focus-within:bg-white">
                    <Lock className="h-4 w-4 text-[#7C2FEF]" />
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      required
                      minLength={6}
                      placeholder="password"
                      className="w-full bg-transparent text-sm font-medium text-[#241247] outline-none placeholder:text-[#a796bd]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      className="text-[#7C2FEF]"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </label>

                <button
                  type="submit"
                  className="group flex w-full items-center justify-center gap-2.5 rounded-2xl bg-[#7C2FEF] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(124,47,239,0.28)] transition hover:-translate-y-0.5 hover:bg-[#6825d8]"
                >
                  {isSignup ? "Create account" : "Login"}
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                </button>
              </form>

              <p className="mt-3 text-center text-xs font-medium text-[#7d6a9d]">
                {isSignup ? "Already have an account?" : "New to BuildSetu AI?"}{" "}
                <button
                  type="button"
                  onClick={() => setMode(isSignup ? "login" : "signup")}
                  className="font-semibold text-[#7C2FEF] underline-offset-4 hover:underline"
                >
                  {isSignup ? "Login here" : "Create account"}
                </button>
              </p>
</div>
          </section>
        </div>
      </section>
    </main>
  );
}
