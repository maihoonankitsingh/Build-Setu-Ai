const I = {
  hero: "/buildai/images/landing/hero-main-person-tablet.png",
  interior: "/buildai/images/landing/hero-card-interior-render.png",
  bbsCard: "/buildai/images/landing/hero-card-bbs-generated.png",
  explained: "/buildai/images/landing/buildai-explained-dashboard.png",
  render: "/buildai/images/landing/feature-ai-interior-exterior-render.png",
  boq: "/buildai/images/landing/feature-boq-estimation-automation.png",
  bbs: "/buildai/images/landing/feature-bbs-generation-one-click.png",
  pdf: "/buildai/images/landing/feature-client-proposals-pdfs.png",
  forms: "/buildai/images/landing/feature-forms-payments-lead-capture.png",
  advanced: "/buildai/images/landing/feature-advanced-dashboard-analytics.png",
  cta: "/buildai/images/landing/cta-smart-project-workflow-devices.png",
};

const nav = [
  ["Products", "#products"],
  ["Pricing", "/pricing"],
  ["Features", "#features"],
  ["Resources", "#resources"],
  ["Support", "#support"],
];

const trustItems = [
  "Architecture Studios",
  "Interior Design Teams",
  "Civil Consultants",
  "Contractors",
  "Real Estate Teams",
  "Home Consultants",
];

const features = [
  {
    tag: "AI Render Studio",
    title: "AI Interior & Exterior Renders",
    desc: "Generate polished interior concepts, front elevations and design previews from a short project brief, reference image or site photo.",
    image: I.render,
    points: ["Interior and exterior render workflows", "Style, material and lighting direction", "Client-ready visual options in minutes"],
  },
  {
    tag: "Estimation Automation",
    title: "BOQ & Estimation Automation",
    desc: "Prepare structured BOQ drafts, quantity summaries, cost breakdowns and estimate reports for faster client discussions.",
    image: I.boq,
    points: ["Quantity take-off style summaries", "Rate and material cost breakdown", "Excel/PDF-ready output structure"],
    reverse: true,
  },
  {
    tag: "Structural Workflow",
    title: "BBS Generation in One Click",
    desc: "Create review-ready BBS draft tables, reinforcement summaries and steel documentation workflows for engineering teams.",
    image: I.bbs,
    points: ["Member-wise BBS draft format", "Steel quantity and schedule summaries", "Professional review workflow included"],
  },
  {
    tag: "Client Documents",
    title: "Client Proposals & PDFs",
    desc: "Convert project briefs, renders, BOQ notes and scope details into clean branded proposal PDFs for faster client approvals.",
    image: I.pdf,
    points: ["Branded proposal documents", "BOQ, scope and project summary", "One-click export workflow"],
    reverse: true,
  },
  {
    tag: "Lead to Payment",
    title: "Forms, Payments & Lead Capture",
    desc: "Capture project requirements, collect payments, track leads and manage client communication inside one construction workspace.",
    image: I.forms,
    points: ["Smart project brief forms", "Payment-ready client workflow", "Lead pipeline tracking"],
  },
];

const miniStats = [
  ["98%", "Estimate workflow confidence"],
  ["5X", "Faster project documentation"],
  ["10K+", "Daily AI document actions"],
  ["99%", "Client-ready output structure"],
];

const advancedCards = [
  {
    title: "Multi-project Workspace",
    desc: "Manage residential, commercial and interior projects from one organized dashboard.",
  },
  {
    title: "Credit-based AI Usage",
    desc: "Track render, BOQ, BBS and PDF usage with transparent credit history.",
  },
  {
    title: "Shared Dashboard & Analytics",
    desc: "Monitor projects, estimates, conversions and team activity in one view.",
  },
  {
    title: "Import Brief & Generate Instantly",
    desc: "Upload drawings, PDFs or project notes and convert them into structured outputs.",
  },
];

