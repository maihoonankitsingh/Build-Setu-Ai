"use client";

import type { BoqItem } from "./boqTypes";
import { formatCurrency, formatNumber, getBoqCategory, getItemCode, toNumber } from "./boqUtils";

type Props = {
  items: BoqItem[];
  loading: boolean;
  onEdit: (item: BoqItem) => void;
  onDelete: (item: BoqItem) => void;
};

export default function BoqTable({ items, loading, onEdit, onDelete }: Props) {
  const grouped = items.reduce<Record<string, BoqItem[]>>((acc, item) => {
    const category = getBoqCategory(item);
    acc[category] ||= [];
    acc[category].push(item);
    return acc;
  }, {});

  return (
    <div className="overflow-hidden rounded-2xl border border-[#e7ddff] bg-white">
      <div className="max-h-[610px] overflow-auto">
        <table className="w-full min-w-[1080px] text-left text-xs">
          <thead className="sticky top-0 z-10 bg-[#6d35ff] text-white">
            <tr>
              {["Item No.", "Description", "Unit", "Quantity", "Rate (₹)", "Amount (₹)", "Status", "Actions"].map((heading) => (
                <th key={heading} className="px-4 py-3 font-black">{heading}</th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-[#eee8fb]">
            {loading ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-sm font-bold text-[#817397]">
                  Loading BOQ...
                </td>
              </tr>
            ) : Object.keys(grouped).length ? (
              Object.entries(grouped).map(([category, rows], categoryIndex) => {
                const categoryTotal = rows.reduce((sum, item) => sum + toNumber(item.amount), 0);

                return (
                  <>
                    <tr key={`cat-${category}`} className="bg-[#f5f1ff]">
                      <td className="px-4 py-3 font-black text-[#21133f]">{categoryIndex + 1}</td>
                      <td colSpan={4} className="px-4 py-3 font-black uppercase tracking-wide text-[#21133f]">{category}</td>
                      <td className="px-4 py-3 font-black text-[#21133f]">{formatCurrency(categoryTotal)}</td>
                      <td colSpan={2} className="px-4 py-3 text-right text-[11px] font-black text-[#6d35ff]">{rows.length} items</td>
                    </tr>

                    {rows.map((item, index) => (
                      <tr key={item.id || `${category}-${index}`} className="hover:bg-[#fbfaff]">
                        <td className="px-4 py-3 font-black text-[#21133f]">{getItemCode(item)}</td>
                        <td className="px-4 py-3 font-bold text-[#3c3158]">{item.description}</td>
                        <td className="px-4 py-3 font-bold text-[#6c5d82]">{item.unit}</td>
                        <td className="px-4 py-3 font-bold text-[#6c5d82]">{formatNumber(item.quantity)}</td>
                        <td className="px-4 py-3 font-bold text-[#6c5d82]">{formatCurrency(item.rate)}</td>
                        <td className="px-4 py-3 font-black text-[#21133f]">{formatCurrency(item.amount)}</td>
                        <td className="px-4 py-3">
                          <span className="rounded-full bg-[#fff4e8] px-2.5 py-1 text-[10px] font-black text-[#f97316]">
                            {item.status || "Draft"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button onClick={() => onEdit(item)} className="rounded-lg border border-[#e4d9ff] bg-white px-3 py-1.5 text-[11px] font-black text-[#6d35ff] hover:bg-[#f4efff]">
                              Edit
                            </button>
                            <button onClick={() => onDelete(item)} className="rounded-lg border border-[#ffd7d7] bg-[#fff8f8] px-3 py-1.5 text-[11px] font-black text-[#df3d3d] hover:bg-[#fff1f1]">
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </>
                );
              })
            ) : (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-sm font-bold text-[#817397]">
                  No BOQ rows found. Generate BOQ or add a manual item.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
