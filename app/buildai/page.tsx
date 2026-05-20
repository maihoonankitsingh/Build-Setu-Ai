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
  clients: "/buildai/images/landing/clients-logos-trusted-by.png",
};

const nav = ["Products", "Pricing", "Features", "Resources", "Support"];

const features = [
  {
    tag: "AI Render Studio",
    title: "AI Interior & Exterior Renders",
    desc: "Create photorealistic interior and exterior renders in seconds with premium design styles, lighting and materials.",
    image: I.render,
    points: ["100+ design styles", "Material and lighting control", "HD renders in seconds"],
  },
  {
    tag: "Estimation Automation",
    title: "BOQ & Estimation Automation",
    desc: "Generate quantity take-off, cost estimates, rate analysis and BOQ summaries from construction inputs.",
    image: I.boq,
    points: ["Auto quantity take-off", "Cost breakdown dashboard", "Excel and PDF export"],
    reverse: true,
  },
  {
    tag: "Structural Workflow",
    title: "BBS Generation in One Click",
    desc: "Create bar bending schedule drafts, steel summaries and review-ready structural documentation.",
    image: I.bbs,
    points: ["BBS schedule table", "3D reinforcement preview", "Engineer review workflow"],
  },
  {
    tag: "Client Documents",
    title: "Client Proposals & PDFs",
    desc: "Turn renders, BOQ, notes and project summaries into clean branded PDF proposals for clients.",
    image: I.pdf,
    points: ["Branded proposal PDF", "BOQ and drawing exports", "One-click download"],
    reverse: true,
  },
  {
    tag: "Lead to Payment",
    title: "Forms, Payments & Lead Capture",
    desc: "Capture project briefs, receive payments, track lead pipeline and manage client flow from one dashboard.",
    image: I.forms,
    points: ["Smart project forms", "Razorpay-ready payments", "Lead pipeline tracking"],
  },
];

const miniStats = [
  ["98%", "Estimation Accuracy"],
  ["5X", "Faster Delivery"],
  ["10,000+", "Credits Processed Daily"],
  ["99%", "Client-ready Outputs"],
];

const faqs = [
  "What is BuildSetu AI?",
  "How accurate are BOQ and BBS outputs?",
  "What file formats are supported?",
  "Is my project data secure?",
  "Can I try BuildSetu AI before purchasing?",
];

