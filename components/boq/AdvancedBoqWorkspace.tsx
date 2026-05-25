"use client";

import { useEffect, useMemo, useState } from "react";
import type { BoqFormState, BoqItem, BoqProject } from "./boqTypes";
import { buildCategorySummary, formatCurrency, formatNumber, getProjectTitle, toNumber } from "./boqUtils";
import BoqManualForm from "./BoqManualForm";
import BoqProjectStrip from "./BoqProjectStrip";
import BoqSidebar from "./BoqSidebar";
import BoqTable from "./BoqTable";

const emptyForm: BoqFormState = {
  itemCode: "",
  description: "",
  unit: "Sqft",
  quantity: "1",
  rate: "0",
  status: "Draft",
  drawingRef: "Manual Entry",
};

const tabs = ["BOQ Summary", "Quantity Takeoff", "Rate Analysis", "Cost Estimate", "AI Insights", "BOQ Comparison", "Version History"];

export default function AdvancedBoqWorkspace({ theme }: { theme?: unknown }) {
  void theme;

  const [projects, setProjects] = useState<BoqProject[]>([]);
  const [projectId, setProjectId] = useState("");
  const [items, setItems] = useState<BoqItem[]>([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState("");
  const [activeTab, setActiveTab] = useState("BOQ Summary");
  const [categoryFilter, setCategoryFilter] = useState("All Categories");
  const [searchQuery, setSearchQuery] = useState("");
  const [showManualForm, setShowManualForm] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [savingManual, setSavingManual] = useState(false);
  const [form, setForm] = useState<BoqFormState>(emptyForm);

  const selectedProject = useMemo(() => projects.find((project) => project.id === projectId) || null, [projectId, projects]);

  const categorySummary = useMemo(() => buildCategorySummary(items, totalAmount), [items, totalAmount]);

  const totalQuantity = useMemo(() => {
    return items.reduce((sum, item) => sum + toNumber(item.quantity), 0);
  }, [items]);

  const categories = useMemo(() => {
    return ["All Categories", ...categorySummary.map((row) => row.category)];
  }, [categorySummary]);

  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return items.filter((item) => {
      const text = [item.itemCode, item.description, item.unit, item.status, item.drawingRef].filter(Boolean).join(" ").toLowerCase();
      const itemCategory = categorySummary.find((row) => text.includes(row.category.toLowerCase()))?.category;
      const category = itemCategory || (() => {
        const lower = `${item.itemCode || ""} ${item.description || ""} ${item.drawingRef || ""}`.toLowerCase();
        if (lower.includes("concrete") || lower.includes("rcc") || lower.includes("pcc")) return "Concrete Work";
        if (lower.includes("steel") || lower.includes("reinforcement")) return "Reinforcement";
        if (lower.includes("earth") || lower.includes("excavation")) return "Earthwork";
        if (lower.includes("masonry") || lower.includes("brick")) return "Masonry Work";
        return "Other";
      })();

      const matchesCategory = categoryFilter === "All Categories" || category === categoryFilter;
      const matchesQuery = !query || text.includes(query);

      return matchesCategory && matchesQuery;
    });
  }, [categoryFilter, categorySummary, items, searchQuery]);

  useEffect(() => {
    let mounted = true;

    async function loadProjects() {
      setLoading(true);
      setMessage("");

      try {
        const response = await fetch("/api/projects/list", { cache: "no-store" });
        const data = await response.json();

        if (!response.ok || !data.ok) {
          throw new Error(data.error || "Failed to load projects");
        }

        const nextProjects: BoqProject[] = data.projects || [];
        const nextProjectId = nextProjects[0]?.id || "";

        if (!mounted) return;

        setProjects(nextProjects);
        setProjectId(nextProjectId);

        if (nextProjectId) {
          await loadBoq(nextProjectId);
        }
      } catch (error) {
        if (mounted) setMessage(error instanceof Error ? error.message : "Unable to load BOQ projects.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadProjects();

    return () => {
      mounted = false;
    };
  }, []);

  async function loadBoq(nextProjectId: string) {
    const response = await fetch(`/api/boq/list?projectId=${nextProjectId}`, { cache: "no-store" });
    const data = await response.json();

    if (!response.ok || !data.ok) {
      throw new Error(data.error || "Failed to load BOQ");
    }

    setItems(data.items || []);
    setTotalAmount(Number(data.totalAmount || 0));
  }

  async function changeProject(nextProjectId: string) {
    setProjectId(nextProjectId);
    setMessage("");
    setShowManualForm(false);
    setEditingItemId(null);

    try {
      await loadBoq(nextProjectId);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load BOQ.");
    }
  }

  async function generateBoq() {
    if (!projectId) {
      setMessage("Select a project first.");
      return;
    }

    setGenerating(true);
    setMessage("");

    try {
      const response = await fetch("/api/boq/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Failed to generate BOQ");
      }

      setItems(data.items || []);
      setTotalAmount(Number(data.totalAmount || 0));
      setMessage(`BOQ generated with ${data.count || 0} items.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to generate BOQ.");
    } finally {
      setGenerating(false);
    }
  }

  function openManualForm() {
    setEditingItemId(null);
    setForm({
      ...emptyForm,
      itemCode: `M-${String(Date.now()).slice(-5)}`,
    });
    setShowManualForm(true);
  }

  function editItem(item: BoqItem) {
    setEditingItemId(item.id || null);
    setForm({
      itemCode: item.itemCode || item.code || "",
      description: item.description || "",
      unit: item.unit || "Sqft",
      quantity: String(item.quantity || "0"),
      rate: String(item.rate || "0"),
      status: item.status || "Draft",
      drawingRef: item.drawingRef || "Manual Entry",
    });
    setShowManualForm(true);
    setMessage("");
  }

  async function saveItem() {
    if (!projectId) {
      setMessage("Select a project first.");
      return;
    }

    if (!form.description.trim()) {
      setMessage("Description is required.");
      return;
    }

    setSavingManual(true);
    setMessage("");

    try {
      const endpoint = editingItemId ? "/api/boq/update-item" : "/api/boq/create-item";
      const payload = editingItemId ? { itemId: editingItemId, ...form } : { projectId, ...form };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          quantity: Number(form.quantity || 0),
          rate: Number(form.rate || 0),
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Failed to save BOQ item");
      }

      await loadBoq(projectId);
      setShowManualForm(false);
      setEditingItemId(null);
      setMessage(editingItemId ? "BOQ item updated." : "Manual BOQ item added.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save BOQ item.");
    } finally {
      setSavingManual(false);
    }
  }

  async function deleteItem(item: BoqItem) {
    if (!item.id) return;

    const confirmed = window.confirm(`Delete BOQ item ${item.itemCode || item.description || ""}?`);
    if (!confirmed) return;

    setMessage("");

    try {
      const response = await fetch("/api/boq/delete-item", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId: item.id }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Failed to delete BOQ item");
      }

      await loadBoq(projectId);
      setMessage("BOQ item deleted.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to delete BOQ item.");
    }
  }

  function exportCsv() {
    if (!filteredItems.length) {
      setMessage("No rows available to export.");
      return;
    }

    const rows = [
      ["Item Code", "Description", "Unit", "Quantity", "Rate", "Amount", "Status", "Drawing Ref"],
      ...filteredItems.map((item) => [
        item.itemCode || "",
        item.description || "",
        item.unit || "",
        item.quantity || "",
        item.rate || "",
        item.amount || "",
        item.status || "",
        item.drawingRef || "",
      ]),
    ];

    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `buildsetu-boq-${getProjectTitle(selectedProject)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mx-auto max-w-[1500px] space-y-4 pb-8">
      <div>
        <h1 className="text-3xl font-black tracking-[-0.04em] text-[#161032]">BOQ / Estimate</h1>
        <p className="mt-1 text-sm font-medium text-[#817397]">Advanced project-wise BOQ, quantity takeoff, rates, cost estimate and review controls.</p>
      </div>

      {message ? (
        <div className="rounded-2xl border border-[#e4d9ff] bg-[#fbf8ff] px-4 py-3 text-sm font-bold text-[#6d35ff]">
          {message}
        </div>
      ) : null}

      <BoqProjectStrip project={selectedProject} />

      <div className="rounded-[24px] border border-[#e7ddff] bg-white shadow-[0_12px_30px_rgba(33,19,63,0.045)]">
        <div className="flex flex-wrap gap-2 border-b border-[#eee8fb] px-4 pt-3">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`border-b-2 px-3 py-3 text-xs font-black transition ${
                activeTab === tab ? "border-[#6d35ff] text-[#6d35ff]" : "border-transparent text-[#817397] hover:text-[#21133f]"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="p-4">
          <div className="grid gap-3 lg:grid-cols-[180px_minmax(0,1fr)_120px_120px_46px]">
            <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} className="h-11 rounded-2xl border border-[#e6e0f5] bg-white px-3 text-xs font-bold text-[#21133f] outline-none">
              {categories.map((category) => <option key={category} value={category}>{category}</option>)}
            </select>

            <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search item or description..." className="h-11 rounded-2xl border border-[#e6e0f5] bg-white px-3 text-xs font-bold text-[#21133f] outline-none placeholder:text-[#9a8caf]" />

            <button onClick={() => setSearchQuery("")} className="h-11 rounded-2xl border border-[#e4d9ff] bg-white px-3 text-xs font-black text-[#6d35ff] hover:bg-[#f4efff]">Clear</button>
            <button onClick={openManualForm} className="h-11 rounded-2xl border border-[#e4d9ff] bg-[#fbf8ff] px-3 text-xs font-black text-[#6d35ff] hover:bg-[#f3edff]">+ Add</button>
            <button onClick={exportCsv} className="h-11 rounded-2xl border border-[#e4d9ff] bg-white text-[#6d35ff] hover:bg-[#fbf8ff]">⇩</button>
          </div>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,7fr)_minmax(340px,3fr)]">
        <section className="space-y-4">
          <div className="rounded-[24px] border border-[#e7ddff] bg-white p-4 shadow-[0_12px_30px_rgba(33,19,63,0.045)]">
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_170px_170px]">
              <select value={projectId} onChange={(event) => changeProject(event.target.value)} className="h-12 rounded-2xl border border-[#e6e0f5] bg-white px-4 text-sm font-bold text-[#21133f] outline-none">
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>{getProjectTitle(project)}</option>
                ))}
              </select>

              <button onClick={generateBoq} disabled={generating || !projectId} className="h-12 rounded-2xl bg-[#6d35ff] px-4 text-sm font-black text-white shadow-[0_14px_28px_rgba(109,53,255,0.24)] disabled:opacity-60">
                {generating ? "Generating..." : "Generate BOQ"}
              </button>

              <div className="flex h-12 items-center justify-center rounded-2xl border border-[#e7ddff] bg-[#fbfaff] px-4 text-sm font-black text-[#21133f]">
                {formatCurrency(totalAmount)}
              </div>
            </div>
          </div>

          {showManualForm ? (
            <BoqManualForm
              form={form}
              editingItemId={editingItemId}
              saving={savingManual}
              onChange={setForm}
              onSave={saveItem}
              onClose={() => {
                setShowManualForm(false);
                setEditingItemId(null);
              }}
            />
          ) : null}

          <BoqTable items={filteredItems} loading={loading} onEdit={editItem} onDelete={deleteItem} />

          <div className="flex items-center justify-between rounded-[20px] border border-[#eee8fb] bg-white px-4 py-4">
            <p className="text-sm font-black text-[#21133f]">Total Estimated Cost</p>
            <p className="text-xl font-black text-[#6d35ff]">{formatCurrency(totalAmount)}</p>
          </div>
        </section>

        <BoqSidebar
          totalItems={items.length}
          totalQuantity={totalQuantity}
          totalAmount={totalAmount}
          summary={categorySummary}
          onAddItem={openManualForm}
          onExportCsv={exportCsv}
        />
      </div>

      <div className="rounded-[20px] border border-[#f5d89d] bg-[#fffaf0] px-4 py-4 text-sm font-bold leading-6 text-[#9a6412]">
        AI-generated BOQ is an estimate. Final quantity, rates and scope must be verified before approval.
      </div>
    </div>
  );
}
