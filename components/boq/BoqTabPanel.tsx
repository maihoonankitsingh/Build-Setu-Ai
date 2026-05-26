"use client";

import type { BoqItem, CategorySummaryRow } from "./boqTypes";
import { formatCurrency, formatNumber, getBoqCategory, getItemCode, toNumber } from "./boqUtils";

type Props = {
  activeTab: string;
  items: BoqItem[];
  filteredItems: BoqItem[];
  totalAmount: number;
  totalQuantity: number;
  categorySummary: CategorySummaryRow[];
  onAddItem: () => void;
  onExportCsv: () => void;
};

function StatCard({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="rounded-2xl border border-[#eee8fb] bg-[#fbfaff] p-3">
      <p className="text-[10px] font-black uppercase tracking-wide text-[#817397]">{label}</p>
      <p className="mt-1 text-[15px] font-black text-[#21133f]">{value}</p>
      {note ? <p className="mt-1 text-[10px] font-semibold text-[#817397]">{note}</p> : null}
    </div>
  );
}

function MiniRow({ label, value, right }: { label: string; value: string; right?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2 ring-1 ring-[#eee8fb]">
      <div className="min-w-0">
        <p className="truncate text-[12px] font-black text-[#21133f]">{label}</p>
        <p className="text-[10px] font-semibold text-[#817397]">{value}</p>
      </div>
      {right ? <span className="shrink-0 text-[11px] font-black text-[#6d35ff]">{right}</span> : null}
    </div>
  );
}

export default function BoqTabPanel({
  activeTab,
  items,
  filteredItems,
  totalAmount,
  totalQuantity,
  categorySummary,
  onAddItem,
  onExportCsv,
}: Props) {
  const directCost = totalAmount * 0.95;
  const contingency = totalAmount * 0.05;

  const unitSummary = Object.entries(
    items.reduce<Record<string, { qty: number; amount: number; count: number }>>((acc, item) => {
      const unit = item.unit || "Unit";
      acc[unit] ||= { qty: 0, amount: 0, count: 0 };
      acc[unit].qty += toNumber(item.quantity);
      acc[unit].amount += toNumber(item.amount);
      acc[unit].count += 1;
      return acc;
    }, {}),
  ).sort((a, b) => b[1].amount - a[1].amount);

  const highValueItems = [...items]
    .sort((a, b) => toNumber(b.amount) - toNumber(a.amount))
    .slice(0, 5);

  const highRateItems = [...items]
    .sort((a, b) => toNumber(b.rate) - toNumber(a.rate))
    .slice(0, 5);

  const manualItems = items.filter((item) => {
    const code = getItemCode(item).toLowerCase();
    const ref = String(item.drawingRef || "").toLowerCase();
    return code.startsWith("m-") || ref.includes("manual");
  });

  const aiItems = items.filter((item) => !manualItems.includes(item));

  const insights = [
    {
      title: "High-cost category",
      value: categorySummary[0] ? `${categorySummary[0].category} is ${categorySummary[0].percent}% of total cost.` : "No category found.",
    },
    {
      title: "Manual edits",
      value: `${manualItems.length} manual item${manualItems.length === 1 ? "" : "s"} detected in this BOQ.`,
    },
    {
      title: "Review gate",
      value: `${items.filter((item) => String(item.status || "").toLowerCase().includes("review")).length} rows need review.`,
    },
    {
      title: "Rate check",
      value: highRateItems[0] ? `${highRateItems[0].description || getItemCode(highRateItems[0])} has the highest rate.` : "No rate data available.",
    },
  ];

  return (
    <div className="mt-3 rounded-2xl border border-[#eee8fb] bg-[#fbfaff] p-3">
      {activeTab === "BOQ Summary" ? (
        <div className="grid gap-3 md:grid-cols-4">
          <StatCard label="Total Items" value={formatNumber(items.length)} note={`${filteredItems.length} visible rows`} />
          <StatCard label="Total Quantity" value={formatNumber(totalQuantity)} note="All BOQ units combined" />
          <StatCard label="Total Estimate" value={formatCurrency(totalAmount)} note="Current BOQ value" />
          <StatCard label="Top Cost Head" value={categorySummary[0]?.category || "—"} note={categorySummary[0] ? `${categorySummary[0].percent}% share` : "No cost split"} />
        </div>
      ) : null}

      {activeTab === "Quantity Takeoff" ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {unitSummary.length ? (
            unitSummary.map(([unit, row]) => (
              <StatCard key={unit} label={`${unit} Quantity`} value={formatNumber(row.qty)} note={`${row.count} rows • ${formatCurrency(row.amount)}`} />
            ))
          ) : (
            <StatCard label="No Quantity" value="—" note="Generate BOQ first" />
          )}
        </div>
      ) : null}

      {activeTab === "Rate Analysis" ? (
        <div className="grid gap-3 lg:grid-cols-2">
          <div className="space-y-2">
            <p className="text-[12px] font-black text-[#21133f]">Highest Rate Items</p>
            {highRateItems.map((item) => (
              <MiniRow key={item.id || getItemCode(item)} label={item.description || getItemCode(item)} value={`${item.unit || "Unit"} • Qty ${formatNumber(item.quantity)}`} right={formatCurrency(item.rate)} />
            ))}
          </div>
          <div className="space-y-2">
            <p className="text-[12px] font-black text-[#21133f]">Highest Amount Items</p>
            {highValueItems.map((item) => (
              <MiniRow key={item.id || getItemCode(item)} label={item.description || getItemCode(item)} value={getBoqCategory(item)} right={formatCurrency(item.amount)} />
            ))}
          </div>
        </div>
      ) : null}

      {activeTab === "Cost Estimate" ? (
        <div className="grid gap-3 lg:grid-cols-[1fr_1.4fr]">
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            <StatCard label="Direct Cost" value={formatCurrency(directCost)} note="95% of estimate" />
            <StatCard label="Contingency" value={formatCurrency(contingency)} note="5% planning buffer" />
            <StatCard label="Final Estimate" value={formatCurrency(totalAmount)} note="Direct + contingency" />
          </div>
          <div className="space-y-2">
            <p className="text-[12px] font-black text-[#21133f]">Category Cost Split</p>
            {categorySummary.slice(0, 6).map((row) => (
              <MiniRow key={row.category} label={row.category} value={`${row.percent}% of total`} right={formatCurrency(row.amount)} />
            ))}
          </div>
        </div>
      ) : null}

      {activeTab === "AI Insights" ? (
        <div className="grid gap-3 md:grid-cols-2">
          {insights.map((item) => (
            <div key={item.title} className="rounded-2xl border border-[#eee8fb] bg-white p-3">
              <p className="text-[12px] font-black text-[#21133f]">{item.title}</p>
              <p className="mt-1 text-[11px] font-semibold leading-5 text-[#817397]">{item.value}</p>
            </div>
          ))}
        </div>
      ) : null}

      {activeTab === "BOQ Comparison" ? (
        <div className="grid gap-3 md:grid-cols-3">
          <StatCard label="AI Generated Rows" value={formatNumber(aiItems.length)} note={formatCurrency(aiItems.reduce((sum, item) => sum + toNumber(item.amount), 0))} />
          <StatCard label="Manual Rows" value={formatNumber(manualItems.length)} note={formatCurrency(manualItems.reduce((sum, item) => sum + toNumber(item.amount), 0))} />
          <StatCard label="Current Total" value={formatCurrency(totalAmount)} note="AI + manual combined" />
        </div>
      ) : null}

      {activeTab === "Version History" ? (
        <div className="grid gap-3 lg:grid-cols-[1fr_180px_180px]">
          <div className="rounded-2xl border border-[#eee8fb] bg-white p-3">
            <p className="text-[12px] font-black text-[#21133f]">Current Editable Draft</p>
            <p className="mt-1 text-[11px] font-semibold text-[#817397]">
              {items.length} rows • {formatCurrency(totalAmount)} • Manual edits: {manualItems.length}
            </p>
          </div>
          <button onClick={onExportCsv} className="rounded-2xl border border-[#b8f0cf] bg-[#f5fff9] px-3 py-3 text-[11px] font-black text-[#139650] hover:bg-[#effff5]">
            Export Snapshot
          </button>
          <button onClick={onAddItem} className="rounded-2xl border border-[#e4d9ff] bg-white px-3 py-3 text-[11px] font-black text-[#6d35ff] hover:bg-[#fbf8ff]">
            Add Revision Item
          </button>
        </div>
      ) : null}
    </div>
  );
}
