import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Building2,
  Calculator,
  CheckCircle2,
  ChevronDown,
  CreditCard,
  Download,
  FileText,
  ImageIcon,
  Layers3,
  Lock,
  Mail,
  MapPin,
  Menu,
  Phone,
  Play,
  QrCode,
  Shield,
  Sparkles,
  Star,
  Upload,
  Users,
  Wallet,
  Zap,
} from "lucide-react";

const tools = [
  {
    title: "AI Interior & Exterior Renders",
    desc: "Room photos, site photos aur text prompts se premium renders generate karein.",
    icon: ImageIcon,
  },
  {
    title: "BOQ & Estimation Automation",
    desc: "Drawings aur project details se quantity, rate aur cost estimate draft banayein.",
    icon: Calculator,
  },
  {
    title: "BBS Generation",
    desc: "Bar bending schedule draft, steel summary aur engineer review workflow.",
    icon: Layers3,
  },
  {
    title: "Client Proposals & PDFs",
    desc: "Client-ready proposal, report, BOQ PDF aur design presentation export karein.",
    icon: FileText,
  },
  {
    title: "Forms, Payments & Lead Capture",
    desc: "Project intake form, payment summary aur lead pipeline ek dashboard me.",
    icon: CreditCard,
  },
  {
    title: "Multi-project Workspace",
    desc: "Projects, clients, renders, BOQ, BBS aur documents ko organize karein.",
    icon: Building2,
  },
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

const faqs = [
  "What is BuildSetu AI?",
  "How accurate are BOQ and BBS outputs?",
  "What file formats are supported?",
  "Is my project data secure?",
  "Can I buy extra credits after plan purchase?",
];

export default function BuildAiLandingPage() {
  return (
    <main className="min-h-screen bg-white text-[#1f1433]">
      <header className="sticky top-0 z-50 border-b border-[#ece6f6] bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1220px] items-center justify-between px-5 py-4">
          <a href="/" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#6d28d9] to-[#c026d3] text-white shadow-lg">
              <Sparkles size={22} />
            </div>
            <div>
              <p className="text-lg font-black leading-none tracking-[-0.04em]">BuildSetu AI</p>
              <p className="text-xs font-bold text-[#817397]">AEC AI Workspace</p>
            </div>
          </a>

          <nav className="hidden items-center gap-7 text-sm font-bold text-[#5f5476] lg:flex">
            {["Products", "Pricing", "Features", "Resources", "Support"].map((item) => (
              <a key={item} href={item === "Pricing" ? "/pricing" : `#${item.toLowerCase()}`} className="flex items-center gap-1 hover:text-[#7c3aed]">
                {item}
                {item !== "Pricing" ? <ChevronDown size={14} /> : null}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <a href="/pricing" className="hidden h-11 items-center justify-center rounded-xl bg-[#6d28d9] px-5 text-sm font-black text-white shadow-sm md:flex">
              Book Demo
            </a>
            <a href="/login" className="hidden h-11 items-center justify-center rounded-xl border border-[#dcd1ee] bg-white px-5 text-sm font-black text-[#21133f] md:flex">
              Login
            </a>
            <button className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#dcd1ee] bg-white lg:hidden">
              <Menu size={20} />
            </button>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden bg-[radial-gradient(circle_at_top,#f3e8ff_0%,#ffffff_44%,#ffffff_100%)]">
        <div className="absolute left-[8%] top-28 h-48 w-48 rounded-full bg-[#e9d5ff] opacity-45 blur-3xl" />
        <div className="absolute right-[10%] top-36 h-48 w-48 rounded-full bg-[#dbeafe] opacity-50 blur-3xl" />

        <div className="mx-auto max-w-[1220px] px-5 pb-16 pt-12 text-center">
          <div className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-[#eadcff] bg-white px-4 py-2 text-xs font-black uppercase tracking-wide text-[#7c3aed] shadow-sm">
            <Sparkles size={15} />
            AI Workspace for Architecture, Interiors & Construction
          </div>

          <h1 className="mx-auto max-w-[860px] text-[46px] font-black leading-[0.96] tracking-[-0.08em] md:text-[72px]">
            5X Your Project Workflow
            <span className="block bg-gradient-to-r from-[#5b43ea] to-[#c026d3] bg-clip-text text-transparent">
              with the Power of BuildSetu AI
            </span>
          </h1>

          <p className="mx-auto mt-5 max-w-[690px] text-[16px] leading-7 text-[#706381]">
            Interior & exterior renders, BOQ, BBS, client PDFs, project workflows —
            all in one AI workspace for AEC professionals.
          </p>

          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <a href="/pricing" className="flex h-13 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#6d28d9] to-[#c026d3] px-7 py-4 text-sm font-black text-white shadow-[0_16px_38px_rgba(124,58,237,0.28)]">
              Start Free Trial
              <ArrowRight size={18} />
            </a>
            <a href="/login" className="flex h-13 items-center justify-center gap-2 rounded-2xl border border-[#dcd1ee] bg-white px-7 py-4 text-sm font-black text-[#21133f] shadow-sm">
              Book Demo
            </a>
          </div>

          <div className="relative mx-auto mt-12 max-w-[980px]">
            <div className="mx-auto flex h-[370px] max-w-[370px] items-end justify-center rounded-full bg-[radial-gradient(circle,#f4e8ff_0%,#ffffff_67%)] ring-1 ring-[#efe4fb] md:h-[430px] md:max-w-[430px]">
              <div className="relative mb-0 flex h-[330px] w-[255px] flex-col items-center justify-end rounded-t-[130px] bg-gradient-to-b from-[#f8f3ff] to-[#eadbff] shadow-[0_22px_70px_rgba(65,29,120,0.16)]">
                <div className="absolute top-10 h-24 w-24 rounded-full bg-[#f1c7a8]" />
                <div className="absolute top-20 h-32 w-40 rounded-t-[90px] bg-[#171022]" />
                <div className="absolute top-24 h-24 w-24 rounded-full bg-[#f1c7a8]" />
                <div className="absolute top-36 h-16 w-36 rounded-[30px] bg-white" />
                <div className="absolute top-28 flex gap-6">
                  <span className="h-4 w-10 rounded-full border-2 border-[#21133f] bg-white" />
                  <span className="h-4 w-10 rounded-full border-2 border-[#21133f] bg-white" />
                </div>
                <div className="absolute bottom-0 h-44 w-64 rounded-t-[80px] bg-[#f1dfcf]" />
                <div className="absolute bottom-20 h-24 w-20 rounded-2xl bg-[#21133f] shadow-xl" />
              </div>
            </div>

            <HeroCard className="left-0 top-8 hidden md:block" title="Interior Render" sub="Modern living room" icon={ImageIcon} />
            <HeroMetric className="left-0 top-36 hidden md:block" title="BOQ Summary" value="₹18,45,620" />
            <HeroCard className="right-0 top-16 hidden md:block" title="BBS Generated" sub="Column C1 schedule" icon={Layers3} />
            <HeroPdf className="right-4 top-48 hidden md:block" />
            <HeroPayment className="bottom-8 left-10 hidden md:block" />
            <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-3 rounded-2xl border border-[#e8def7] bg-white px-5 py-3 shadow-[0_15px_45px_rgba(65,29,120,0.12)]">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-white">
                <CheckCircle2 size={18} />
              </span>
              <span className="text-left">
                <p className="text-sm font-black">Project Created</p>
                <p className="text-xs font-bold text-[#817397]">Villa Project · 3BHK</p>
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-[#eee6f8] bg-white py-7">
        <div className="mx-auto max-w-[1120px] px-5 text-center">
          <p className="text-sm font-black text-[#817397]">Trusted by 2,000+ architecture & construction firms</p>
          <div className="mt-5 grid grid-cols-2 gap-4 text-sm font-black uppercase tracking-wide text-[#8b8198] md:grid-cols-6">
            {["Studio Archo", "Design Craft", "Urban Grid", "Spaceframe", "ConstructX", "Aetos"].map((logo) => (
              <div key={logo} className="rounded-xl border border-[#eee6f8] bg-[#fbf8ff] px-3 py-3">
                {logo}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1120px] px-5 py-10">
        <div className="rounded-[30px] border border-[#e8def7] bg-[linear-gradient(135deg,#ffffff_0%,#fbf8ff_100%)] p-5 shadow-[0_20px_70px_rgba(65,29,120,0.07)]">
          <div className="text-center">
            <h2 className="text-[28px] font-black tracking-[-0.06em] text-[#5b21b6]">BuildSetu AI Explained</h2>
            <p className="mt-1 text-sm text-[#786a91]">See how BuildSetu AI transforms your workflow in 3 minutes</p>
          </div>

          <div className="relative mt-5 overflow-hidden rounded-[24px] border border-[#e8def7] bg-white p-5">
            <div className="grid gap-4 lg:grid-cols-[210px_1fr_230px]">
              <div className="rounded-2xl bg-[#21133f] p-4 text-white">
                <p className="mb-6 text-sm font-black">BuildSetu AI</p>
                {["Dashboard", "Projects", "Renders", "BOQ", "BBS", "Reports"].map((item, index) => (
                  <div key={item} className={`mb-2 rounded-xl px-3 py-2 text-sm font-bold ${index === 0 ? "bg-white text-[#21133f]" : "text-white/60"}`}>
                    {item}
                  </div>
                ))}
              </div>

              <div>
                <p className="text-xl font-black">Good morning, Ar. Neha</p>
                <div className="mt-4 grid grid-cols-4 gap-3">
                  {["24", "8", "12", "6"].map((v, i) => (
                    <div key={v} className="rounded-2xl bg-[#fbf8ff] p-4 text-center">
                      <p className="text-2xl font-black">{v}</p>
                      <p className="text-xs text-[#817397]">Metric {i + 1}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 space-y-3">
                  {["Raipur Villa", "Dhamtari Shop", "Indore Living Room"].map((p) => (
                    <div key={p} className="rounded-2xl border border-[#eee6f8] bg-white p-4">
                      <p className="font-black">{p}</p>
                      <p className="text-xs text-[#817397]">Project workflow active</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl bg-[#fbf8ff] p-4">
                <p className="text-sm font-black">AI Assistant</p>
                {["Generate BOQ", "Create Proposal", "Interior Render", "BBS from Drawing"].map((item) => (
                  <div key={item} className="mt-3 rounded-xl bg-white px-3 py-2 text-xs font-bold text-[#5f5476]">
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="absolute left-1/2 top-1/2 flex h-20 w-20 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-gradient-to-r from-[#6d28d9] to-[#c026d3] text-white shadow-[0_16px_45px_rgba(124,58,237,0.35)]">
              <Play size={30} fill="currentColor" />
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="mx-auto max-w-[1120px] px-5 py-4">
        <FeatureRender />
        <FeatureBoq />
        <FeatureBbs />
        <FeaturePdf />
        <FeatureForms />
      </section>

      <section className="mx-auto max-w-[1120px] px-5 py-10 text-center">
        <h2 className="text-[32px] font-black tracking-[-0.06em] text-[#5b21b6]">Why BuildSetu AI?</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-4">
          {[
            ["98%", "Estimation Accuracy", BadgeCheck],
            ["5X", "Faster Project Delivery", Zap],
            ["10,000+", "Credits Processed Daily", Wallet],
            ["99%", "Client-ready Outputs", Shield],
          ].map(([value, label, Icon]: any) => (
            <div key={label} className="rounded-[22px] border border-[#e8def7] bg-white p-5 shadow-sm">
              <Icon className="mx-auto h-8 w-8 text-[#7c3aed]" />
              <p className="mt-3 text-2xl font-black tracking-[-0.06em]">{value}</p>
              <p className="text-xs font-bold text-[#817397]">{label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1120px] px-5 py-6">
        <h2 className="text-center text-[30px] font-black tracking-[-0.06em]">Advanced Features that Drive Results</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-4">
          {[
            ["Multi-project Workspace", "Manage clients, projects, teams & tasks.", BarChart3],
            ["Credit-based AI Usage", "Flexible credits for renders, BOQ and BBS.", Wallet],
            ["Shared Dashboard & Analytics", "Track usage and project performance.", Users],
            ["Import Brief & Generate Instantly", "Upload drawing or brief and generate outputs.", Upload],
          ].map(([title, desc, Icon]: any) => (
            <div key={title} className="rounded-[24px] border border-[#e8def7] bg-white p-4 shadow-sm">
              <div className="mb-4 h-28 rounded-2xl bg-[#fbf8ff] p-3">
                <Icon className="h-7 w-7 text-[#7c3aed]" />
                <div className="mt-5 h-2 rounded-full bg-[#e9ddf7]" />
                <div className="mt-2 h-2 w-2/3 rounded-full bg-[#d8c7ee]" />
              </div>
              <h3 className="text-sm font-black">{title}</h3>
              <p className="mt-2 text-xs leading-5 text-[#786a91]">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1120px] px-5 py-10">
        <h2 className="text-center text-[30px] font-black tracking-[-0.06em]">Loved by 2,000+ AEC Professionals</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {["Ar. Priya Nair", "Er. Amit Verma", "Ar. Sneha Kapoor"].map((name, i) => (
            <div key={name} className="rounded-[24px] border border-[#e8def7] bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#f1e6ff] text-xl font-black text-[#7c3aed]">
                  {name.split(" ")[1][0]}
                </div>
                <div>
                  <p className="font-black">{name}</p>
                  <p className="text-xs text-[#817397]">{i === 0 ? "Founder, Studio Archo" : i === 1 ? "Project Head, Urban Grid" : "Design Principal"}</p>
                </div>
              </div>
              <p className="mt-4 text-sm leading-6 text-[#5f5476]">
                BuildSetu AI has transformed our workflow. BOQ, renders and proposals are now faster and more professional.
              </p>
              <div className="mt-4 flex gap-1 text-[#6d28d9]">
                {[1, 2, 3, 4, 5].map((s) => <Star key={s} size={15} fill="currentColor" />)}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1120px] px-5 py-8">
        <div className="grid gap-6 overflow-hidden rounded-[30px] bg-gradient-to-r from-[#4c1d95] to-[#7c3aed] p-7 text-white md:grid-cols-[1fr_1.1fr] md:items-center">
          <div>
            <h2 className="text-[34px] font-black leading-tight tracking-[-0.06em]">
              Start Your Smart Project Workflow in 10 Minutes
            </h2>
            <p className="mt-3 text-sm leading-6 text-white/70">
              Join architects, designers and contractors who trust BuildSetu AI.
            </p>
            <div className="mt-6 flex gap-3">
              <a href="/pricing" className="rounded-xl bg-emerald-500 px-5 py-3 text-sm font-black text-white">Start Free Trial</a>
              <a href="/login" className="rounded-xl bg-white px-5 py-3 text-sm font-black text-[#21133f]">Book Demo</a>
            </div>
          </div>
          <div className="rounded-[24px] bg-white/10 p-4 ring-1 ring-white/15">
            <div className="rounded-2xl bg-white p-4 text-[#21133f]">
              <p className="font-black">Project Dashboard</p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                {["AI Renders", "BOQ & Estimation", "BBS Generation", "Client Proposals"].map((x) => (
                  <div key={x} className="rounded-xl bg-[#fbf8ff] p-3 text-xs font-black text-[#5b21b6]">{x}</div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1120px] px-5 py-8">
        <h2 className="text-center text-[30px] font-black tracking-[-0.06em]">FAQ</h2>
        <div className="mt-5 overflow-hidden rounded-[22px] border border-[#e8def7] bg-white">
          {faqs.map((faq) => (
            <div key={faq} className="flex items-center justify-between border-b border-[#eee6f8] px-5 py-4 last:border-b-0">
              <p className="text-sm font-black">{faq}</p>
              <ChevronDown size={18} className="text-[#817397]" />
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-[#eee6f8] bg-white py-10">
        <div className="mx-auto grid max-w-[1120px] gap-8 px-5 md:grid-cols-[1.5fr_1fr_1fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#6d28d9] text-white">
                <Sparkles size={20} />
              </div>
              <p className="text-lg font-black">BuildSetu AI</p>
            </div>
            <p className="mt-4 text-sm leading-6 text-[#786a91]">
              AI workspace for architecture, interiors and construction workflows.
            </p>
          </div>
          <FooterCol title="Product" items={["AI Renders", "BOQ & Estimation", "BBS Generation", "Client Proposals"]} />
          <FooterCol title="Resources" items={["Blog", "Case Studies", "Templates", "Help Center"]} />
          <FooterCol title="Company" items={["About Us", "Careers", "Partner Program", "Privacy Policy"]} />
          <div>
            <h3 className="text-sm font-black">Get in Touch</h3>
            <div className="mt-4 space-y-3 text-sm text-[#786a91]">
              <p className="flex items-center gap-2"><Mail size={15} /> hello@buildsetu.ai</p>
              <p className="flex items-center gap-2"><Phone size={15} /> +91 98765 43210</p>
              <p className="flex items-center gap-2"><MapPin size={15} /> Raipur, India</p>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}

function HeroCard({ className, title, sub, icon: Icon }: any) {
  return (
    <div className={`absolute w-[210px] rounded-2xl border border-[#e8def7] bg-white p-3 text-left shadow-[0_18px_50px_rgba(65,29,120,0.12)] ${className}`}>
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#f1e6ff] text-[#7c3aed]">
          <Icon size={17} />
        </span>
        <span>
          <p className="text-sm font-black">{title}</p>
          <p className="text-xs text-[#817397]">{sub}</p>
        </span>
      </div>
      <div className="mt-3 h-20 rounded-xl bg-gradient-to-br from-[#e9ddf7] to-[#f8f3ff]" />
    </div>
  );
}

function HeroMetric({ className, title, value }: any) {
  return (
    <div className={`absolute w-[220px] rounded-2xl border border-[#e8def7] bg-white p-4 text-left shadow-[0_18px_50px_rgba(65,29,120,0.12)] ${className}`}>
      <p className="text-sm font-black">{title}</p>
      <p className="mt-2 text-2xl font-black tracking-[-0.06em]">{value}</p>
      <div className="mt-3 h-3 rounded-full bg-[#efe6fb]">
        <div className="h-3 w-[72%] rounded-full bg-[#7c3aed]" />
      </div>
      <p className="mt-2 text-xs text-emerald-600">98% accuracy</p>
    </div>
  );
}

function HeroPdf({ className }: any) {
  return (
    <div className={`absolute w-[230px] rounded-2xl border border-[#e8def7] bg-white p-4 text-left shadow-[0_18px_50px_rgba(65,29,120,0.12)] ${className}`}>
      <p className="text-sm font-black">Client Proposal PDF</p>
      <div className="mt-3 flex items-center gap-3">
        <FileText className="text-red-500" size={28} />
        <span>
          <p className="text-xs font-bold">Modern Villa Proposal.pdf</p>
          <p className="text-[11px] text-[#817397]">12 Pages · 2.4 MB</p>
        </span>
      </div>
    </div>
  );
}

function HeroPayment({ className }: any) {
  return (
    <div className={`absolute w-[210px] rounded-2xl border border-[#e8def7] bg-white p-4 text-left shadow-[0_18px_50px_rgba(65,29,120,0.12)] ${className}`}>
      <p className="text-sm font-black">Payment Received</p>
      <p className="mt-2 text-2xl font-black">₹2,45,000</p>
      <p className="mt-1 text-xs text-[#817397]">From Horizon Homes</p>
    </div>
  );
}

function FeatureRender() {
  return (
    <div className="mb-4 grid gap-4 rounded-[26px] border border-[#e8def7] bg-white p-5 shadow-sm lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
      <FeatureText icon={ImageIcon} title="AI Interior & Exterior Renders" bullets={["100+ Design Styles", "Material & Lighting Control", "HD Renders in Seconds"]} />
      <div className="grid gap-3 md:grid-cols-[1fr_180px]">
        <div className="h-56 rounded-[22px] bg-[linear-gradient(135deg,#d8b4fe_0%,#f5f3ff_40%,#c4b5fd_100%)] p-4">
          <div className="h-full rounded-[18px] bg-white/50" />
        </div>
        <div className="rounded-[22px] border border-[#e8def7] bg-[#fbf8ff] p-3">
          <div className="mb-3 h-20 rounded-xl bg-white" />
          <div className="mb-3 h-20 rounded-xl bg-white" />
          <button className="w-full rounded-xl bg-[#6d28d9] py-2 text-xs font-black text-white">Generate</button>
        </div>
      </div>
    </div>
  );
}

function FeatureBoq() {
  return (
    <div className="mb-4 grid gap-4 rounded-[26px] border border-[#e8def7] bg-white p-5 shadow-sm lg:grid-cols-2 lg:items-center">
      <div className="rounded-[22px] bg-[#fbf8ff] p-4">
        <p className="font-black">BOQ - Ground Floor</p>
        {["RCC Work", "Brick Masonry", "Plastering", "Flooring", "Electrical"].map((x) => (
          <div key={x} className="mt-3 grid grid-cols-4 gap-2 text-xs text-[#5f5476]">
            <span>{x}</span><span>Qty</span><span>Rate</span><span>Amount</span>
          </div>
        ))}
      </div>
      <FeatureText icon={Calculator} title="BOQ & Estimation Automation" bullets={["Auto Quantity Take-off", "Rate Analysis & Costing", "Excel & PDF Export"]} />
    </div>
  );
}

function FeatureBbs() {
  return (
    <div className="mb-4 grid gap-4 rounded-[26px] border border-[#e8def7] bg-white p-5 shadow-sm lg:grid-cols-2 lg:items-center">
      <FeatureText icon={Layers3} title="BBS Generation in One Click" bullets={["Drawing to BBS in Seconds", "IS Code Compliant", "Excel & PDF Output"]} />
      <div className="rounded-[22px] bg-[#fbf8ff] p-4">
        <p className="font-black">BBS - Column C1</p>
        <div className="mt-3 grid grid-cols-4 gap-2 text-xs font-bold text-[#817397]">
          <span>Dia</span><span>Qty</span><span>Cut Length</span><span>Steel</span>
        </div>
        {["12mm", "16mm", "20mm", "8mm"].map((x) => (
          <div key={x} className="mt-3 grid grid-cols-4 gap-2 rounded-xl bg-white p-3 text-xs">
            <span>{x}</span><span>12</span><span>4.5m</span><span>54kg</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function FeaturePdf() {
  return (
    <div className="mb-4 grid gap-4 rounded-[26px] border border-[#e8def7] bg-white p-5 shadow-sm lg:grid-cols-2 lg:items-center">
      <div className="rounded-[22px] bg-[#fbf8ff] p-4">
        <p className="font-black">Modern Villa Proposal</p>
        <div className="mt-4 h-40 rounded-2xl bg-white" />
        <button className="mt-4 flex items-center gap-2 rounded-xl bg-[#6d28d9] px-4 py-2 text-sm font-black text-white">
          <Download size={16} />
          Download PDF
        </button>
      </div>
      <FeatureText icon={FileText} title="Client Proposals & PDFs" bullets={["Ready-made Templates", "Auto BOQ & Cost Summary", "Branded PDF Export"]} />
    </div>
  );
}

function FeatureForms() {
  return (
    <div className="mb-4 grid gap-4 rounded-[26px] border border-[#e8def7] bg-white p-5 shadow-sm lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
      <FeatureText icon={CreditCard} title="Forms, Payments & Lead Capture" bullets={["Smart Forms & Briefs", "Online Payments", "Project Workflow Automation"]} />
      <div className="grid gap-3 md:grid-cols-3">
        {["Project Brief Form", "Payment Summary", "Lead Pipeline"].map((x, i) => (
          <div key={x} className="rounded-[20px] bg-[#fbf8ff] p-4">
            <p className="text-sm font-black">{x}</p>
            <p className="mt-4 text-2xl font-black">{i === 0 ? "Form" : i === 1 ? "₹2,45,000" : "28"}</p>
            <p className="text-xs text-[#817397]">{i === 1 ? "Paid via Razorpay" : "Active"}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function FeatureText({ icon: Icon, title, bullets }: any) {
  return (
    <div>
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f1e6ff] text-[#7c3aed]">
        <Icon size={23} />
      </div>
      <h2 className="mt-4 text-[24px] font-black tracking-[-0.05em] text-[#5b21b6]">{title}</h2>
      <p className="mt-3 max-w-md text-sm leading-6 text-[#786a91]">
        Create professional project outputs in seconds. Customize details, materials and documentation with simple prompts.
      </p>
      <div className="mt-4 space-y-2">
        {bullets.map((b: string) => (
          <p key={b} className="flex items-center gap-2 text-sm font-bold text-[#5f5476]">
            <CheckCircle2 size={16} className="text-[#6d28d9]" />
            {b}
          </p>
        ))}
      </div>
    </div>
  );
}

function FooterCol({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h3 className="text-sm font-black">{title}</h3>
      <div className="mt-4 space-y-2">
        {items.map((item) => (
          <a key={item} href="#" className="block text-sm text-[#786a91] hover:text-[#7c3aed]">
            {item}
          </a>
        ))}
      </div>
    </div>
  );
}
