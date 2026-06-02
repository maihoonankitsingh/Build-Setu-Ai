"use client";

import type { BoqFormState } from "./boqTypes";
import { formatCurrency, toNumber } from "./boqUtils";

type Props = {
  form: BoqFormState;
  editingItemId: string | null;
  saving: boolean;
  onChange: (form: BoqFormState) => void;
  onSave: () => void;
  onClose: () => void;
};

export default function BoqManualForm({ form, editingItemId, saving, onChange, onSave, onClose }: Props) {
  const amount = toNumber(form.quantity) * toNumber(form.rate);

  function update(key: keyof BoqFormState, value: string) {
    onChange({ ...form, [key]: value });
  }

  return (
    <section className="rounded-[24px] border border-[#e7ddff] bg-white p-4 shadow-[0_12px_28px_rgba(33,19,63,0.05)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-[#161032]">{editingItemId ? "Edit BOQ Item" : "Add Manual BOQ Item"}</h2>
          <p className="mt-1 text-xs font-semibold text-[#817397]">Quantity × Rate se amount auto-calculate hoga.</p>
        </div>
        <button onClick={onClose} className="rounded-xl border border-[#e4d9ff] bg-white px-4 py-2 text-xs font-black text-[#817397] hover:bg-[#fbf8ff]">
          Close
        </button>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-5">
        <input value={form.itemCode} onChange={(event) => update("itemCode", event.target.value)} placeholder="Item Code" className="h-11 rounded-2xl border border-[#e6e0f5] px-3 text-sm font-bold outline-none focus:border-[#6d35ff]" />
        <input value={form.description} onChange={(event) => update("description", event.target.value)} placeholder="Description" className="h-11 rounded-2xl border border-[#e6e0f5] px-3 text-sm font-bold outline-none focus:border-[#6d35ff] md:col-span-2" />

        <select value={form.unit} onChange={(event) => update("unit", event.target.value)} className="h-11 rounded-2xl border border-[#e6e0f5] px-3 text-sm font-bold outline-none focus:border-[#6d35ff]">
          {["Sqft", "Cum", "Kg", "Rft", "Nos", "Lump Sum"].map((unit) => <option key={unit} value={unit}>{unit}</option>)}
        </select>

        <select value={form.status} onChange={(event) => update("status", event.target.value)} className="h-11 rounded-2xl border border-[#e6e0f5] px-3 text-sm font-bold outline-none focus:border-[#6d35ff]">
          {["AI Final Draft", "AI Final Draft - Review Required", "Engineer Verified", "Changes Required", "Locked"].map((status) => <option key={status} value={status}>{status}</option>)}
        </select>

        <input value={form.quantity} type="number" onChange={(event) => update("quantity", event.target.value)} placeholder="Quantity" className="h-11 rounded-2xl border border-[#e6e0f5] px-3 text-sm font-bold outline-none focus:border-[#6d35ff]" />
        <input value={form.rate} type="number" onChange={(event) => update("rate", event.target.value)} placeholder="Rate" className="h-11 rounded-2xl border border-[#e6e0f5] px-3 text-sm font-bold outline-none focus:border-[#6d35ff]" />

        <div className="flex h-11 items-center rounded-2xl border border-[#e6e0f5] bg-[#fbfaff] px-3 text-sm font-black text-[#21133f]">
          {formatCurrency(amount)}
        </div>

        <input value={form.drawingRef} onChange={(event) => update("drawingRef", event.target.value)} placeholder="Drawing / Scope Ref" className="h-11 rounded-2xl border border-[#e6e0f5] px-3 text-sm font-bold outline-none focus:border-[#6d35ff]" />

        <button onClick={onSave} disabled={saving} className="h-11 rounded-2xl bg-[#21133f] px-4 text-sm font-black text-white shadow-[0_12px_24px_rgba(33,19,63,0.18)] disabled:opacity-60">
          {saving ? "Saving..." : editingItemId ? "Update Item" : "Add Item"}
        </button>
      </div>
    </section>
  );
}
