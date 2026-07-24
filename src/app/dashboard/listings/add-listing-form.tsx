"use client";

import { useActionState, useState } from "react";
import { addListing, type AddListingState } from "./actions";

const SALE_METHODS = ["Deadline sale", "Auction", "Price by negotiation", "Asking price", "Tender"];

export function AddListingForm() {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<AddListingState, FormData>(addListing, {});

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mb-8 rounded-lg border border-[#e7e2d4] px-4 py-2 text-sm font-semibold hover:border-[#14130f]"
      >
        + Add listing
      </button>
    );
  }

  return (
    <form action={formAction} className="mb-8 rounded-lg border border-[#e7e2d4] bg-white p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-display text-[16px] font-semibold">New listing</h3>
        <button type="button" onClick={() => setOpen(false)} className="text-xs font-semibold text-[#837c6c]">
          Cancel
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <input name="address" placeholder="Address" required className="field-input col-span-2" />
        <input name="suburb" placeholder="Suburb" required className="field-input" />
        <input name="region" placeholder="Region" defaultValue="Queenstown" className="field-input" />
        <input name="postcode" placeholder="Postcode" className="field-input" />
        <select name="sale_method" defaultValue="" className="field-input">
          <option value="" disabled>
            Sale method
          </option>
          {SALE_METHODS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <input name="bedrooms" type="number" min="0" placeholder="Bedrooms" className="field-input" />
        <input name="bathrooms" type="number" min="0" placeholder="Bathrooms" className="field-input" />
        <input name="car_spaces" type="number" min="0" placeholder="Car spaces" className="field-input" />

        <div className="col-span-2">
          <label className="mb-1.5 block text-[12px] font-semibold text-[#524d40]">
            Deadline / auction date (optional)
          </label>
          <input name="sale_method_date" type="date" className="field-input" />
        </div>

        <div>
          <label className="mb-1.5 block text-[12px] font-semibold text-[#524d40]">
            First open home starts
          </label>
          <input name="open_home_start" type="datetime-local" className="field-input" />
        </div>
        <div>
          <label className="mb-1.5 block text-[12px] font-semibold text-[#524d40]">Ends</label>
          <input name="open_home_end" type="datetime-local" className="field-input" />
        </div>

        <input name="vendor_name" placeholder="Vendor name (optional)" className="field-input" />
        <input name="vendor_email" type="email" placeholder="Vendor email (optional)" className="field-input" />
      </div>

      {state.error && <p className="mt-3 text-sm text-[#b23b2e]">{state.error}</p>}

      <button
        disabled={pending}
        className="mt-4 rounded-lg bg-[#14130f] px-5 py-2.5 text-sm font-semibold text-white disabled:bg-[#c9c3b3]"
      >
        {pending ? "Saving…" : "Save listing"}
      </button>
    </form>
  );
}
