"use client";

import { useActionState } from "react";
import { sendEmailBatch, type EmailActionState } from "../listings/[id]/email-actions";

export function SendBatchButton({
  listingId,
  dayKey,
  type,
}: {
  listingId: string;
  dayKey: string;
  type: string;
}) {
  const bound = sendEmailBatch.bind(null, listingId, dayKey, type);
  const [state, action, pending] = useActionState<EmailActionState, FormData>(bound, {});

  return (
    <form action={action} className="flex items-center gap-3">
      {(state.error || state.info) && (
        <p className={`text-xs ${state.error ? "text-[#b23b2e]" : "text-[#2f6f4e]"}`}>
          {state.error ?? state.info}
        </p>
      )}
      <button
        disabled={pending}
        className="rounded-lg bg-[#14130f] px-4 py-2 text-xs font-semibold text-white disabled:bg-[#c9c3b3]"
      >
        {pending ? "Sending…" : "Approve & send"}
      </button>
    </form>
  );
}
