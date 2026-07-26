"use client";

import { useActionState, useState } from "react";
import { createAppraisal, type AppraisalActionState } from "./actions";

export function NewAppraisalForm() {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<AppraisalActionState, FormData>(createAppraisal, {});

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mb-8 rounded-lg border border-[#e7e2d4] px-4 py-2 text-sm font-semibold hover:border-[#14130f]"
      >
        + New appraisal
      </button>
    );
  }

  return (
    <form action={formAction} className="mb-8 rounded-lg border border-[#e7e2d4] bg-white p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-display text-[16px] font-semibold">New appraisal</h3>
        <button type="button" onClick={() => setOpen(false)} className="text-xs font-semibold text-[#837c6c]">
          Cancel
        </button>
      </div>

      <div className="space-y-3">
        <input name="address" placeholder="Property address" required autoFocus className="field-input w-full" />
        <div>
          <label className="mb-1.5 block text-[12px] font-semibold text-[#524d40]">
            Comparable sales CSV (optional — Prover / Property Guru / REINZ export)
          </label>
          <input name="file" type="file" accept=".csv,text/csv" className="text-sm" />
          <p className="mt-1.5 text-[11.5px] leading-relaxed text-[#837c6c]">
            If the subject's own sale is in this file (it usually is — the export is centred on it), its floor
            area, land area, capital value and last sale get filled in automatically before any comparable is
            graded. Everything else — legal description, bathrooms, vendor details — can be added afterwards
            from the appraisal page.
          </p>
        </div>
      </div>

      {state.error && <p className="mt-3 text-sm text-[#b23b2e]">{state.error}</p>}

      <button
        disabled={pending}
        className="mt-4 rounded-lg bg-[#14130f] px-5 py-2.5 text-sm font-semibold text-white disabled:bg-[#c9c3b3]"
      >
        {pending ? "Creating…" : "Create appraisal"}
      </button>
    </form>
  );
}
