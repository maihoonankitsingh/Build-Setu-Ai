import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Building2,
  CheckCircle2,
  CreditCard,
  FileText,
  ImageIcon,
  Layers3,
  Lock,
  Sparkles,
  Users,
  Wallet,
  Zap,
} from "lucide-react";

const tools = [
  ["Interior Render", "Room brief se premium render workflow", ImageIcon],
  ["Exterior Elevation", "Front design, villa, shop aur facade ideas", Building2],
  ["Magic Brief", "Client requirement ko structured brief me convert kare", Sparkles],
  ["BOQ / Estimate", "Material quantity aur cost estimate draft", FileText],
  ["BBS Generator", "Bar bending schedule draft workflow", Layers3],
  ["Client PDF", "Client-ready proposal PDF workflow", FileText],
];

const plans = [
  {
    name: "Pro",
    price: "₹4,999",
    credits: "100,000",
    desc: "Solo designers aur small studios ke liye",
  },
  {
    name: "Max",
    price: "₹9,999",
    credits: "250,000",
    desc: "Architects aur contractors ke active workflow ke liye",
    popular: true,
  },
  {
    name: "Ultra",
    price: "₹24,999",
    credits: "750,000",
    desc: "Agencies aur multi-client teams ke liye",
  },
];

const usage = [
  ["Magic Brief", "500 credits"],
  ["Client PDF", "500 credits"],
  ["BOQ draft", "1,000 credits"],
  ["BBS draft", "1,500 credits"],
  ["AI render", "2,500 credits"],
];

