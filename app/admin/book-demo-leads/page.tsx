import { promises as fs } from "fs";
import path from "path";
import { cookies } from "next/headers";
import { AUTH_COOKIE, getUserFromSession } from "@/lib/auth-store";

export const dynamic = "force-dynamic";

type DemoLead = {
  id: string;
  name: string;
  phone: string;
  email: string;
  company: string;
  role: string;
  projectType: string;
  requirement: string;
  source: string;
  status: string;
  createdAt: string;
};

const LEADS_FILE = path.join(process.cwd(), "data", "runtime", "book-demo-leads.json");

async function loadLeads(): Promise<DemoLead[]> {
  try {
    const raw = await fs.readFile(LEADS_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Asia/Kolkata",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

async function getCurrentUserEmail() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE)?.value;
    const user = await getUserFromSession(token);
    return typeof user?.email === "string" ? user.email : "";
  } catch {
    return "";
  }
}

function isAdmin(email: string) {
  const allowed = (
    process.env.BUILDSETU_ADMIN_EMAILS ||
    process.env.ADMIN_EMAILS ||
    "ankit41gzp@gmail.com"
  )
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

  return allowed.includes(email.toLowerCase());
}

export default async function BookDemoLeadsPage() {
  const email = await getCurrentUserEmail();

  if (!isAdmin(email)) {
    return (
      <main className="min-h-screen bg-[#fbfaff] px-4 py-12 text-[#120a2f]">
        <div className="mx-auto max-w-2xl rounded-[28px] border border-[#eadff8] bg-white p-8 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-[#6d28d9]">
            Admin access required
          </p>
          <h1 className="mt-3 text-3xl font-black tracking-[-0.06em]">
            Book Demo leads are protected.
          </h1>
          <p className="mt-3 text-sm font-semibold leading-7 text-[#6b5e7b]">
            Login with an allowed admin email to view submitted demo leads.
          </p>
          <a
            href="/login"
            className="mt-6 inline-flex rounded-xl bg-[#6d28d9] px-5 py-3 text-sm font-black text-white"
          >
            Login
          </a>
        </div>
      </main>
    );
  }

  const leads = await loadLeads();

  return (
    <main className="min-h-screen bg-[#fbfaff] px-4 py-8 text-[#120a2f] md:px-6">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.14em] text-[#6d28d9]">
              BuildSetu AI Admin
            </p>
            <h1 className="mt-2 text-4xl font-black tracking-[-0.07em]">
              Book Demo Leads
            </h1>
            <p className="mt-2 text-sm font-semibold text-[#786a91]">
              Total leads: {leads.length}
            </p>
          </div>
          <a
            href="/admin"
            className="inline-flex rounded-xl border border-[#e4d7f5] bg-white px-5 py-3 text-sm font-black text-[#2b1457]"
          >
            Back to Admin
          </a>
        </div>

        <div className="mt-7 overflow-hidden rounded-[28px] border border-[#e8ddf7] bg-white shadow-[0_18px_60px_rgba(65,29,120,0.08)]">
          <div className="overflow-x-auto">
            <table className="min-w-[1100px] w-full text-left text-sm">
              <thead className="bg-[#f8f3ff] text-xs uppercase tracking-[0.08em] text-[#6d28d9]">
                <tr>
                  <th className="px-4 py-4 font-black">Date</th>
                  <th className="px-4 py-4 font-black">Name</th>
                  <th className="px-4 py-4 font-black">Phone</th>
                  <th className="px-4 py-4 font-black">Email</th>
                  <th className="px-4 py-4 font-black">Company</th>
                  <th className="px-4 py-4 font-black">Role</th>
                  <th className="px-4 py-4 font-black">Project Type</th>
                  <th className="px-4 py-4 font-black">Requirement</th>
                  <th className="px-4 py-4 font-black">Status</th>
                </tr>
              </thead>
              <tbody>
                {leads.length ? (
                  leads.map((lead) => (
                    <tr key={lead.id} className="border-t border-[#eee8f8] align-top">
                      <td className="px-4 py-4 font-semibold text-[#786a91]">
                        {formatDate(lead.createdAt)}
                      </td>
                      <td className="px-4 py-4 font-black text-[#2b1457]">{lead.name}</td>
                      <td className="px-4 py-4 font-bold">
                        <a className="text-[#6d28d9]" href={`https://wa.me/${lead.phone.replace(/\D/g, "")}`}>
                          {lead.phone}
                        </a>
                      </td>
                      <td className="px-4 py-4 font-semibold text-[#5f5476]">{lead.email || "-"}</td>
                      <td className="px-4 py-4 font-semibold text-[#5f5476]">{lead.company || "-"}</td>
                      <td className="px-4 py-4 font-semibold text-[#5f5476]">{lead.role || "-"}</td>
                      <td className="px-4 py-4 font-semibold text-[#5f5476]">{lead.projectType || "-"}</td>
                      <td className="max-w-[320px] px-4 py-4 font-medium leading-6 text-[#5f5476]">
                        {lead.requirement || "-"}
                      </td>
                      <td className="px-4 py-4">
                        <span className="rounded-full bg-[#f1e6ff] px-3 py-1 text-xs font-black text-[#6d28d9]">
                          {lead.status || "NEW"}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} className="px-4 py-10 text-center font-semibold text-[#786a91]">
                      No demo leads yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}
