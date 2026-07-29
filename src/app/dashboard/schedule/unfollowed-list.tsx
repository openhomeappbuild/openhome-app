"use client";

import { useTransition } from "react";
import { createFollowUp } from "./actions";
import { Empty } from "../ui";
import { formatNZDate } from "@/lib/nz-time";
import type { UnfollowedContact } from "@/lib/followups";

export function UnfollowedList({ contacts }: { contacts: UnfollowedContact[] }) {
  const [, startTransition] = useTransition();

  if (contacts.length === 0) return <Empty text="Everyone who's visited has been followed up on." />;

  function schedule(c: UnfollowedContact, type: "call" | "email") {
    const fd = new FormData();
    fd.set("contact_email", c.email);
    fd.set("contact_name", c.fullName);
    fd.set("type", type);
    fd.set("due_date", new Date().toISOString().slice(0, 10));
    fd.set("reason", "Visited an open home, not yet followed up");
    if (c.listingId) fd.set("listing_id", c.listingId);
    startTransition(() => {
      createFollowUp({ ok: false }, fd);
    });
  }

  return (
    <ul className="divide-y divide-[#eef1f5]">
      {contacts.map((c) => (
        <li key={c.email} className="flex items-center gap-3 py-2.5 text-[13px]">
          <div className="min-w-0 flex-1">
            <b>{c.fullName}</b>
            <span className="ml-1.5 text-[#837c6c]">{c.email}</span>
            <div className="text-[#837c6c]">Visited {formatNZDate(c.lastVisit, { day: "numeric", month: "short" })}</div>
          </div>
          <button
            onClick={() => schedule(c, "call")}
            className="flex-shrink-0 rounded-lg border border-[#e7e2d4] px-2.5 py-1.5 text-[11.5px] font-semibold hover:border-[#14130f]"
          >
            Schedule a call
          </button>
          <button
            onClick={() => schedule(c, "email")}
            className="flex-shrink-0 rounded-lg border border-[#e7e2d4] px-2.5 py-1.5 text-[11.5px] font-semibold hover:border-[#14130f]"
          >
            Schedule an email
          </button>
        </li>
      ))}
    </ul>
  );
}