export default function BuildAiLandingPage() {
  return (
    <main className="min-h-screen bg-white text-[#150d2f]">
      <header className="sticky top-0 z-50 border-b border-[#eee8f8] bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1180px] items-center justify-between px-4 py-3 md:px-5">
          <a href="/buildai" className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-[#6d28d9] to-[#c026d3] text-base font-black text-white shadow-lg">B</span>
            <span className="text-lg font-black tracking-[-0.04em]">BuildSetu <span className="text-[#6d28d9]">AI</span></span>
          </a>

          <nav className="hidden items-center gap-7 text-[13px] font-bold text-[#5d5370] lg:flex">
            {nav.map((item) => (
              <a key={item} href={item === "Pricing" ? "/pricing" : `#${item.toLowerCase()}`} className="hover:text-[#6d28d9]">
                {item} {item !== "Pricing" ? "⌄" : ""}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <a href="/pricing" className="hidden rounded-xl bg-[#6d28d9] px-5 py-2.5 text-xs font-black text-white shadow-lg shadow-purple-200 md:inline-flex">Book Demo</a>
            <a href="/login" className="rounded-xl border border-[#ded4ee] bg-white px-5 py-2.5 text-xs font-black text-[#150d2f] shadow-sm">Login</a>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden bg-[radial-gradient(circle_at_top,#f4ebff_0%,#ffffff_50%,#ffffff_100%)]">
        <div className="pointer-events-none absolute left-[6%] top-24 h-72 w-72 rounded-full bg-[#ede0ff] blur-3xl" />
        <div className="pointer-events-none absolute right-[8%] top-40 h-80 w-80 rounded-full bg-[#ede9ff] blur-3xl" />

        <div className="relative mx-auto max-w-[1180px] px-4 pb-12 pt-10 text-center md:px-5 md:pb-16">
          <div className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full border border-[#e8dafa] bg-white px-4 py-2 text-[11px] font-black uppercase tracking-wide text-[#6d28d9] shadow-sm">
            AI workspace for architecture, interiors & construction
          </div>
          <h1 className="mx-auto max-w-[900px] text-[40px] font-black leading-[0.98] tracking-[-0.08em] md:text-[66px]">
            5X Your Project Workflow
            <span className="block bg-gradient-to-r from-[#6d28d9] to-[#4f46e5] bg-clip-text text-transparent">with the Power of BuildSetu AI</span>
          </h1>
          <p className="mx-auto mt-4 max-w-[690px] text-[14px] leading-7 text-[#70667f] md:text-[15px]">
            Interior & exterior renders, BOQ, BBS, client PDFs and project workflows — all in one AI workspace for AEC professionals.
          </p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <a href="/pricing" className="inline-flex h-12 items-center justify-center rounded-xl bg-gradient-to-r from-[#6d28d9] to-[#8b5cf6] px-7 text-sm font-black text-white shadow-[0_18px_42px_rgba(109,40,217,0.28)]">Start Free Trial →</a>
            <a href="/login" className="inline-flex h-12 items-center justify-center rounded-xl border border-[#ddd3ed] bg-white px-7 text-sm font-black text-[#150d2f] shadow-sm">Book Demo</a>
          </div>

          <div className="mx-auto mt-8 max-w-[1030px]">
            <img src={I.hero} alt="BuildSetu AI architect with tablet and project cards" className="mx-auto w-full rounded-[34px] object-cover shadow-[0_28px_90px_rgba(75,35,130,0.12)]" />
          </div>
        </div>
      </section>

      <section className="border-y border-[#eee8f8] bg-white py-5">
        <div className="mx-auto max-w-[1120px] px-4 text-center md:px-5">
          <p className="text-xs font-black text-[#81758f] md:text-sm">Trusted by 2,000+ Architecture & Construction Firms</p>
          <img src={I.clients} alt="Trusted BuildSetu AI clients" className="mx-auto mt-4 w-full max-w-[980px] rounded-[24px] border border-[#eee8f8] shadow-sm" />
        </div>
      </section>

      <section id="products" className="mx-auto max-w-[1040px] px-4 py-9 md:px-5">
        <SectionHead title="BuildSetu AI Explained" sub="See how BuildSetu AI transforms your workflow in 3 minutes" />
        <div className="relative mt-5 overflow-hidden rounded-[28px] border border-[#e8ddf7] bg-white p-3 shadow-[0_18px_60px_rgba(65,29,120,0.08)] md:p-5">
          <img src={I.explained} alt="BuildSetu AI dashboard explained" className="w-full rounded-[22px] object-cover" />
          <span className="absolute left-1/2 top-1/2 grid h-16 w-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-gradient-to-r from-[#6d28d9] to-[#8b5cf6] text-2xl text-white shadow-[0_18px_45px_rgba(109,40,217,0.35)] md:h-20 md:w-20">▶</span>
        </div>
      </section>

      <section id="features" className="mx-auto max-w-[1040px] px-4 py-2 md:px-5">
        {features.map((feature) => (
          <FeatureRow key={feature.title} {...feature} />
        ))}
      </section>

      <section className="mx-auto max-w-[1040px] px-4 py-8 text-center md:px-5">
        <h2 className="text-[28px] font-black tracking-[-0.06em] text-[#4c1d95] md:text-[34px]">Why BuildSetu AI?</h2>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 md:grid-cols-4">
          {miniStats.map(([value, label]) => (
            <div key={label} className="rounded-[22px] border border-[#e8ddf7] bg-white p-5 shadow-sm">
              <p className="text-3xl font-black tracking-[-0.07em] text-[#6d28d9]">{value}</p>
              <p className="mt-1 text-xs font-bold text-[#81758f]">{label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1040px] px-4 py-8 md:px-5">
        <SectionHead title="Advanced Features that Drive Results" sub="Futuristic dashboards, analytics, credit tracking and automated project generation." />
        <img src={I.advanced} alt="Advanced BuildSetu AI dashboard and analytics" className="mt-6 w-full rounded-[28px] border border-[#e8ddf7] shadow-[0_20px_70px_rgba(65,29,120,0.08)]" />
      </section>

      <section className="mx-auto max-w-[1040px] px-4 py-8 md:px-5">
        <h2 className="text-center text-[28px] font-black tracking-[-0.06em] md:text-[34px]">Loved by 2,000+ AEC Professionals</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {["Ar. Priya Nair", "Er. Amit Verma", "Ar. Sneha Kapoor"].map((name, index) => (
            <div key={name} className="rounded-[24px] border border-[#e8ddf7] bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <span className="grid h-13 w-13 place-items-center rounded-full bg-[#f1e6ff] text-lg font-black text-[#6d28d9]">{name.split(" ").pop()?.[0]}</span>
                <span><p className="font-black">{name}</p><p className="text-xs text-[#81758f]">{index === 0 ? "Founder, Studio Archo" : index === 1 ? "Project Head, Urban Grid" : "Design Principal"}</p></span>
              </div>
              <p className="mt-4 text-sm leading-6 text-[#5f5476]">BuildSetu AI transformed our workflow. BOQ, renders, proposals and client communication are now much faster.</p>
              <p className="mt-4 text-sm font-black text-[#6d28d9]">★★★★★</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1040px] px-4 py-8 md:px-5">
        <div className="grid overflow-hidden rounded-[30px] bg-gradient-to-r from-[#3b0f80] to-[#7c3aed] text-white shadow-[0_26px_80px_rgba(76,29,149,0.22)] md:grid-cols-[0.82fr_1.18fr] md:items-center">
          <div className="p-7 md:p-9">
            <h2 className="text-[32px] font-black leading-tight tracking-[-0.07em] md:text-[42px]">Start Your Smart Project Workflow in 10 Minutes</h2>
            <p className="mt-4 text-sm leading-7 text-white/72">Buy a plan, get your login details and start generating renders, BOQ, BBS and client-ready documents.</p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <a href="/pricing" className="inline-flex h-12 items-center justify-center rounded-xl bg-emerald-500 px-6 text-sm font-black text-white">Start Free Trial →</a>
              <a href="/login" className="inline-flex h-12 items-center justify-center rounded-xl bg-white px-6 text-sm font-black text-[#150d2f]">Book Demo</a>
            </div>
          </div>
          <img src={I.cta} alt="BuildSetu AI device workflow" className="h-full min-h-[280px] w-full object-cover" />
        </div>
      </section>

      <section id="faq" className="mx-auto max-w-[1040px] px-4 py-8 md:px-5">
        <h2 className="text-center text-[28px] font-black tracking-[-0.06em]">FAQ</h2>
        <div className="mt-5 overflow-hidden rounded-[20px] border border-[#e8ddf7] bg-white shadow-sm">
          {faqs.map((faq) => (
            <div key={faq} className="flex items-center justify-between border-b border-[#eee8f8] px-5 py-4 last:border-b-0">
              <p className="text-sm font-black">{faq}</p><span className="text-[#81758f]">⌄</span>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-[#eee8f8] bg-white py-10">
        <div className="mx-auto grid max-w-[1040px] gap-8 px-4 md:grid-cols-[1.4fr_1fr_1fr_1fr_1fr] md:px-5">
          <div><p className="text-lg font-black">BuildSetu <span className="text-[#6d28d9]">AI</span></p><p className="mt-4 text-sm leading-6 text-[#786a91]">AI workspace for architecture, interiors and construction. Work smarter, deliver better.</p></div>
          <FooterCol title="Product" items={["AI Renders", "BOQ & Estimation", "BBS Generation", "Client Proposals"]} />
          <FooterCol title="Resources" items={["Blog", "Case Studies", "Templates", "Help Center"]} />
          <FooterCol title="Company" items={["About Us", "Careers", "Partner Program", "Privacy Policy"]} />
          <FooterCol title="Get in Touch" items={["hello@buildsetu.ai", "+91 98765 43210", "Raipur, India"]} />
        </div>
      </footer>
    </main>
  );
}

function SectionHead({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="text-center"><h2 className="text-[28px] font-black tracking-[-0.06em] text-[#4c1d95] md:text-[34px]">{title}</h2><p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-[#786a91]">{sub}</p></div>
  );
}

function FeatureRow({ title, tag, desc, image, points, reverse }: { title: string; tag: string; desc: string; image: string; points: string[]; reverse?: boolean }) {
  return (
    <div className={`mb-5 grid gap-5 rounded-[26px] border border-[#e8ddf7] bg-white p-4 shadow-[0_14px_46px_rgba(65,29,120,0.05)] md:p-5 lg:grid-cols-2 lg:items-center ${reverse ? "lg:[&>*:first-child]:order-2" : ""}`}>
      <div className="px-1 py-2 md:px-3"><p className="text-xs font-black uppercase tracking-wide text-[#6d28d9]">{tag}</p><h2 className="mt-2 text-[24px] font-black leading-tight tracking-[-0.05em] text-[#4c1d95] md:text-[30px]">{title}</h2><p className="mt-3 max-w-md text-sm leading-7 text-[#786a91]">{desc}</p><div className="mt-5 space-y-2">{points.map((p) => <p key={p} className="text-sm font-bold text-[#5f5476]">✓ {p}</p>)}</div></div>
      <div className="rounded-[24px] bg-[#fbf8ff] p-2 md:p-3"><img src={image} alt={title} className="w-full rounded-[20px] border border-[#eee8f8] object-cover" /></div>
    </div>
  );
}

function FooterCol({ title, items }: { title: string; items: string[] }) {
  return <div><h3 className="text-sm font-black">{title}</h3><div className="mt-4 space-y-2">{items.map((item) => <a key={item} href="#" className="block text-sm text-[#786a91] hover:text-[#6d28d9]">{item}</a>)}</div></div>;
}
