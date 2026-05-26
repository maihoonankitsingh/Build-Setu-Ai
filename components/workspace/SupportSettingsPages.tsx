"use client";

import { useEffect, useState } from "react";

type PageProps = {
  theme?: unknown;
};

type SupportTicketRecord = {
  id: string;
  type: string;
  priority: string;
  area: string;
  subject: string;
  details: string;
  contact: string;
  status: string;
  createdAt: string;
};

const defaultSettings = {
  companyName: "BuildSetu AI",
  city: "Raipur",
  quality: "Standard",
  currency: "INR",
  coverageRatio: "78",
  steelFactor: "3.8",
  contingency: "5",
  gst: "18",
  rateSource: "BuildSetu Internal Starter Rate Library",
  approvalGate: "Engineer Review Required",
};

function PageHeader({ title, desc }: { title: string; desc: string }) {
  return (
    <div>
      <h1 className="text-3xl font-black tracking-[-0.04em] text-[#161032]">{title}</h1>
      <p className="mt-1 text-sm font-medium text-[#817397]">{desc}</p>
    </div>
  );
}

export function BackendWorkspaceSupportPage({ theme }: PageProps) {
  void theme;

  const [ticket, setTicket] = useState({
    type: "General Support",
    priority: "Medium",
    area: "Workspace",
    subject: "BuildSetu support request",
    details: "",
    contact: "",
  });
  const [submitted, setSubmitted] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [recentTickets, setRecentTickets] = useState<SupportTicketRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [openFaq, setOpenFaq] = useState("getting-0");

  useEffect(() => {
    let mounted = true;

    async function loadTickets() {
      try {
        const response = await fetch("/api/support/tickets", { cache: "no-store" });
        const data = await response.json();

        if (mounted && response.ok && data.ok) {
          setRecentTickets(data.tickets || []);
        }
      } catch {
        if (mounted) setRecentTickets([]);
      }
    }

    loadTickets();

    return () => {
      mounted = false;
    };
  }, []);

  function updateTicket(key: keyof typeof ticket, value: string) {
    setTicket((current) => ({ ...current, [key]: value }));
  }

  async function submitTicket() {
    if (!ticket.details.trim()) {
      setSubmitted("Please describe your issue first.");
      return;
    }

    setSubmitting(true);
    setSubmitted("");

    try {
      const response = await fetch("/api/support/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...ticket,
          subject: ticket.subject.trim() || "BuildSetu support request",
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Failed to submit support ticket");
      }

      setRecentTickets(data.tickets || []);
      setSubmitted(`Ticket ${data.ticket?.id || ""} saved successfully.`);
      setTicket((current) => ({ ...current, details: "" }));
    } catch (error) {
      setSubmitted(error instanceof Error ? error.message : "Ticket submit fail hua.");
    } finally {
      setSubmitting(false);
    }
  }

  const faqGroups = [
    {
      id: "getting",
      title: "Getting Started with BuildSetu AI",
      items: [
        {
          q: "What is BuildSetu AI?",
          a: "BuildSetu AI is a construction workspace for projects, BOQ estimates, BBS generation, reports, exports and AI-assisted building workflows.",
        },
        {
          q: "How do I create a new project?",
          a: "Use New Project from the sidebar, enter plot/project details, then generate BOQ, BBS or reports from the selected project.",
        },
        {
          q: "Which project data should I enter first?",
          a: "Project name, plot size, city, project type, floor count and quality level should be added first for better BOQ and BBS output.",
        },
      ],
    },
    {
      id: "boq",
      title: "BOQ / Estimate",
      items: [
        {
          q: "How does BOQ generation work?",
          a: "BOQ uses project size, built-up area, city, quality and rate-master item rates to create a planning estimate draft.",
        },
        {
          q: "Can I edit BOQ items manually?",
          a: "Yes. Use BOQ manual controls to add, edit or delete line items and update quantity, rate and amount.",
        },
        {
          q: "Why does the estimate change by project size?",
          a: "Estimate changes because plot area, coverage, built-up area, rate master and quality multiplier affect quantity and cost.",
        },
      ],
    },
    {
      id: "bbs",
      title: "BBS / Steel Schedule",
      items: [
        {
          q: "How does BBS steel quantity generate?",
          a: "BBS is generated from project size, built-up area and steel factor. It is an estimated draft and requires engineer review.",
        },
        {
          q: "Why does BBS need engineer review?",
          a: "Final bar marks, cutting length, lap length, development length and bend deduction must be verified from structural drawings.",
        },
        {
          q: "Can I change steel factor?",
          a: "Yes. Settings page stores steel factor. The next integration step is connecting this saved setting directly to BBS generation.",
        },
      ],
    },
    {
      id: "exports",
      title: "Reports & Exports",
      items: [
        {
          q: "Can I export BOQ and BBS?",
          a: "Yes. BOQ/BBS can be exported using available CSV/PDF export actions where enabled.",
        },
        {
          q: "What should I do if export fails?",
          a: "Submit a support ticket with project name, page name, export type, expected result and actual error.",
        },
        {
          q: "Can reports include project summary?",
          a: "Yes. Reports can include project details, generated estimates, review status and export-ready summaries.",
        },
      ],
    },
    {
      id: "account",
      title: "Account & Workspace",
      items: [
        {
          q: "Where are workspace settings saved?",
          a: "Settings are saved through backend storage using /api/settings/workspace.",
        },
        {
          q: "Where are support tickets saved?",
          a: "Support tickets are saved through /api/support/tickets and shown in Recent Tickets.",
        },
        {
          q: "How do credits and plan settings work?",
          a: "Credits and plan data are managed in their workspace sections. Payment or credit issues should be reported through Support.",
        },
      ],
    },
  ];

  const normalizedSearch = searchQuery.trim().toLowerCase();
  const visibleGroups = faqGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        if (!normalizedSearch) return true;
        return `${group.title} ${item.q} ${item.a}`.toLowerCase().includes(normalizedSearch);
      }),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <div className="mx-auto max-w-[980px] pb-10">
      <section className="pt-6 text-center">
        <span className="inline-flex items-center rounded-full bg-[#f3edff] px-3 py-1 text-[11px] font-black uppercase tracking-wide text-[#6d35ff]">
          BuildSetu AI Help Center
        </span>
        <h1 className="mt-5 text-4xl font-black tracking-[-0.05em] text-[#161032]">
          Get Help
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm font-semibold leading-6 text-[#817397]">
          Describe your issue and we&apos;ll help you find a solution for BOQ, BBS, exports, credits, settings and project workflows.
        </p>
      </section>

      <section className="mx-auto mt-7 max-w-[620px]">
        <button
          onClick={() => setSearchQuery("Which BuildSetu tool should I use?")}
          className="group flex h-[70px] w-full items-center justify-between rounded-2xl border border-[#cbb8ff] bg-white px-5 text-left shadow-[0_14px_35px_rgba(109,53,255,0.08)] transition hover:border-[#6d35ff] hover:bg-[#fbf8ff]"
        >
          <span className="flex items-center gap-4">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-[#6d35ff] to-[#c084fc] text-lg text-white shadow-[0_12px_24px_rgba(109,53,255,0.25)]">
              ◉
            </span>
            <span>
              <span className="block text-sm font-black text-[#161032]">Help me find the right tool</span>
              <span className="mt-1 block text-xs font-semibold text-[#817397]">BOQ, BBS, Reports, Render Studio or Settings</span>
            </span>
          </span>
          <span className="text-2xl font-black text-[#6d35ff] transition group-hover:translate-x-1">→</span>
        </button>
      </section>

      {submitted ? (
        <div className="mx-auto mt-5 max-w-[760px] rounded-2xl border border-[#d9caff] bg-[#fbf8ff] px-4 py-3 text-center text-sm font-bold text-[#6d35ff]">
          {submitted}
        </div>
      ) : null}

      <section className="mt-7 rounded-[22px] border border-[#e4d9ff] bg-white p-5 shadow-[0_14px_36px_rgba(33,19,63,0.05)]">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-black text-[#161032]">Contact us</h2>
            <p className="mt-1 text-xs font-semibold text-[#817397]">Ticket backend me save hoga aur Recent Tickets me dikhega.</p>
          </div>
          <span className="rounded-full bg-[#f3edff] px-3 py-1 text-[10px] font-black uppercase tracking-wide text-[#6d35ff]">
            Backend Saved
          </span>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <select
            value={ticket.area}
            onChange={(event) => updateTicket("area", event.target.value)}
            className="h-10 rounded-xl border border-[#e6e0f5] bg-white px-3 text-xs font-bold text-[#21133f] outline-none focus:border-[#6d35ff]"
          >
            {["Workspace", "BOQ / Estimate", "BBS", "Reports / Exports", "Credits", "Account"].map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>

          <select
            value={ticket.priority}
            onChange={(event) => updateTicket("priority", event.target.value)}
            className="h-10 rounded-xl border border-[#e6e0f5] bg-white px-3 text-xs font-bold text-[#21133f] outline-none focus:border-[#6d35ff]"
          >
            {["Low", "Medium", "High", "Urgent"].map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>

          <input
            value={ticket.contact}
            onChange={(event) => updateTicket("contact", event.target.value)}
            placeholder="Phone or email"
            className="h-10 rounded-xl border border-[#e6e0f5] bg-white px-3 text-xs font-bold text-[#21133f] outline-none placeholder:text-[#9a8caf] focus:border-[#6d35ff]"
          />

          <textarea
            value={ticket.details}
            onChange={(event) => updateTicket("details", event.target.value)}
            placeholder="Describe what you need help with..."
            className="min-h-[135px] rounded-2xl border border-[#d9d1e8] bg-[#fbfbfd] px-4 py-3 text-sm font-semibold text-[#21133f] outline-none placeholder:text-[#9a8caf] focus:border-[#6d35ff] md:col-span-3"
          />
        </div>

        <button
          onClick={submitTicket}
          disabled={submitting}
          className="mt-4 h-12 w-full rounded-2xl bg-gradient-to-r from-[#6d35ff] to-[#c084fc] text-sm font-black text-white shadow-[0_14px_28px_rgba(109,53,255,0.25)] transition hover:brightness-105 disabled:opacity-60"
        >
          {submitting ? "Sending..." : "✈ Send message"}
        </button>
      </section>

      <section className="mt-6">
        <div className="relative">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#9a8caf]">⌕</span>
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search for help..."
            className="h-12 w-full rounded-2xl border border-[#eee8fb] bg-[#f6f4f9] pl-11 pr-4 text-sm font-semibold text-[#21133f] outline-none placeholder:text-[#9a8caf] focus:border-[#6d35ff] focus:bg-white focus:ring-4 focus:ring-[#efe7ff]"
          />
        </div>
      </section>

      <section className="mt-8 space-y-7">
        {visibleGroups.length ? (
          visibleGroups.map((group) => (
            <div key={group.id}>
              <h2 className="mb-3 text-lg font-black text-[#161032]">{group.title}</h2>
              <div className="space-y-2">
                {group.items.map((item, index) => {
                  const faqId = `${group.id}-${index}`;
                  const isOpen = openFaq === faqId;

                  return (
                    <div key={item.q} className="overflow-hidden rounded-xl border border-[#e4d9ff] bg-white">
                      <button
                        onClick={() => setOpenFaq(isOpen ? "" : faqId)}
                        className="flex min-h-[48px] w-full items-center justify-between gap-4 px-4 py-3 text-left"
                      >
                        <span className="text-sm font-black text-[#21133f]">{item.q}</span>
                        <span className="text-base font-black text-[#817397]">{isOpen ? "⌃" : "⌄"}</span>
                      </button>
                      {isOpen ? (
                        <div className="border-t border-[#eee8fb] bg-[#fbfaff] px-4 py-3 text-sm font-medium leading-6 text-[#6d5f7d]">
                          {item.a}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-2xl border border-[#e4d9ff] bg-[#fbf8ff] px-5 py-6 text-center text-sm font-bold text-[#817397]">
            No help article found. Send a message from Contact us.
          </div>
        )}
      </section>

      <section className="mt-8 rounded-[22px] border border-[#e4d9ff] bg-white p-5 shadow-[0_14px_36px_rgba(33,19,63,0.05)]">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-black text-[#161032]">Recent Tickets</h2>
          <span className="rounded-full bg-[#f3edff] px-3 py-1 text-[10px] font-black text-[#6d35ff]">
            {recentTickets.length} total
          </span>
        </div>

        <div className="mt-4 space-y-2">
          {recentTickets.length ? (
            recentTickets.slice(0, 5).map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-4 rounded-2xl bg-[#fbfaff] px-4 py-3 ring-1 ring-[#eee8fb]">
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-[#21133f]">{item.subject}</p>
                  <p className="mt-1 text-[11px] font-bold text-[#817397]">{item.id} • {item.priority} • {item.area}</p>
                </div>
                <span className="shrink-0 rounded-full bg-[#f3edff] px-3 py-1 text-[10px] font-black text-[#6d35ff]">
                  {item.status}
                </span>
              </div>
            ))
          ) : (
            <div className="rounded-2xl bg-[#fbfaff] px-4 py-3 text-sm font-bold text-[#817397] ring-1 ring-[#eee8fb]">
              No tickets yet.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}



export function BackendWorkspaceSettingsPage({ theme }: PageProps) {
  void theme;

  const [settings, setSettings] = useState(defaultSettings);
  const [saved, setSaved] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadSettings() {
      try {
        const response = await fetch("/api/settings/workspace", { cache: "no-store" });
        const data = await response.json();

        if (mounted && response.ok && data.ok) {
          setSettings({ ...defaultSettings, ...(data.settings || {}) });
        }
      } catch {
        if (mounted) setSaved("Saved settings load nahi ho payi.");
      }
    }

    loadSettings();

    return () => {
      mounted = false;
    };
  }, []);

  function updateSetting(key: keyof typeof settings, value: string) {
    setSettings((current) => ({ ...current, [key]: value }));
  }

  async function saveSettings() {
    setSaving(true);
    setSaved("");

    try {
      const response = await fetch("/api/settings/workspace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Failed to save settings");
      }

      setSettings({ ...defaultSettings, ...(data.settings || {}) });
      setSaved("Settings saved to backend.");
    } catch (error) {
      setSaved(error instanceof Error ? error.message : "Settings save fail hua.");
    } finally {
      setSaving(false);
    }
  }

  async function resetSettings() {
    setSaving(true);
    setSaved("");

    try {
      const response = await fetch("/api/settings/workspace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(defaultSettings),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Failed to reset settings");
      }

      setSettings(defaultSettings);
      setSaved("Settings reset and saved to backend.");
    } catch (error) {
      setSaved(error instanceof Error ? error.message : "Settings reset fail hua.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-[1480px] space-y-5 pb-8">
      <PageHeader title="Settings" desc="Configure workspace defaults, BOQ rate assumptions, BBS steel factors and export settings." />

      {saved ? (
        <div className="rounded-2xl border border-[#e4d9ff] bg-[#fbf8ff] px-4 py-3 text-sm font-bold text-[#6d35ff]">
          {saved}
        </div>
      ) : null}

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)]">
        <div className="rounded-[28px] border border-[#e7ddff] bg-white p-5 shadow-[0_12px_30px_rgba(33,19,63,0.045)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-black text-[#161032]">Workspace Configuration</h2>
              <p className="mt-1 text-sm font-medium text-[#817397]">Ye defaults backend me save hote hain.</p>
            </div>
            <span className="rounded-full bg-[#f3edff] px-3 py-1 text-[11px] font-black text-[#6d35ff]">Backend Settings</span>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <input value={settings.companyName} onChange={(event) => updateSetting("companyName", event.target.value)} className="h-11 rounded-2xl border border-[#e6e0f5] bg-white px-3 text-sm font-bold text-[#21133f] outline-none focus:border-[#6d35ff]" />
            <select value={settings.city} onChange={(event) => updateSetting("city", event.target.value)} className="h-11 rounded-2xl border border-[#e6e0f5] bg-white px-3 text-sm font-bold text-[#21133f] outline-none focus:border-[#6d35ff]">
              {["Raipur", "Bhopal", "Indore", "Delhi", "Mumbai", "Bangalore", "Default"].map((city) => <option key={city} value={city}>{city}</option>)}
            </select>
            <select value={settings.quality} onChange={(event) => updateSetting("quality", event.target.value)} className="h-11 rounded-2xl border border-[#e6e0f5] bg-white px-3 text-sm font-bold text-[#21133f] outline-none focus:border-[#6d35ff]">
              {["Basic", "Standard", "Premium", "Luxury"].map((quality) => <option key={quality} value={quality}>{quality}</option>)}
            </select>
            <select value={settings.currency} onChange={(event) => updateSetting("currency", event.target.value)} className="h-11 rounded-2xl border border-[#e6e0f5] bg-white px-3 text-sm font-bold text-[#21133f] outline-none focus:border-[#6d35ff]">
              {["INR", "USD"].map((currency) => <option key={currency} value={currency}>{currency}</option>)}
            </select>
            <input value={settings.coverageRatio} type="number" onChange={(event) => updateSetting("coverageRatio", event.target.value)} className="h-11 rounded-2xl border border-[#e6e0f5] bg-white px-3 text-sm font-bold text-[#21133f] outline-none focus:border-[#6d35ff]" />
            <input value={settings.steelFactor} type="number" step="0.1" onChange={(event) => updateSetting("steelFactor", event.target.value)} className="h-11 rounded-2xl border border-[#e6e0f5] bg-white px-3 text-sm font-bold text-[#21133f] outline-none focus:border-[#6d35ff]" />
            <input value={settings.contingency} type="number" onChange={(event) => updateSetting("contingency", event.target.value)} className="h-11 rounded-2xl border border-[#e6e0f5] bg-white px-3 text-sm font-bold text-[#21133f] outline-none focus:border-[#6d35ff]" />
            <input value={settings.gst} type="number" onChange={(event) => updateSetting("gst", event.target.value)} className="h-11 rounded-2xl border border-[#e6e0f5] bg-white px-3 text-sm font-bold text-[#21133f] outline-none focus:border-[#6d35ff]" />
            <input value={settings.rateSource} onChange={(event) => updateSetting("rateSource", event.target.value)} className="h-11 rounded-2xl border border-[#e6e0f5] bg-white px-3 text-sm font-bold text-[#21133f] outline-none focus:border-[#6d35ff] md:col-span-2" />
          </div>

          <div className="mt-5 flex flex-wrap justify-end gap-3">
            <button onClick={resetSettings} disabled={saving} className="rounded-2xl border border-[#e4d9ff] bg-white px-5 py-3 text-sm font-black text-[#817397] hover:bg-[#fbf8ff] disabled:opacity-60">Reset</button>
            <button onClick={saveSettings} disabled={saving} className="rounded-2xl bg-[#6d35ff] px-5 py-3 text-sm font-black text-white shadow-[0_14px_28px_rgba(109,53,255,0.25)] hover:bg-[#5b26e8] disabled:opacity-60">{saving ? "Saving..." : "Save Settings"}</button>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-[24px] border border-[#e7ddff] bg-white p-5 shadow-[0_12px_30px_rgba(33,19,63,0.045)]">
            <h3 className="text-lg font-black text-[#161032]">Generation Defaults</h3>
            <div className="mt-4 space-y-2">
              {[
                ["BOQ Rate Base", settings.rateSource],
                ["City", settings.city],
                ["Quality", settings.quality],
                ["Coverage", `${settings.coverageRatio}%`],
                ["Steel Factor", `${settings.steelFactor} kg/sq.ft`],
                ["Contingency", `${settings.contingency}%`],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between rounded-2xl bg-[#fbfaff] px-4 py-3 ring-1 ring-[#eee8fb]">
                  <span className="text-xs font-black text-[#817397]">{label}</span>
                  <span className="max-w-[170px] truncate text-right text-xs font-black text-[#21133f]">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}
