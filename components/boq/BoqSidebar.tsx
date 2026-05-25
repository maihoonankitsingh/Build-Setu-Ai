"use client";

import type { CategorySummaryRow } from "./boqTypes";
import { buildConicGradient, formatCurrency, formatNumber } from "./boqUtils";

type Props = {
  totalItems: number;
  totalQuantity: number;
  totalAmount: number;
  summary: CategorySummaryRow[];
  onAddItem: () => void;
  onExportCsv: () => void;
};

export default function BoqSidebar({ totalItems, totalQuantity, totalAmount, summary, onAddItem, onExportCsv }: Props) {
  const contingency = totalAmount * 0.05;
  const directCost = Math.max(0, totalAmount - contingency);

  return (
    <aside className="space-y-4">
      <section className="rounded-[24px] border border-[#e7ddff] bg-white p-4 shadow-[0_12px_30px_rgba(33,19,63,0.045)]">
        <h3 className="text-base font-black text-[#161032]">BOQ Summary</h3>

        <div className="mt-4 grid grid-cols-2 gap-3">
          {[
            ["Total Items", formatNumber(totalItems), "▦"],
            ["Total Quantity", formatNumber(totalQuantity), "▧"],
            ["Direct Cost", formatCurrency(directCost), "₹"],
            ["Contingency (5%)", formatCurrency(contingency), "◌"],
          ].map(([label, value, icon]) => (
            <div key={label} className="rounded-2xl border border-[#eee8fb] bg-[#fbfaff] p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] font-black text-[#817397]">{label}</p>
                <span className="text-[#6d35ff]">{icon}</span>
              </div>
              <p className="mt-2 text-[14px] font-black text-[#21133f]">{value}</p>
            </div>
          ))}
        </div>

        <div className="mt-3 overflow-hidden rounded-[20px] bg-gradient-to-br from-[#6d35ff] to-[#8f5cff] p-4 text-white shadow-[0_16px_30px_rgba(109,53,255,0.24)]">
          <p className="text-[11px] font-bold opacity-80">Total Estimated Cost</p>
          <p className="mt-1 text-2xl font-black">{formatCurrency(totalAmount)}</p>
          <p className="mt-1 text-[10px] font-semibold opacity-80">Including AI-estimated category split</p>
        </div>
      </section>

      <section className="rounded-[24px] border border-[#e7ddff] bg-white p-4 shadow-[0_12px_30px_rgba(33,19,63,0.045)]">
        <h3 className="text-base font-black text-[#161032]">Cost Breakdown</h3>
        <div className="mt-4 grid grid-cols-[118px_minmax(0,1fr)] items-center gap-4">
          <div className="relative grid h-[118px] w-[118px] place-items-center rounded-full" style={{ background: buildConicGradient(summary) }}>
            <div className="grid h-[72px] w-[72px] place-items-center rounded-full bg-white shadow-inner">
              <div className="text-center">
                <p className="text-[9px] font-bold text-[#817397]">Total</p>
                <p className="text-[11px] font-black text-[#21133f]">{formatCurrency(totalAmount)}</p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            {summary.slice(0, 5).map((row) => (
              <div key={row.category} className="grid grid-cols-[12px_minmax(0,1fr)_42px] items-center gap-2 text-[10px]">
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: row.color }} />
                <span className="truncate font-black text-[#5f5471]">{row.category}</span>
                <span className="text-right font-black text-[#817397]">{row.percent}%</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-[24px] border border-[#e7ddff] bg-white p-4 shadow-[0_12px_30px_rgba(33,19,63,0.045)]">
        <h3 className="text-base font-black text-[#161032]">Quick Actions</h3>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <button onClick={onExportCsv} className="rounded-2xl border border-[#b8f0cf] bg-[#f5fff9] px-3 py-3 text-[11px] font-black text-[#139650] hover:bg-[#effff5]">
            Export CSV
          </button>
          <button className="rounded-2xl border border-[#ffd7d7] bg-[#fff8f8] px-3 py-3 text-[11px] font-black text-[#df3d3d] hover:bg-[#fff1f1]">
            Export PDF
          </button>
          <button onClick={onAddItem} className="rounded-2xl border border-[#e4d9ff] bg-[#fbf8ff] px-3 py-3 text-[11px] font-black text-[#6d35ff] hover:bg-[#f3edff]">
            Add Custom Item
          </button>
          <button className="rounded-2xl border border-[#e4d9ff] bg-white px-3 py-3 text-[11px] font-black text-[#6d35ff] hover:bg-[#fbf8ff]">
            AI Insights
          </button>
        </div>
      </section>
    </aside>
  );
}
