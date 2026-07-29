"use client";

import { useActionState, useState } from "react";
import { addEnquiry, updateEnquiry, deleteEnquiry, type ActionState } from "./enquiries-actions";
import { TIER_STYLES, type Tier } from "@/lib/tier";
import { formatNZDate } from "@/lib/nz-time";
import { Panel, Empty } from "../../ui";

export type Enquiry = {
  id: string;
  contact_date: string;
  name: string;
  source: string | null;
  comment: string | null;
  price_feedback: string | null;
  interest_status: "interested" | "not_interested" | "unsure";
  inspected: boolean;
  checkin_id: string | null;
};

type ListingLite = {
  id: string;
  address: string;
  vendor_name: string | null;
  listing_url: string | null;
  created_at: string;
};

const INTEREST_LABEL: Record<Enquiry["interest_status"], string> = {
  interested: "Interested",
  unsure: "Not sure",
  not_interested: "Not interested",
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function VendorReportTab({
  listing,
  enquiries,
  attendance,
}: {
  listing: ListingLite;
  enquiries: Enquiry[];
  attendance: { totalGroups: number; localGroups: number; outOfAreaGroups: number; tierCounts: Record<Tier, number> };
}) {
  return (
    <div className="space-y-4">
      <Panel title="Attendance & buyer engagement (all time)">
        <div className="mb-4 grid grid-cols-3 gap-4 text-[13px]">
          <div>
            <div className="font-display text-[28px] leading-none">{attendance.totalGroups}</div>
            <div className="mt-1 text-[11px] uppercase tracking-wide text-[#837c6c]">Groups through</div>
          </div>
          <div>
            <div className="font-display text-[28px] leading-none">{attendance.localGroups}</div>
            <div className="mt-1 text-[11px] uppercase tracking-wide text-[#837c6c]">Local</div>
          </div>
          <div>
            <div className="font-display text-[28px] leading-none">{attendance.outOfAreaGroups}</div>
            <div className="mt-1 text-[11px] uppercase tracking-wide text-[#837c6c]">Out of area</div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {(["AAA", "AA", "A", "B", "C"] as Tier[]).map((t) => (
            <span key={t} className={`rounded px-2 py-1 text-[11px] font-extrabold ${TIER_STYLES[t]}`}>
              {t} · {attendance.tierCounts[t]}
            </span>
          ))}
        </div>
      </Panel>

      <EnquiryLogPanel listingId={listing.id} enquiries={enquiries} />

      <ReportGeneratorPanel listing={listing} />
    </div>
  );
}

function EnquiryLogPanel({ listingId, enquiries }: { listingId: string; enquiries: Enquiry[] }) {
  const [showAdd, setShowAdd] = useState(false);
  const boundAdd = addEnquiry.bind(null, listingId);
  const [addState, addAction, addPending] = useActionState<ActionState, FormData>(boundAdd, { ok: false });

  return (
    <Panel
      title={`Enquiry & feedback log (${enquiries.length})`}
      action={
        <button
          onClick={() => setShowAdd((s) => !s)}
          className="rounded border border-[#e7e2d4] px-3 py-1.5 text-xs font-semibold hover:border-[#14130f]"
        >
          {showAdd ? "Cancel" : "+ Add enquiry"}
        </button>
      }
    >
      <p className="mb-4 text-xs text-[#837c6c]">
        Open home check-ins are added here automatically. Add phone, web, or portal enquiries manually — this table
        is what the vendor report&apos;s enquiry log is built from.
      </p>

      {showAdd && (
        <form
          action={(fd) => {
            addAction(fd);
            setShowAdd(false);
          }}
          className="mb-5 grid grid-cols-2 gap-3 rounded-lg border border-[#e7e2d4] bg-[#faf8f3] p-4 sm:grid-cols-4"
        >
          <input name="name" placeholder="Name" required className="field-input col-span-2" />
          <input name="contact_date" type="date" defaultValue={todayISO()} className="field-input" />
          <input name="source" placeholder="Source (e.g. Phone, TradeMe)" className="field-input" />
          <textarea name="comment" placeholder="Comment" rows={2} className="field-input col-span-2 sm:col-span-2" />
          <input name="price_feedback" placeholder="Price feedback" className="field-input" />
          <select name="interest_status" defaultValue="unsure" className="field-input">
            <option value="interested">Interested</option>
            <option value="unsure">Not sure</option>
            <option value="not_interested">Not interested</option>
          </select>
          <label className="col-span-2 flex items-center gap-2 text-xs sm:col-span-4">
            <input name="inspected" type="checkbox" /> Inspected the property
          </label>
          <button disabled={addPending} className="col-span-2 rounded-lg bg-[#14130f] py-2 text-sm font-semibold text-white sm:col-span-4">
            Save enquiry
          </button>
          {addState.error && <p className="col-span-2 text-sm text-[#b23b2e] sm:col-span-4">{addState.error}</p>}
        </form>
      )}

      {enquiries.length === 0 ? (
        <Empty text="No enquiries yet — they'll appear here as people check in at open homes, or add one manually." />
      ) : (
        <div className="space-y-2">
          {enquiries.map((e) => (
            <EnquiryRow key={e.id} listingId={listingId} enquiry={e} />
          ))}
        </div>
      )}
    </Panel>
  );
}

function EnquiryRow({ listingId, enquiry }: { listingId: string; enquiry: Enquiry }) {
  const [editing, setEditing] = useState(false);
  const boundUpdate = updateEnquiry.bind(null, listingId, enquiry.id);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(boundUpdate, { ok: false });

  if (!editing) {
    const toneClass =
      enquiry.interest_status === "interested"
        ? "bg-[#e7f0ea] text-[#2f6f4e]"
        : enquiry.interest_status === "not_interested"
          ? "bg-[#f6e4e1] text-[#b23b2e]"
          : "bg-[#f3f1ea] text-[#837c6c]";
    return (
      <div className="flex items-center gap-3 border-b border-[#eef1f5] py-2.5 text-[13px] last:border-none">
        <span className="w-[70px] flex-shrink-0 text-[#837c6c] tabular-nums">
          {formatNZDate(`${enquiry.contact_date}T00:00:00Z`, { day: "numeric", month: "short" })}
        </span>
        <b className="w-[130px] flex-shrink-0 truncate">{enquiry.name}</b>
        <span className="w-[90px] flex-shrink-0 truncate text-[#837c6c]">{enquiry.source || "—"}</span>
        <span className="flex-1 truncate text-[#524d40]">{enquiry.comment || "—"}</span>
        <span className="w-[90px] flex-shrink-0 truncate text-[#524d40]">{enquiry.price_feedback || "—"}</span>
        <span className={`w-[100px] flex-shrink-0 rounded-full px-2 py-0.5 text-center text-[11px] font-semibold ${toneClass}`}>
          {INTEREST_LABEL[enquiry.interest_status]}
        </span>
        <span className="w-[16px] flex-shrink-0 text-center">{enquiry.inspected ? "✓" : ""}</span>
        <button onClick={() => setEditing(true)} className="text-xs font-semibold text-[#837c6c] hover:text-[#14130f]">
          Edit
        </button>
        <button
          onClick={() => deleteEnquiry(listingId, enquiry.id)}
          className="text-xs font-semibold text-[#837c6c] hover:text-[#b23b2e]"
        >
          Delete
        </button>
      </div>
    );
  }

  return (
    <form
      action={(fd) => {
        formAction(fd);
        setEditing(false);
      }}
      className="grid grid-cols-2 gap-2 rounded-lg border border-[#e7e2d4] bg-[#faf8f3] p-3 sm:grid-cols-6"
    >
      <input name="contact_date" type="date" defaultValue={enquiry.contact_date} className="field-input" />
      <input name="name" defaultValue={enquiry.name} required className="field-input" />
      <input name="source" defaultValue={enquiry.source ?? ""} placeholder="Source" className="field-input" />
      <input name="comment" defaultValue={enquiry.comment ?? ""} placeholder="Comment" className="field-input sm:col-span-2" />
      <input name="price_feedback" defaultValue={enquiry.price_feedback ?? ""} placeholder="Price feedback" className="field-input" />
      <select name="interest_status" defaultValue={enquiry.interest_status} className="field-input">
        <option value="interested">Interested</option>
        <option value="unsure">Not sure</option>
        <option value="not_interested">Not interested</option>
      </select>
      <label className="flex items-center gap-2 text-xs">
        <input name="inspected" type="checkbox" defaultChecked={enquiry.inspected} /> Inspected
      </label>
      <div className="col-span-2 flex items-center gap-3 sm:col-span-3">
        <button disabled={pending} className="rounded-lg bg-[#14130f] px-4 py-1.5 text-xs font-semibold text-white">
          Save
        </button>
        <button type="button" onClick={() => setEditing(false)} className="text-xs font-semibold text-[#837c6c]">
          Cancel
        </button>
      </div>
      {state.error && <p className="col-span-2 text-xs text-[#b23b2e] sm:col-span-6">{state.error}</p>}
    </form>
  );
}

function ReportGeneratorPanel({ listing }: { listing: ListingLite }) {
  const defaultStart = listing.created_at.slice(0, 10);
  return (
    <Panel title="Generate vendor report">
      <p className="mb-4 text-xs text-[#837c6c]">
        Builds one PDF: cover, campaign note, the enquiry log above, attendance & buyer tiers, and a marketing
        activity section. Upload each portal&apos;s exported performance PDF (Bayleys, realestate.co.nz, TradeMe,
        OneRoof, homes.co.nz) below and they&apos;ll be appended after the marketing activity page exactly as
        exported — nothing about their numbers is invented.
      </p>
      <form action={`/api/listings/${listing.id}/vendor-report`} method="POST" encType="multipart/form-data" className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <label className="text-xs text-[#837c6c]">
            Period start
            <input name="period_start" type="date" defaultValue={defaultStart} required className="field-input mt-1" />
          </label>
          <label className="text-xs text-[#837c6c]">
            Period end
            <input name="period_end" type="date" defaultValue={todayISO()} required className="field-input mt-1" />
          </label>
        </div>
        <label className="block text-xs text-[#837c6c]">
          Campaign overview note to the vendor
          <textarea
            name="campaign_note"
            rows={4}
            required
            placeholder={`Write this campaign's personal update to ${listing.vendor_name ?? "the vendor"} — what's happened, feedback themes, what's next.`}
            className="field-input mt-1"
          />
        </label>
        <label className="block text-xs text-[#837c6c]">
          Portal export PDFs (optional, upload as many as you have)
          <input name="portal_files" type="file" accept="application/pdf" multiple className="field-input mt-1" />
        </label>
        <button className="rounded-lg bg-[#14130f] px-4 py-2 text-sm font-semibold text-white">
          Generate vendor report PDF
        </button>
      </form>
    </Panel>
  );
}
