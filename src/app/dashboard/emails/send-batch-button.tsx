"use client";

import { useActionState, useState } from "react";
import { sendEmailBatch, scheduleEmailBatch, type EmailActionState } from "../listings/[id]/email-actions";

export function SendBatchButton({
  listingId,
  dayKey,
  type,
}: {
  listingId: string;
  dayKey: string;
  type: string;
}) {
  const [showSchedule, setShowSchedule] = useState(false);

  const boundSend = sendEmailBatch.bind(null, listingId, dayKey, type);
  const [sendState, sendAction, sendPending] = useActionState<EmailActionState, FormData>(boundSend, {});

  const boundSchedule = scheduleEmailBatch.bind(null, listingId, dayKey, type);
  const [scheduleState, scheduleAction, schedulePending] = useActionState<EmailActionState, FormData>(boundSchedule, {});

  const state = sendState.error || sendState.info ? sendState : scheduleState;

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex items-center gap-2">
        {!showSchedule && (
          <button
            type="button"
            onClick={() => setShowSchedule(true)}
            className="rounded-lg border border-[#e7e2d4] px-3 py-2 text-xs font-semibold hover:border-[#14130f]"
          >
            Schedule…
          </button>
        )}
        <form action={sendAction}>
          <button
            disabled={sendPending}
            className="rounded-lg bg-[#14130f] px-4 py-2 text-xs font-semibold text-white disabled:bg-[#c9c3b3]"
          >
            {sendPending ? "Sending…" : "Approve & send now"}
          </button>
        </form>
      </div>
      {showSchedule && (
        <form action={scheduleAction} className="flex items-center gap-2">
          <input
            name="scheduled_for"
            type="date"
            required
            min={new Date().toISOString().slice(0, 10)}
            className="rounded border border-[#e7e2d4] px-2 py-1.5 text-xs"
          />
          <button
            disabled={schedulePending}
            className="rounded-lg bg-[#14130f] px-3 py-1.5 text-xs font-semibold text-white disabled:bg-[#c9c3b3]"
          >
            {schedulePending ? "Scheduling…" : "Schedule"}
          </button>
          <button type="button" onClick={() => setShowSchedule(false)} className="text-xs font-semibold text-[#837c6c]">
            Cancel
          </button>
        </form>
      )}
      {(state.error || state.info) && (
        <p className={`text-xs ${state.error ? "text-[#b23b2e]" : "text-[#2f6f4e]"}`}>{state.error ?? state.info}</p>
      )}
      <p className="text-right text-[10.5px] text-[#837c6c]">
        Scheduled sends go out once a day, not at an exact time.
      </p>
    </div>
  );
}