export default function BuildAiLandingPage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#f3e8ff_0%,#ffffff_42%,#ffffff_100%)] text-[#21133f]">
      <header className="sticky top-0 z-30 border-b border-[#eee6f8] bg-white/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1220px] items-center justify-between px-5 py-4">
          <a href="/" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#7c3aed] to-[#c026d3] text-white shadow-lg">
              <Sparkles size={22} />
            </div>
            <div>
              <p className="text-lg font-black leading-none tracking-[-0.04em]">
                BuildSetu AI
              </p>
              <p className="text-xs font-bold text-[#8b7ca6]">
                AI workspace for AEC teams
              </p>
            </div>
          </a>

          <nav className="hidden items-center gap-6 text-sm font-bold text-[#5f5476] md:flex">
            <a href="#tools" className="hover:text-[#7c3aed]">Tools</a>
            <a href="#pricing" className="hover:text-[#7c3aed]">Pricing</a>
            <a href="#workflow" className="hover:text-[#7c3aed]">Workflow</a>
          </nav>

          <div className="flex items-center gap-3">
            <a
              href="/login"
              className="hidden h-11 items-center justify-center rounded-2xl border border-[#e5daf4] bg-white px-5 text-sm font-black text-[#21133f] shadow-sm hover:bg-[#fbf8ff] sm:flex"
            >
              Login
            </a>
            <a
              href="/pricing"
              className="flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#21133f] px-5 text-sm font-black text-white shadow-[0_14px_34px_rgba(33,19,63,0.22)]"
            >
              Get Started
              <ArrowRight size={17} />
            </a>
          </div>
        </div>
      </header>

      <section className="mx-auto grid max-w-[1220px] gap-8 px-5 pb-14 pt-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
        <div>
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#eadcff] bg-white px-4 py-2 text-xs font-black uppercase tracking-wide text-[#7c3aed] shadow-sm">
            <Sparkles size={15} />
            BuildAI by Sikhadenge
          </div>

          <h1 className="max-w-3xl text-[52px] font-black leading-[0.95] tracking-[-0.08em] text-[#21133f] md:text-[76px]">
            AI workspace for interiors, BOQ, BBS and client documents
          </h1>

          <p className="mt-6 max-w-2xl text-[17px] leading-8 text-[#6c5f84]">
            BuildSetu AI helps designers, architects and contractors generate
            design briefs, renders, estimates, reports and client-ready documents
            from one workspace.
          </p>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <a
              href="/pricing"
              className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#6d28d9] via-[#7c3aed] to-[#c026d3] px-7 text-sm font-black text-white shadow-[0_18px_42px_rgba(124,58,237,0.28)]"
            >
              View Plans
              <ArrowRight size={18} />
            </a>
            <a
              href="/login"
              className="flex h-14 items-center justify-center gap-2 rounded-2xl border border-[#e5daf4] bg-white px-7 text-sm font-black text-[#21133f] shadow-sm hover:bg-[#fbf8ff]"
            >
              Existing user login
            </a>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {[
              ["150,000+", "students & users", Users],
              ["Razorpay", "secure payments", CreditCard],
              ["100,000", "credits from Pro", Wallet],
            ].map(([value, label, Icon]: any) => (
              <div key={label} className="rounded-2xl border border-[#eee6f8] bg-white/80 p-4 shadow-sm">
                <Icon className="h-6 w-6 text-[#7c3aed]" />
                <p className="mt-2 text-[24px] font-black tracking-[-0.06em] text-[#21133f]">
                  {value}
                </p>
                <p className="text-xs font-bold text-[#8b7ca6]">{label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[32px] border border-[#e8def7] bg-white p-4 shadow-[0_24px_80px_rgba(65,29,120,0.12)]">
          <div className="rounded-[26px] bg-[linear-gradient(135deg,#21133f_0%,#3b176b_52%,#7c3aed_100%)] p-5 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-white/55">
                  Workspace preview
                </p>
                <h2 className="mt-2 text-2xl font-black tracking-[-0.05em]">
                  Design project dashboard
                </h2>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
                <BarChart3 size={24} />
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              {[
                ["Credits", "259,500"],
                ["Projects", "18"],
                ["Images", "246"],
                ["Reviews", "7"],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/10">
                  <p className="text-xs font-bold text-white/55">{label}</p>
                  <p className="mt-1 text-3xl font-black tracking-[-0.06em]">{value}</p>
                </div>
              ))}
            </div>

            <div className="mt-5 space-y-3">
              {tools.slice(0, 4).map(([name, desc, Icon]: any) => (
                <div key={name} className="flex items-center gap-3 rounded-2xl bg-white/10 p-3 ring-1 ring-white/10">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15">
                    <Icon size={20} />
                  </span>
                  <span>
                    <p className="text-sm font-black">{name}</p>
                    <p className="text-xs text-white/55">{desc}</p>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="workflow" className="mx-auto max-w-[1220px] px-5 py-10">
        <div className="grid gap-4 md:grid-cols-4">
          {[
            ["1", "Buy plan", "Choose plan or credits from pricing page."],
            ["2", "Account created", "After successful payment, user account will be created."],
            ["3", "Login details", "User gets email and password for dashboard login."],
            ["4", "Use dashboard", "User can access tools, credits, projects and reports."],
          ].map(([step, title, desc]) => (
            <div key={step} className="rounded-[24px] border border-[#e8def7] bg-white p-5 shadow-[0_14px_42px_rgba(65,29,120,0.05)]">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#f1e6ff] text-lg font-black text-[#7c3aed]">
                {step}
              </div>
              <h3 className="mt-4 text-lg font-black tracking-[-0.04em]">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-[#786a91]">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="tools" className="mx-auto max-w-[1220px] px-5 py-10">
        <div className="text-center">
          <div className="mx-auto mb-3 inline-flex items-center gap-2 rounded-full bg-[#f1e6ff] px-3 py-1 text-xs font-black uppercase tracking-wide text-[#7c3aed]">
            <Zap size={14} />
            AI tools
          </div>
          <h2 className="text-[38px] font-black leading-none tracking-[-0.07em]">
            Everything for project workflow
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-[#786a91]">
            Render, estimation, documentation and client proposal tools in one AI workspace.
          </p>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {tools.map(([name, desc, Icon]: any) => (
            <div key={name} className="rounded-[24px] border border-[#e8def7] bg-white p-5 shadow-[0_14px_42px_rgba(65,29,120,0.05)]">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f1e6ff] text-[#7c3aed]">
                <Icon size={23} />
              </div>
              <h3 className="mt-4 text-xl font-black tracking-[-0.05em]">{name}</h3>
              <p className="mt-2 text-sm leading-6 text-[#786a91]">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="pricing" className="mx-auto max-w-[1220px] px-5 py-10">
        <div className="rounded-[32px] border border-[#e8def7] bg-[linear-gradient(135deg,#ffffff_0%,#fbf8ff_56%,#f1e4ff_100%)] p-5 shadow-[0_18px_55px_rgba(65,29,120,0.06)]">
          <div className="text-center">
            <h2 className="text-[38px] font-black leading-none tracking-[-0.07em]">
              Plans built for AEC teams
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-[#786a91]">
              Start with Pro and upgrade as your client/project volume grows.
            </p>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`relative rounded-[26px] border bg-white p-5 shadow-[0_14px_42px_rgba(65,29,120,0.05)] ${
                  plan.popular ? "border-[#8b5cf6] ring-2 ring-[#8b5cf6]/10" : "border-[#e8def7]"
                }`}
              >
                {plan.popular ? (
                  <div className="absolute -top-3 left-5 rounded-full bg-gradient-to-r from-[#6d28d9] to-[#c026d3] px-3 py-1 text-[10px] font-black text-white">
                    MOST POPULAR
                  </div>
                ) : null}

                <p className="text-xs font-black uppercase tracking-wide text-[#8b7ca6]">
                  {plan.name}
                </p>
                <h3 className="mt-2 text-[32px] font-black tracking-[-0.07em]">{plan.price}</h3>
                <p className="mt-1 text-sm font-bold text-[#786a91]">{plan.desc}</p>

                <div className="mt-5 rounded-2xl bg-[#fbf8ff] p-4">
                  <p className="text-xs font-black uppercase tracking-wide text-[#8b7ca6]">Credits</p>
                  <p className="mt-1 text-2xl font-black tracking-[-0.06em]">{plan.credits}</p>
                </div>

                <a
                  href="/pricing"
                  className="mt-5 flex h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#6d28d9] to-[#c026d3] text-sm font-black text-white"
                >
                  Choose plan
                  <ArrowRight size={17} />
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1220px] px-5 py-10">
        <div className="rounded-[28px] border border-[#e8def7] bg-white p-5 shadow-[0_14px_42px_rgba(65,29,120,0.05)]">
          <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <h2 className="text-[30px] font-black tracking-[-0.06em]">
                Credit usage examples
              </h2>
              <p className="mt-2 text-sm leading-6 text-[#786a91]">
                Same usage ratio scaled to large credit system.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-5">
              {usage.map(([name, cost]) => (
                <div key={name} className="rounded-2xl border border-[#eee6f8] bg-[#fbf8ff] p-4 text-center">
                  <p className="text-sm font-black">{name}</p>
                  <p className="mt-1 text-xs font-black text-[#7c3aed]">{cost}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1220px] px-5 pb-14 pt-8">
        <div className="rounded-[32px] bg-[#21133f] p-8 text-center text-white">
          <h2 className="text-[38px] font-black leading-none tracking-[-0.07em]">
            Start your BuildSetu AI workspace
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-white/65">
            Buy a plan, get your login details and start generating client-ready project outputs.
          </p>
          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <a
              href="/pricing"
              className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-white px-6 text-sm font-black text-[#21133f]"
            >
              View pricing
              <ArrowRight size={17} />
            </a>
            <a
              href="/login"
              className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-white/20 px-6 text-sm font-black text-white"
            >
              Login
            </a>
          </div>
        </div>
      </section>

      <footer className="border-t border-[#eee6f8] bg-white py-6">
        <div className="mx-auto flex max-w-[1220px] flex-col gap-3 px-5 text-sm text-[#786a91] md:flex-row md:items-center md:justify-between">
          <p className="font-bold">© BuildSetu AI by Sikhadenge</p>
          <div className="flex gap-4">
            <span className="inline-flex items-center gap-1">
              <BadgeCheck size={15} className="text-emerald-500" />
              Secure Razorpay payments
            </span>
            <span className="inline-flex items-center gap-1">
              <Lock size={15} className="text-[#7c3aed]" />
              User dashboard ready
            </span>
          </div>
        </div>
      </footer>
    </main>
  );
}
