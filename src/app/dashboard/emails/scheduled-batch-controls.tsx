"use client";

import { useActionState, useTransition } from "react";
import { sendEmailBatch, cancelScheduledBatch, type EmailActionState } from "../listings/[id]/email-actions";

export function ScheduledBatchControls({
  listingId,
  dayKey,
  type,
}: {
  listingId: string;
  dayKey: string;
  type: string;
}) {
  const [, startTransition] = useTransition();
  const boundSend = sendEmailBatch.bind(null, listingId, dayKey, type);
  const [state, sendAction, pending] = useActionState<EmailActionState, FormData>(boundSend, {});

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex items-center gap-2">
        <button
          onClick={() => startTransition(() => cancelScheduledBatch(listingId, dayKey, type))}
          className="rounded-lg border border-[#e7e2d4] px-3 py-2 text-xs font-semibold hover:border-[#14130f]"
        >
          Cancel schedule
        </button>
        <form action={sendAction}>
          <button
            disabled={pending}
            className="rounded-lg bg-[#14130f] px-4 py-2 text-xs font-semibold text-white disabled:bg-[#c9c3b3]"
          >
            {pending ? "Sending…" : "Send now instead"}
          </button>
        </form>
      </div>
      {(state.error || state.info) && (
        <p className={`text-xs ${state.error ? "text-[#b23b2e]" : "text-[#2f6f4e]"}`}>{state.error ?? state.info}</p>
      )}
    </div>
  );
}
