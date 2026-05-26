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
    type: "BOQ / Estimate Issue",
    priority: "Medium",
    area: "BOQ / Estimate",
    subject: "",
    details: "",
    contact: "",
  });
  const [submitted, setSubmitted] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [recentTickets, setRecentTickets] = useState<SupportTicketRecord[]>([]);

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
    if (!ticket.subject.trim() || !ticket.details.trim()) {
      setSubmitted("Subject aur details required hain.");
      return;
    }

    setSubmitting(true);
    setSubmitted("");

    try {
      const response = await fetch("/api/support/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(ticket),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Failed to submit support ticket");
      }

      setRecentTickets(data.tickets || []);
      setSubmitted(`Ticket ${data.ticket?.id || ""} saved successfully.`);
      setTicket((current) => ({ ...current, subject: "", details: "" }));
    } catch (error) {
      setSubmitted(error instanceof Error ? error.message : "Ticket submit fail hua.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-[1480px] space-y-5 pb-8">
      <PageHeader title="Support" desc="Raise tickets, report product issues and track BuildSetu AI workspace support." />

      {submitted ? (
        <div className="rounded-2xl border border-[#e4d9ff] bg-[#fbf8ff] px-4 py-3 text-sm font-bold text-[#6d35ff]">
          {submitted}
        </div>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-3">
        {[
          ["Technical Support", "BOQ, BBS, exports, login aur project data issues report karein.", "24h", "Target response"],
          ["Billing & Credits", "Credits, subscription, payment verification aur invoice related support.", "Pro", "Workspace plan"],
          ["Project Review", "Generated BOQ/BBS output review, wrong quantity, wrong rate ya missing item report karein.", "Review", "Engineer gate"],
        ].map(([title, desc, stat, label]) => (
          <div key={title} className="rounded-[24px] border border-[#e7ddff] bg-white p-5 shadow-[0_12px_30px_rgba(33,19,63,0.045)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-black text-[#161032]">{title}</h2>
                <p className="mt-2 text-sm font-medium leading-6 text-[#817397]">{desc}</p>
              </div>
              <div className="rounded-2xl bg-[#f3edff] px-4 py-3 text-center">
                <p className="text-lg font-black text-[#6d35ff]">{stat}</p>
                <p className="mt-1 text-[10px] font-black uppercase text-[#8a7ca6]">{label}</p>
              </div>
            </div>
          </div>
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.8fr)]">
        <div className="rounded-[28px] border border-[#e7ddff] bg-white p-5 shadow-[0_12px_30px_rgba(33,19,63,0.045)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-black text-[#161032]">Create Support Ticket</h2>
              <p className="mt-1 text-sm font-medium text-[#817397]">Issue details clear likho taaki support faster resolve kar sake.</p>
            </div>
            <span className="rounded-full bg-[#f3edff] px-3 py-1 text-[11px] font-black text-[#6d35ff]">Backend Saved</span>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <select value={ticket.type} onChange={(event) => updateTicket("type", event.target.value)} className="h-11 rounded-2xl border border-[#e6e0f5] bg-white px-3 text-sm font-bold text-[#21133f] outline-none focus:border-[#6d35ff]">
              {["BOQ / Estimate Issue", "BBS Issue", "Export Issue", "Credits / Billing", "Login / Account", "Bug Report", "Feature Request"].map((item) => <option key={item} value={item}>{item}</option>)}
            </select>

            <select value={ticket.priority} onChange={(event) => updateTicket("priority", event.target.value)} className="h-11 rounded-2xl border border-[#e6e0f5] bg-white px-3 text-sm font-bold text-[#21133f] outline-none focus:border-[#6d35ff]">
              {["Low", "Medium", "High", "Urgent"].map((item) => <option key={item} value={item}>{item}</option>)}
            </select>

            <select value={ticket.area} onChange={(event) => updateTicket("area", event.target.value)} className="h-11 rounded-2xl border border-[#e6e0f5] bg-white px-3 text-sm font-bold text-[#21133f] outline-none focus:border-[#6d35ff]">
              {["BOQ / Estimate", "BBS", "Projects", "Exports", "Credits", "Account"].map((item) => <option key={item} value={item}>{item}</option>)}
            </select>

            <input value={ticket.subject} onChange={(event) => updateTicket("subject", event.target.value)} placeholder="Subject: 59x71 BBS steel quantity mismatch" className="h-11 rounded-2xl border border-[#e6e0f5] bg-white px-3 text-sm font-bold text-[#21133f] outline-none placeholder:text-[#9a8caf] focus:border-[#6d35ff] md:col-span-2" />
            <input value={ticket.contact} onChange={(event) => updateTicket("contact", event.target.value)} placeholder="Phone or email" className="h-11 rounded-2xl border border-[#e6e0f5] bg-white px-3 text-sm font-bold text-[#21133f] outline-none placeholder:text-[#9a8caf] focus:border-[#6d35ff]" />

            <textarea value={ticket.details} onChange={(event) => updateTicket("details", event.target.value)} placeholder="Issue reproduce steps, expected output, actual output, project name and screenshot note..." className="min-h-[135px] rounded-2xl border border-[#e6e0f5] bg-white px-3 py-3 text-sm font-bold text-[#21133f] outline-none placeholder:text-[#9a8caf] focus:border-[#6d35ff] md:col-span-3" />
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs font-semibold text-[#817397]">Ticket backend me data/generated/support-tickets.json me save hota hai.</p>
            <button onClick={submitTicket} disabled={submitting} className="rounded-2xl bg-[#6d35ff] px-5 py-3 text-sm font-black text-white shadow-[0_14px_28px_rgba(109,53,255,0.25)] hover:bg-[#5b26e8] disabled:opacity-60">
              {submitting ? "Submitting..." : "Submit Ticket"}
            </button>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-[24px] border border-[#e7ddff] bg-white p-5 shadow-[0_12px_30px_rgba(33,19,63,0.045)]">
            <h3 className="text-lg font-black text-[#161032]">Recent Tickets</h3>
            <div className="mt-4 space-y-2">
              {recentTickets.length ? recentTickets.slice(0, 5).map((item) => (
                <div key={item.id} className="rounded-2xl bg-[#fbfaff] px-4 py-3 ring-1 ring-[#eee8fb]">
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate text-xs font-black text-[#21133f]">{item.subject}</p>
                    <span className="rounded-full bg-[#f3edff] px-2 py-1 text-[10px] font-black text-[#6d35ff]">{item.status}</span>
                  </div>
                  <p className="mt-1 text-[10px] font-bold text-[#817397]">{item.id} • {item.priority} • {item.area}</p>
                </div>
              )) : (
                <div className="rounded-2xl bg-[#fbfaff] px-4 py-3 text-xs font-bold text-[#817397] ring-1 ring-[#eee8fb]">
                  No tickets yet.
                </div>
              )}
            </div>
          </div>
        </aside>
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
