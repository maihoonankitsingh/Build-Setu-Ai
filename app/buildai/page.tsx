import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Calculator,
  CheckCircle2,
  ChevronDown,
  CreditCard,
  FileText,
  ImageIcon,
  Layers3,
  Lock,
  Mail,
  MapPin,
  Menu,
  Phone,
  Play,
  Shield,
  Sparkles,
  Star,
  Upload,
  Users,
  Wallet,
  Zap,
} from "lucide-react";

const logos = ["Studio Archo", "Design Craft", "Urban Grid", "SpaceFrame", "ConstructX", "Aetos"];

const usage = [
  ["Magic Brief", "500 credits"],
  ["Client PDF", "500 credits"],
  ["BOQ draft", "1,000 credits"],
  ["BBS draft", "1,500 credits"],
  ["AI render", "2,500 credits"],
];

const featureCards = [
  ["Multi-project Workspace", "Manage projects, clients, renders, BOQ and documents in one place.", BarChart3],
  ["Credit-based AI Usage", "Transparent credit balance and usage-led workflow.", Wallet],
  ["Shared Dashboard & Analytics", "Track leads, projects, estimates and AI outputs.", Users],
  ["Import Brief & Generate", "Upload brief, drawing or prompt and generate instantly.", Upload],
];

const faqs = [
  "What is BuildSetu AI?",
  "How accurate are BOQ and BBS outputs?",
  "What file formats are supported?",
  "Is my data secure?",
  "Can I try BuildSetu AI before purchasing?",
];

