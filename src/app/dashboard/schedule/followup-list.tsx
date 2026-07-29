"use client";

import { useTransition } from "react";
import { completeFollowUp, reopenFollowUp, deleteFollowUp, rescheduleFollowUp } from "./actions";
import { Empty, Pill } from "../ui";

type Row = {
  id: string;
  contact_email: string;
  contact_name: string | null;
  type: string;
  status: string;
  reason: string | null;
  due_date: string;
  listing_address: string | null;
};

export function FollowUpList({
  rows,
  emptyText,
  showDueDate = true,
  showReopen = false,
}: {
  rows: Row[];
  emptyText: string;
  showDueDate?: boolean;
  showReopen?: boolean;
}) {
  const [, startTransition] = useTransition();

  if (rows.length === 0) return <Empty text={emptyText} />;

  return (
    <ul className="divide-y divide-[#eef1f5]">
      {rows.map((r) => (
        <li key={r.id} className="flex items-center gap-3 py-2.5 text-[13px]">
          <Pill tone={r.type === "call" ? "slate" : "grey"}>{r.type === "call" ? "Call" : "Email"}</Pill>
          <div className="min-w-0 flex-1">
            <b>{r.contact_name || r.contact_email}</b>
            {r.contact_name && <span className="ml-1.5 text-[#837c6c]">{r.contact_email}</span>}
            {(r.reason || r.listing_address) && (
              <div className="truncate text-[#837c6c]">
                {[r.reason, r.listing_address].filter(Boolean).join(" · ")}
              </div>
            )}
          </div>
          {showDueDate && (
            <input
              type="date"
              defaultValue={r.due_date}
              onChange={(e) => startTransition(() => rescheduleFollowUp(r.id, e.target.value))}
              className="w-[130px] flex-shrink-0 rounded border border-[#e7e2d4] px-1.5 py-1 text-[12px]"
            />
          )}
          {showReopen ? (
            <button
              onClick={() => startTransition(() => reopenFollowUp(r.id))}
              className="flex-shrink-0 text-[11.5px] font-semibold text-[#837c6c] hover:text-[#14130f]"
            >
              Reopen
            </button>
          ) : (
            <button
              onClick={() => startTransition(() => completeFollowUp(r.id))}
              className="flex-shrink-0 rounded-lg bg-[#14130f] px-2.5 py-1.5 text-[11.5px] font-semibold text-white"
            >
              Mark done
            </button>
          )}
          <button
            onClick={() => startTransition(() => deleteFollowUp(r.id))}
            className="flex-shrink-0 text-[11.5px] font-semibold text-[#837c6c] hover:text-[#b23b2e]"
          >
            Remove
          </button>
        </li>
      ))}
    </ul>
  );
}