const professionalCards = [
  {
    title: "Architects & Consultants",
    desc: "Build concept packages, project summaries and client-ready documentation faster.",
  },
  {
    title: "Interior Designers",
    desc: "Turn client briefs into visual concepts, material notes and proposal PDFs.",
  },
  {
    title: "Contractors & Civil Teams",
    desc: "Organize BOQ drafts, BBS tables, payment status and client documents in one flow.",
  },
];

const faqs = [
  "What is BuildSetu AI?",
  "How accurate are BOQ and BBS outputs?",
  "Which file formats are supported?",
  "Is my project data secure?",
  "Can I try BuildSetu AI before purchasing?",
];

export default function BuildAiLandingPage() {
  return (
    <main className="min-h-screen bg-[#fbfaff] text-[#120a2f] antialiased">
      <header className="sticky top-0 z-50 border-b border-[#eee8fb] bg-white/94 shadow-[0_10px_35px_rgba(36,18,74,0.04)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1180px] items-center justify-between px-4 py-3 md:px-5">
          <a href="/buildai" className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-[#6d28d9] via-[#7c3aed] to-[#c026d3] text-base font-black text-white shadow-[0_14px_30px_rgba(109,40,217,0.28)]">
              B
            </span>
            <span className="leading-none">
              <span className="block text-[18px] font-black tracking-[-0.045em]">
                BuildSetu <span className="text-[#6d28d9]">AI</span>
              </span>
              <span className="block text-[10px] font-bold tracking-[-0.01em] text-[#8a7b9f]">Powered by Sikhadenge</span>
            </span>
          </a>

          <nav className="hidden items-center gap-7 text-[13px] font-extrabold text-[#5d5370] lg:flex">
            {nav.map(([item, href]) => (
              <a key={item} href={href} className="transition hover:text-[#6d28d9]">
                {item} {item !== "Pricing" ? "⌄" : ""}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <a href="/book-demo" className="hidden rounded-xl bg-[#6d28d9] px-5 py-2.5 text-xs font-black text-white shadow-[0_14px_30px_rgba(109,40,217,0.25)] md:inline-flex">
              Book Demo
            </a>
            <a href="/login" className="rounded-xl border border-[#ded4ee] bg-white px-5 py-2.5 text-xs font-black text-[#150d2f] shadow-sm">
              Login
            </a>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden bg-[radial-gradient(circle_at_top,#f2e8ff_0%,#ffffff_48%,#fbfaff_100%)]">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.22] [mask-image:radial-gradient(circle_at_top,black,transparent_72%)]"
          style={{
            backgroundImage:
              "linear-gradient(#cbb8ef 1px, transparent 1px), linear-gradient(90deg, #cbb8ef 1px, transparent 1px)",
            backgroundSize: "56px 56px",
          }}
        />
        <div className="pointer-events-none absolute left-[5%] top-24 h-80 w-80 rounded-full bg-[#e9d7ff] opacity-70 blur-3xl" />
        <div className="pointer-events-none absolute right-[8%] top-36 h-96 w-96 rounded-full bg-[#ede9ff] opacity-70 blur-3xl" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#dac9f4] to-transparent" />

        <div className="relative mx-auto max-w-[1180px] px-4 pb-14 pt-11 text-center md:px-5 md:pb-18">
          <div className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full border border-[#e6d7fb] bg-white px-4 py-2 text-[11px] font-black uppercase tracking-[0.08em] text-[#6d28d9] shadow-sm">
            AI workspace for architecture, interiors & construction
          </div>

          <h1 className="mx-auto max-w-[980px] text-[46px] font-black leading-[0.94] tracking-[-0.08em] text-[#120a2f] md:text-[76px]">
            5X Your Project Workflow
            <span className="block bg-gradient-to-r from-[#6d28d9] via-[#7c3aed] to-[#4f46e5] bg-clip-text text-transparent">
              with the Power of BuildSetu AI
            </span>
          </h1>

          <p className="mx-auto mt-5 max-w-[760px] text-[16px] font-semibold leading-8 text-[#5f536f] md:text-[17px]">
            Turn client briefs into AI renders, BOQ drafts, BBS tables, client proposals, payment workflows and project documentation from one professional workspace.
          </p>

          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <a href="/pricing" className="inline-flex h-12 items-center justify-center rounded-xl bg-gradient-to-r from-[#6d28d9] to-[#8b5cf6] px-7 text-sm font-black text-white shadow-[0_18px_42px_rgba(109,40,217,0.28)]">
              Start Free Trial →
            </a>
            <a href="/book-demo" className="inline-flex h-12 items-center justify-center rounded-xl border border-[#ddd3ed] bg-white px-7 text-sm font-black text-[#150d2f] shadow-sm">
              Book Demo
            </a>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[12px] font-bold text-[#7d7190]">
            <span>✓ No credit card required</span>
            <span>✓ Setup in minutes</span>
            <span>✓ Professional review workflow</span>
          </div>

          <div className="mx-auto mt-10 max-w-[1080px]">
            <div className="relative overflow-hidden rounded-[40px] border border-[#e6d8f8] bg-white/80 p-3 shadow-[0_34px_110px_rgba(76,29,149,0.18)] backdrop-blur">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(124,58,237,0.16),transparent_58%)]" />
              <img src={I.hero} alt="BuildSetu AI project workflow dashboard" className="relative mx-auto w-full rounded-[32px] object-cover" />
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-[#eee8f8] bg-white py-7">
        <div className="mx-auto max-w-[1120px] px-4 text-center md:px-5">
          <p className="text-[12px] font-black uppercase tracking-[0.14em] text-[#8b7b9d]">
            Built for architecture & construction professionals
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
            {trustItems.map((item) => (
              <div key={item} className="rounded-2xl border border-[#e5d7f7] bg-gradient-to-br from-white to-[#f8f3ff] px-4 py-4 shadow-[0_10px_30px_rgba(65,29,120,0.05)]">
                <p className="text-[12px] font-black uppercase tracking-[-0.01em] text-[#5b287d]">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="products" className="mx-auto max-w-[1040px] px-4 py-12 md:px-5">
        <SectionHead
          label="See how it works"
          title="BuildSetu AI Explained in 3 Minutes"
          sub="Watch how one workspace can organize project briefs, renders, BOQ, BBS, proposals and payment status without switching between scattered tools."
        />
        <div className="relative mt-7 overflow-hidden rounded-[30px] border border-[#e8ddf7] bg-white p-3 shadow-[0_20px_70px_rgba(65,29,120,0.10)] md:p-5">
          <img src={I.explained} alt="BuildSetu AI dashboard explained" className="w-full rounded-[24px] object-cover" />
          <span className="absolute left-1/2 top-1/2 grid h-16 w-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-gradient-to-r from-[#6d28d9] to-[#8b5cf6] text-2xl text-white shadow-[0_18px_45px_rgba(109,40,217,0.36)] md:h-20 md:w-20">
            ▶
          </span>
        </div>
      </section>

      <section id="features" className="mx-auto max-w-[1040px] px-4 py-2 md:px-5">
        {features.map((feature) => (
          <FeatureRow key={feature.title} {...feature} />
        ))}
      </section>

      <section className="mx-auto max-w-[1040px] px-4 py-10 text-center md:px-5">
        <h2 className="text-[32px] font-black tracking-[-0.065em] text-[#2b1457] md:text-[42px]">Why BuildSetu AI?</h2>
        <div className="mt-7 grid gap-3 sm:grid-cols-2 md:grid-cols-4">
          {miniStats.map(([value, label]) => (
            <div key={label} className="rounded-[26px] border border-[#e8ddf7] bg-gradient-to-br from-white to-[#fbf8ff] p-6 shadow-[0_16px_48px_rgba(65,29,120,0.07)]">
              <p className="text-4xl font-black tracking-[-0.07em] text-[#6d28d9]">{value}</p>
              <p className="mt-2 text-xs font-extrabold text-[#81758f]">{label}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="resources" className="mx-auto max-w-[1040px] px-4 py-9 md:px-5">
        <SectionHead
          title="Advanced Features that Drive Results"
          sub="A workspace built for project control, credit tracking, analytics and automated client-ready generation."
        />
        <div className="mt-7 grid gap-4 md:grid-cols-4">
          {advancedCards.map((card, index) => (
            <div key={card.title} className="rounded-[24px] border border-[#e8ddf7] bg-white p-5 shadow-[0_12px_40px_rgba(65,29,120,0.06)]">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#f1e6ff] text-lg font-black text-[#6d28d9]">
                {index + 1}
              </span>
              <h3 className="mt-5 text-[18px] font-black tracking-[-0.04em] text-[#2b1457]">{card.title}</h3>
              <p className="mt-3 text-sm font-medium leading-6 text-[#786a91]">{card.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1040px] px-4 py-9 md:px-5">
        <h2 className="text-center text-[30px] font-black tracking-[-0.06em] text-[#2b1457] md:text-[38px]">
          Built for AEC Professionals
        </h2>
        <div className="mt-7 grid gap-4 md:grid-cols-3">
          {professionalCards.map((card) => (
            <div key={card.title} className="rounded-[26px] border border-[#e8ddf7] bg-white p-6 shadow-[0_14px_42px_rgba(65,29,120,0.06)]">
              <h3 className="text-[20px] font-black tracking-[-0.04em] text-[#3a176d]">{card.title}</h3>
              <p className="mt-3 text-sm font-medium leading-7 text-[#685b7d]">{card.desc}</p>
              <p className="mt-5 text-sm font-black tracking-[0.12em] text-[#6d28d9]">★★★★★</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1040px] px-4 py-10 md:px-5">
        <div className="grid overflow-hidden rounded-[36px] border border-white/20 bg-[radial-gradient(circle_at_top_left,#8b5cf6_0%,#5b16d4_38%,#24005c_100%)] text-white shadow-[0_30px_100px_rgba(76,29,149,0.32)] md:grid-cols-[0.9fr_1.1fr] md:items-center">
          <div className="p-7 md:p-10">
            <h2 className="text-[34px] font-black leading-tight tracking-[-0.07em] md:text-[46px]">
              Start Your Smart Project Workflow in 10 Minutes
            </h2>
            <p className="mt-4 text-sm font-medium leading-7 text-white/76">
              Choose a plan, create your workspace and start generating renders, BOQ drafts, BBS tables and client-ready PDFs.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <a href="/pricing" className="inline-flex h-12 items-center justify-center rounded-xl bg-emerald-500 px-6 text-sm font-black text-white shadow-lg shadow-emerald-900/20">
                Start Free Trial →
              </a>
              <a href="/book-demo" className="inline-flex h-12 items-center justify-center rounded-xl bg-white px-6 text-sm font-black text-[#150d2f]">
                Book Demo
              </a>
            </div>
            <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-[12px] font-bold text-white/70">
              <span>✓ No credit card required</span>
              <span>✓ Setup in minutes</span>
              <span>✓ Review-ready workflow</span>
            </div>
          </div>
          <img src={I.cta} alt="BuildSetu AI device workflow" className="h-full min-h-[280px] w-full object-cover" />
        </div>
      </section>

      <section id="support" className="mx-auto max-w-[1040px] px-4 py-9 md:px-5">
        <h2 className="text-center text-[30px] font-black tracking-[-0.06em] text-[#2b1457]">FAQ</h2>
        <div className="mt-6 overflow-hidden rounded-[22px] border border-[#e8ddf7] bg-white shadow-sm">
          {faqs.map((faq) => (
            <div key={faq} className="flex items-center justify-between border-b border-[#eee8f8] px-5 py-4 last:border-b-0">
              <p className="text-sm font-black text-[#2b1457]">{faq}</p>
              <span className="text-[#81758f]">⌄</span>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-[#eee8f8] bg-white py-10">
        <div className="mx-auto grid max-w-[1040px] gap-8 px-4 md:grid-cols-[1.4fr_1fr_1fr_1fr_1fr] md:px-5">
          <div>
            <p className="text-lg font-black tracking-[-0.04em]">BuildSetu <span className="text-[#6d28d9]">AI</span></p>
            <p className="mt-4 text-sm font-medium leading-6 text-[#786a91]">
              AI workspace for architecture, interiors and construction teams. Built for project briefs, renders, estimates and client documents.
            </p>
          </div>
          <FooterCol title="Product" items={["AI Renders", "BOQ & Estimation", "BBS Generation", "Client Proposals"]} />
          <FooterCol title="Resources" items={["Blog", "Case Studies", "Templates", "Help Center"]} />
          <FooterCol title="Company" items={["About Us", "Careers", "Partner Program", "Privacy Policy"]} />
          <FooterCol title="Get in Touch" items={["Login to workspace", "View pricing", "BuildSetu AI home"]} />
        </div>
        <div className="mx-auto mt-8 flex max-w-[1040px] items-center justify-between border-t border-[#eee8f8] px-4 pt-6 text-xs font-bold text-[#8b7b9d] md:px-5">
          <span>© 2026 BuildSetu AI. Powered by Sikhadenge.</span>
          <span>Terms of Service · Privacy Policy</span>
        </div>
      </footer>
    </main>
  );
}

function SectionHead({ title, sub, label }: { title: string; sub: string; label?: string }) {
  return (
    <div className="text-center">
      {label ? <p className="mb-2 text-[11px] font-black uppercase tracking-[0.14em] text-[#6d28d9]">{label}</p> : null}
      <h2 className="text-[32px] font-black tracking-[-0.065em] text-[#2b1457] md:text-[42px]">{title}</h2>
      <p className="mx-auto mt-3 max-w-2xl text-sm font-medium leading-7 text-[#786a91]">{sub}</p>
    </div>
  );
}

function FeatureRow({
  title,
  tag,
  desc,
  image,
  points,
  reverse,
}: {
  title: string;
  tag: string;
  desc: string;
  image: string;
  points: string[];
  reverse?: boolean;
}) {
  return (
    <div className={`mb-5 grid gap-5 rounded-[28px] border border-[#e8ddf7] bg-white p-4 shadow-[0_20px_70px_rgba(65,29,120,0.075)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_26px_90px_rgba(65,29,120,0.10)] md:p-6 lg:grid-cols-2 lg:items-center ${reverse ? "lg:[&>*:first-child]:order-2" : ""}`}>
      <div className="px-1 py-2 md:px-4">
        <p className="text-xs font-black uppercase tracking-[0.13em] text-[#6d28d9]">{tag}</p>
        <h2 className="mt-3 text-[28px] font-black leading-tight tracking-[-0.055em] text-[#3a176d] md:text-[34px]">{title}</h2>
        <p className="mt-4 max-w-md text-sm font-medium leading-7 text-[#70627f]">{desc}</p>
        <div className="mt-5 space-y-2.5">
          {points.map((p) => (
            <p key={p} className="flex items-start gap-2 text-sm font-bold leading-6 text-[#5f5476]">
              <span className="mt-0.5 text-[#6d28d9]">✓</span>
              <span>{p}</span>
            </p>
          ))}
        </div>
      </div>
      <div className="rounded-[28px] border border-[#f0e7fb] bg-gradient-to-br from-[#fbf8ff] via-white to-[#f6efff] p-2.5 shadow-inner md:p-3">
        <img src={image} alt={title} className="w-full rounded-[22px] border border-[#eee8f8] object-cover shadow-[0_14px_38px_rgba(65,29,120,0.08)]" />
      </div>
    </div>
  );
}

function FooterCol({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h3 className="text-sm font-black text-[#2b1457]">{title}</h3>
      <div className="mt-4 space-y-2">
        {items.map((item) => (
          <a key={item} href="#" className="block text-sm font-medium text-[#786a91] hover:text-[#6d28d9]">
            {item}
          </a>
        ))}
      </div>
    </div>
  );
}