export default function BuildAiLandingPage() {
  return (
    <main className="min-h-screen bg-white text-[#21133f]">
      <header className="sticky top-0 z-50 border-b border-[#eee6f8] bg-white/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1180px] items-center justify-between px-5 py-4">
          <a href="/buildai" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#6d28d9] to-[#c026d3] text-white shadow-md">
              <Sparkles size={21} />
            </div>
            <div>
              <p className="text-lg font-black leading-none tracking-[-0.04em]">BuildSetu AI</p>
            </div>
          </a>

          <nav className="hidden items-center gap-7 text-sm font-bold text-[#5f5476] lg:flex">
            {["Products", "Pricing", "Features", "Resources", "Support"].map((item) => (
              <a
                key={item}
                href={item === "Pricing" ? "/pricing" : `#${item.toLowerCase()}`}
                className="flex items-center gap-1 hover:text-[#7c3aed]"
              >
                {item}
                {item !== "Pricing" ? <ChevronDown size={14} /> : null}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <a href="/pricing" className="hidden h-10 items-center justify-center rounded-xl bg-[#6d28d9] px-5 text-sm font-black text-white shadow-md md:flex">
              Book Demo
            </a>
            <a href="/login" className="hidden h-10 items-center justify-center rounded-xl border border-[#e1d7ef] bg-white px-5 text-sm font-black text-[#21133f] md:flex">
              Login
            </a>
            <button className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#e1d7ef] lg:hidden">
              <Menu size={20} />
            </button>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden bg-[radial-gradient(circle_at_top,#f5edff_0%,#ffffff_50%,#ffffff_100%)]">
        <div className="absolute left-[8%] top-24 h-64 w-64 rounded-full bg-[#e9d5ff] opacity-60 blur-3xl" />
        <div className="absolute right-[8%] top-32 h-64 w-64 rounded-full bg-[#ddd6fe] opacity-60 blur-3xl" />

        <div className="relative mx-auto max-w-[1180px] px-5 pb-12 pt-10 text-center">
          <div className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full border border-[#eadcff] bg-white px-4 py-2 text-[12px] font-black uppercase tracking-wide text-[#7c3aed] shadow-sm">
            <Sparkles size={14} />
            AI Workspace for Architecture, Interiors & Construction
          </div>

          <h1 className="mx-auto max-w-[860px] text-[42px] font-black leading-[0.98] tracking-[-0.08em] md:text-[68px]">
            5X Your Project Workflow
            <span className="block bg-gradient-to-r from-[#6d28d9] to-[#4f46e5] bg-clip-text text-transparent">
              with the Power of BuildSetu AI
            </span>
          </h1>

          <p className="mx-auto mt-4 max-w-[660px] text-[15px] leading-7 text-[#706381]">
            Interior & Exterior Renders, BOQ, BBS, Client PDFs, Project Workflows —
            All in one AI workspace for AEC professionals.
          </p>

          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <a href="/pricing" className="inline-flex h-[50px] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#6d28d9] to-[#7c3aed] px-7 text-sm font-black text-white shadow-[0_16px_38px_rgba(124,58,237,0.28)]">
              Start Free Trial
              <ArrowRight size={17} />
            </a>
            <a href="/login" className="inline-flex h-[50px] items-center justify-center gap-2 rounded-xl border border-[#dcd1ee] bg-white px-7 text-sm font-black text-[#21133f] shadow-sm">
              Book Demo
            </a>
          </div>

          <div className="relative mx-auto mt-8 max-w-[940px]">
            <img src="/buildai-assets/hero-person.svg" alt="BuildSetu AI hero" className="mx-auto w-full max-w-[760px]" />

            <FloatCard className="left-0 top-8 hidden md:block" title="Interior Render" sub="Modern living room" image />
            <FloatMetric className="left-0 top-[175px] hidden md:block" title="BOQ Summary" value="₹18,45,620" sub="98% accuracy" />
            <FloatPayment className="bottom-16 left-6 hidden md:block" />

            <FloatBbs className="right-0 top-10 hidden md:block" />
            <FloatPdf className="right-0 top-[190px] hidden md:block" />
            <FloatOrder className="bottom-16 right-3 hidden md:block" />

            <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-3 rounded-2xl border border-[#e8def7] bg-white px-5 py-3 shadow-[0_15px_45px_rgba(65,29,120,0.12)]">
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

      <section className="border-y border-[#eee6f8] bg-white py-6">
        <div className="mx-auto max-w-[1040px] px-5 text-center">
          <p className="text-sm font-black text-[#817397]">Trusted by 2,000+ Architecture & Construction Firms</p>
          <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-6">
            {logos.map((logo) => (
              <div key={logo} className="rounded-xl px-3 py-2 text-sm font-black uppercase tracking-wide text-[#8b8198]">
                {logo}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1040px] px-5 py-8">
        <div className="rounded-[26px] border border-[#e8def7] bg-[linear-gradient(135deg,#ffffff_0%,#fbf8ff_100%)] p-5 shadow-[0_16px_55px_rgba(65,29,120,0.08)]">
          <div className="text-center">
            <h2 className="text-[28px] font-black tracking-[-0.06em] text-[#5b21b6]">BuildSetu AI Explained</h2>
            <p className="mt-1 text-sm text-[#786a91]">See how BuildSetu AI transforms your workflow in 3 minutes</p>
          </div>

          <div className="relative mt-5">
            <img src="/buildai-assets/dashboard-preview.svg" alt="BuildSetu AI dashboard preview" className="w-full rounded-[22px] border border-[#e8def7]" />
            <div className="absolute left-1/2 top-1/2 flex h-20 w-20 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-gradient-to-r from-[#6d28d9] to-[#7c3aed] text-white shadow-[0_16px_45px_rgba(124,58,237,0.35)]">
              <Play size={30} fill="currentColor" />
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="mx-auto max-w-[1040px] px-5 py-2">
        <FeatureRow
          title="AI Interior & Exterior Renders"
          desc="Create photorealistic interior & exterior renders in seconds. Customize styles, materials and lighting with simple prompts."
          image="/buildai-assets/feature-render.svg"
          icon={ImageIcon}
          points={["100+ Design Styles", "Material & Lighting Control", "HD Renders in Seconds"]}
        />

        <FeatureRow
          reverse
          title="BOQ & Estimation Automation"
          desc="AI-powered BOQ from drawings. Get accurate quantities, rate analysis and cost estimates in minutes."
          image="/buildai-assets/feature-boq.svg"
          icon={Calculator}
          points={["Auto Quantity Take-off", "Rate Analysis & Costing", "Excel & PDF Export"]}
        />

        <FeatureRow
          title="BBS Generation in One Click"
          desc="Generate detailed Bar Bending Schedule from structural drawings with high accuracy."
          image="/buildai-assets/feature-bbs.svg"
          icon={Layers3}
          points={["Drawing to BBS in Seconds", "IS Code Compliant", "Excel & PDF Output"]}
        />

        <FeatureRow
          reverse
          title="Client Proposals & PDFs"
          desc="Create branded proposals, BOQ, drawings and reports. Export beautiful, professional PDFs for your clients."
          image="/buildai-assets/feature-pdf.svg"
          icon={FileText}
          points={["Ready-made Templates", "Auto BOQ & Cost Summary", "Branded PDF Export"]}
        />

        <div className="mb-5 grid gap-5 rounded-[24px] border border-[#e8def7] bg-white p-5 shadow-sm lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
          <div>
            <IconBubble icon={CreditCard} />
            <h2 className="mt-4 text-[25px] font-black tracking-[-0.05em] text-[#5b21b6]">Forms, Payments & Lead Capture</h2>
            <p className="mt-3 max-w-md text-sm leading-6 text-[#786a91]">
              Capture leads, collect project briefs, accept payments and manage projects — all in one place.
            </p>
            <Bullet text="Smart Forms & Briefs" />
            <Bullet text="Online Payments" />
            <Bullet text="Project Workflow Automation" />
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {[
              ["Project Brief Form", "Residential", "Submit"],
              ["Payment Summary", "₹2,45,000", "Paid"],
              ["Lead Pipeline", "28", "New Leads"],
            ].map(([title, value, tag]) => (
              <div key={title} className="rounded-[20px] border border-[#eee6f8] bg-[#fbf8ff] p-4">
                <p className="text-sm font-black">{title}</p>
                <p className="mt-5 text-2xl font-black tracking-[-0.06em]">{value}</p>
                <p className="mt-2 rounded-xl bg-white px-3 py-2 text-center text-xs font-black text-[#7c3aed]">{tag}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1040px] px-5 py-8 text-center">
        <h2 className="text-[30px] font-black tracking-[-0.06em] text-[#5b21b6]">Why BuildSetu AI?</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-4">
          {[
            ["98%", "Estimation Accuracy", BadgeCheck],
            ["5X", "Faster Project Delivery", Zap],
            ["10,000+", "Credits Processed Daily", Wallet],
            ["99%", "Client-ready Outputs", Shield],
          ].map(([value, label, Icon]: any) => (
            <div key={label} className="rounded-[20px] border border-[#e8def7] bg-white p-5 shadow-sm">
              <Icon className="mx-auto h-7 w-7 text-[#7c3aed]" />
              <p className="mt-3 text-2xl font-black tracking-[-0.06em]">{value}</p>
              <p className="text-xs font-bold text-[#817397]">{label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1040px] px-5 py-4">
        <h2 className="text-center text-[28px] font-black tracking-[-0.06em]">Advanced Features that Drive Results</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-4">
          {featureCards.map(([title, desc, Icon]: any) => (
            <div key={title} className="rounded-[20px] border border-[#e8def7] bg-white p-4 shadow-sm">
              <div className="mb-4 flex h-28 items-center justify-center rounded-2xl bg-[#fbf8ff]">
                <Icon className="h-9 w-9 text-[#7c3aed]" />
              </div>
              <h3 className="text-sm font-black">{title}</h3>
              <p className="mt-2 text-xs leading-5 text-[#786a91]">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1040px] px-5 py-8">
        <h2 className="text-center text-[30px] font-black tracking-[-0.06em]">Loved by 2,000+ AEC Professionals</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {["Ar. Priya Nair", "Er. Amit Verma", "Ar. Sneha Kapoor"].map((name, index) => (
            <div key={name} className="rounded-[22px] border border-[#e8def7] bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#f1e6ff] text-xl font-black text-[#7c3aed]">
                  {name.split(" ").pop()?.[0]}
                </div>
                <div>
                  <p className="font-black">{name}</p>
                  <p className="text-xs text-[#817397]">{index === 0 ? "Founder, Studio Archo" : index === 1 ? "Project Head, Urban Grid" : "Design Principal"}</p>
                </div>
              </div>
              <p className="mt-4 text-sm leading-6 text-[#5f5476]">
                BuildSetu AI transformed our workflow. BOQ, renders, proposals and client communication are now much faster.
              </p>
              <div className="mt-4 flex gap-1 text-[#6d28d9]">
                {[1, 2, 3, 4, 5].map((s) => <Star key={s} size={15} fill="currentColor" />)}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1040px] px-5 py-8">
        <div className="grid gap-6 overflow-hidden rounded-[26px] bg-gradient-to-r from-[#4c1d95] to-[#7c3aed] p-7 text-white md:grid-cols-[1fr_1.1fr] md:items-center">
          <div>
            <h2 className="text-[32px] font-black leading-tight tracking-[-0.06em]">
              Start Your Smart Project Workflow in 10 Minutes
            </h2>
            <p className="mt-3 text-sm leading-6 text-white/70">
              Join thousands of architects, designers and contractors who trust BuildSetu AI.
            </p>
            <div className="mt-6 flex gap-3">
              <a href="/pricing" className="rounded-xl bg-emerald-500 px-5 py-3 text-sm font-black text-white">Start Free Trial</a>
              <a href="/login" className="rounded-xl bg-white px-5 py-3 text-sm font-black text-[#21133f]">Book Demo</a>
            </div>
          </div>
          <div className="rounded-[22px] bg-white/10 p-4 ring-1 ring-white/15">
            <img src="/buildai-assets/dashboard-preview.svg" alt="Dashboard CTA" className="rounded-[18px]" />
          </div>
        </div>
      </section>

      <section id="faq" className="mx-auto max-w-[1040px] px-5 py-6">
        <h2 className="text-center text-[28px] font-black tracking-[-0.06em]">FAQ</h2>
        <div className="mt-5 overflow-hidden rounded-[20px] border border-[#e8def7] bg-white shadow-sm">
          {faqs.map((faq) => (
            <div key={faq} className="flex items-center justify-between border-b border-[#eee6f8] px-5 py-4 last:border-b-0">
              <p className="text-sm font-black">{faq}</p>
              <ChevronDown size={18} className="text-[#817397]" />
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-[#eee6f8] bg-white py-10">
        <div className="mx-auto grid max-w-[1040px] gap-8 px-5 md:grid-cols-[1.4fr_1fr_1fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#6d28d9] text-white">
                <Sparkles size={20} />
              </div>
              <p className="text-lg font-black">BuildSetu AI</p>
            </div>
            <p className="mt-4 text-sm leading-6 text-[#786a91]">
              AI workspace for architecture, interiors and construction. Work smarter, deliver better.
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

function FloatCard({ className, title, sub, image }: { className: string; title: string; sub: string; image?: boolean }) {
  return (
    <div className={`absolute w-[205px] rounded-2xl border border-[#e8def7] bg-white p-3 text-left shadow-[0_18px_50px_rgba(65,29,120,0.12)] ${className}`}>
      <p className="text-sm font-black">{title}</p>
      {image ? <div className="mt-3 h-24 rounded-xl bg-gradient-to-br from-[#2e1065] via-[#7c3aed] to-[#f5d0fe]" /> : null}
      <p className="mt-2 text-xs font-bold text-[#817397]">{sub}</p>
    </div>
  );
}

function FloatMetric({ className, title, value, sub }: { className: string; title: string; value: string; sub: string }) {
  return (
    <div className={`absolute w-[210px] rounded-2xl border border-[#e8def7] bg-white p-4 text-left shadow-[0_18px_50px_rgba(65,29,120,0.12)] ${className}`}>
      <p className="text-sm font-black">{title}</p>
      <p className="mt-2 text-xl font-black tracking-[-0.05em]">{value}</p>
      <p className="mt-1 text-xs text-emerald-600">{sub}</p>
    </div>
  );
}

function FloatPayment({ className }: { className: string }) {
  return (
    <div className={`absolute w-[210px] rounded-2xl border border-[#e8def7] bg-white p-4 text-left shadow-[0_18px_50px_rgba(65,29,120,0.12)] ${className}`}>
      <p className="text-sm font-black">Payment Received</p>
      <p className="mt-2 text-xl font-black">₹2,45,000</p>
      <p className="mt-1 text-xs text-[#817397]">From Horizon Homes</p>
    </div>
  );
}

function FloatBbs({ className }: { className: string }) {
  return (
    <div className={`absolute w-[210px] rounded-2xl border border-[#e8def7] bg-white p-4 text-left shadow-[0_18px_50px_rgba(65,29,120,0.12)] ${className}`}>
      <p className="text-sm font-black">BBS Generated</p>
      <div className="mt-3 h-24 rounded-xl bg-[#fbf8ff]">
        <div className="mx-auto h-full w-[70px] border-x-4 border-[#7c3aed]" />
      </div>
    </div>
  );
}

function FloatPdf({ className }: { className: string }) {
  return (
    <div className={`absolute w-[230px] rounded-2xl border border-[#e8def7] bg-white p-4 text-left shadow-[0_18px_50px_rgba(65,29,120,0.12)] ${className}`}>
      <p className="text-sm font-black">Client Proposal PDF</p>
      <p className="mt-2 text-xs text-[#817397]">Modern Villa Proposal.pdf</p>
      <button className="mt-3 rounded-xl bg-[#7c3aed] px-4 py-2 text-xs font-black text-white">View PDF</button>
    </div>
  );
}

function FloatOrder({ className }: { className: string }) {
  return (
    <div className={`absolute w-[210px] rounded-2xl border border-[#e8def7] bg-white p-4 text-left shadow-[0_18px_50px_rgba(65,29,120,0.12)] ${className}`}>
      <p className="text-sm font-black">Order Confirmed</p>
      <p className="mt-2 text-xs text-[#817397]">PO #BS-1245</p>
      <p className="mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-600">Completed</p>
    </div>
  );
}

function IconBubble({ icon: Icon }: { icon: any }) {
  return (
    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f1e6ff] text-[#7c3aed]">
      <Icon size={23} />
    </div>
  );
}

function Bullet({ text }: { text: string }) {
  return (
    <p className="mt-2 flex items-center gap-2 text-sm font-bold text-[#5f5476]">
      <CheckCircle2 size={16} className="text-[#6d28d9]" />
      {text}
    </p>
  );
}

function FeatureRow({
  title,
  desc,
  image,
  icon,
  points,
  reverse = false,
}: {
  title: string;
  desc: string;
  image: string;
  icon: any;
  points: string[];
  reverse?: boolean;
}) {
  return (
    <div className={`mb-5 grid gap-5 rounded-[24px] border border-[#e8def7] bg-white p-5 shadow-sm lg:grid-cols-2 lg:items-center ${reverse ? "lg:[&>*:first-child]:order-2" : ""}`}>
      <div>
        <IconBubble icon={icon} />
        <h2 className="mt-4 text-[25px] font-black tracking-[-0.05em] text-[#5b21b6]">{title}</h2>
        <p className="mt-3 max-w-md text-sm leading-6 text-[#786a91]">{desc}</p>
        <div className="mt-4">
          {points.map((point) => (
            <Bullet key={point} text={point} />
          ))}
        </div>
      </div>
      <div className="rounded-[22px] bg-[#fbf8ff] p-3">
        <img src={image} alt={title} className="w-full rounded-[18px] border border-[#eee6f8]" />
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
