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

      <div className="grid grid-cols-2 gap-3">
        <input name="address" placeholder="Address" required className="field-input col-span-2" />
        <input name="suburb" placeholder="Suburb" className="field-input" />
        <input name="region" placeholder="Region" defaultValue="Queenstown" className="field-input" />
        <input name="legal_description" placeholder="Legal description (optional)" className="field-input col-span-2" />
        <input name="title_reference" placeholder="Title reference (optional)" className="field-input col-span-2" />
        <input name="floor_area_m2" type="number" min="0" placeholder="Floor area (m²)" className="field-input" />
        <input name="land_area_m2" type="number" min="0" placeholder="Land area (m²)" className="field-input" />
        <input name="bedrooms" type="number" min="0" placeholder="Bedrooms" className="field-input" />
        <input name="bathrooms" type="number" min="0" placeholder="Bathrooms" className="field-input" />
        <input name="land_value" type="number" min="0" placeholder="Land value ($)" className="field-input" />
        <input name="improvements_value" type="number" min="0" placeholder="Improvements value ($)" className="field-input" />
        <input name="capital_value" type="number" min="0" placeholder="Capital / rating value ($)" className="field-input" />
        <div>
          <label className="mb-1.5 block text-[12px] font-semibold text-[#524d40]">Last sold</label>
          <input name="last_sold_date" type="date" className="field-input" />
        </div>
        <input name="last_sold_price" type="number" min="0" placeholder="Last sold price ($)" className="field-input" />
        <input name="vendor_name" placeholder="Vendor name (optional)" className="field-input" />
        <input name="vendor_email" type="email" placeholder="Vendor email (optional)" className="field-input" />
      </div>

      {state.error && <p className="mt-3 text-sm text-[#b23b2e]">{state.error}</p>}

      <button
        disabled={pending}
        className="mt-4 rounded-lg bg-[#14130f] px-5 py-2.5 text-sm font-semibold text-white disabled:bg-[#c9c3b3]"
      >
        {pending ? "Saving…" : "Create appraisal"}
      </button>
    </form>
  );
}
