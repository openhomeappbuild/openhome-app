"use client";

import { useActionState, useState } from "react";
import { createFollowUp, type ActionState } from "./actions";

export function NewFollowUpForm({ listings }: { listings: { id: string; address: string }[] }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(createFollowUp, { ok: false });

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mb-4 rounded-lg border border-[#e7e2d4] px-4 py-2 text-sm font-semibold hover:border-[#14130f]"
      >
        + Schedule a follow-up
      </button>
    );
  }

  return (
    <form
      action={(fd) => {
        formAction(fd);
        setOpen(false);
      }}
      className="mb-4 grid grid-cols-2 gap-3 rounded-lg border border-[#e7e2d4] bg-[#faf8f3] p-4 sm:grid-cols-4"
    >
      <input name="contact_name" placeholder="Contact name" className="field-input" />
      <input name="contact_email" type="email" required placeholder="Contact email" className="field-input" />
      <select name="type" defaultValue="call" className="field-input">
        <option value="call">Call</option>
        <option value="email">Email</option>
      </select>
      <input name="due_date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required className="field-input" />
      <input name="reason" placeholder="Reason (optional)" className="field-input col-span-2" />
      <select name="listing_id" defaultValue="" className="field-input col-span-2">
        <option value="">No linked listing</option>
        {listings.map((l) => (
          <option key={l.id} value={l.id}>
            {l.address}
          </option>
        ))}
      </select>
      <div className="col-span-2 flex gap-2 sm:col-span-4">
        <button disabled={pending} className="rounded-lg bg-[#14130f] px-4 py-2 text-sm font-semibold text-white">
          {pending ? "Saving…" : "Add to schedule"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="text-sm font-semibold text-[#837c6c]">
          Cancel
        </button>
      </div>
      {state.error && <p className="col-span-2 text-sm text-[#b23b2e] sm:col-span-4">{state.error}</p>}
    </form>
  );
}
