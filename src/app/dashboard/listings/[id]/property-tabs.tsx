"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { addOffer, uploadDocument, updateVendorDetails, type ActionState } from "./actions";
import { generateFollowupDrafts, generateSellerReportDraft, sendEmailBatch, type EmailActionState } from "./email-actions";
import { TIER_STYLES, type Tier } from "@/lib/tier";
import { formatNZDate, formatNZDayKey, formatNZTime } from "@/lib/nz-time";
import { Stat, Panel, Empty, Pill } from "../../ui";
import { VendorReportTab, type Enquiry } from "./vendor-report-tab";

type Listing = {
  id: string;
  address: string;
  suburb: string;
  region: string;
  bedrooms: number | null;
  bathrooms: number | null;
  car_spaces: number | null;
  sale_method: string | null;
  sale_method_date: string | null;
  vendor_name: string | null;
  vendor_email: string | null;
  description_notes: string | null;
  area_notes: string | null;
  photo_storage_path: string | null;
  listing_url: string | null;
  agent_name: string;
  agent_phone: string;
  agent_email: string;
  created_at: string;
};

type EmailBatchStatus = "none" | "draft" | "sent";
type DayEmailStatus = { followup: EmailBatchStatus; seller_report: EmailBatchStatus };

type Attendee = {
  id: string;
  created_at: string;
  full_name: string;
  mobile: string;
  email: string;
  is_local: boolean;
  suburb: string | null;
  interest: string;
  consent: boolean;
  tier: Tier;
};

type Offer = {
  id: string;
  buyer_name: string;
  buyer_email: string | null;
  amount: number | null;
  conditions: string | null;
  expiry: string | null;
  status: string;
};

type Document = {
  id: string;
  name: string;
  category: string;
  size_bytes: number | null;
  created_at: string;
  url: string | null;
};

const CATEGORY_LABELS: Record<string, { mark: string; label: string }> = {
  title: { mark: "RoT", label: "Record of Title" },
  lim: { mark: "LIM", label: "LIM Report" },
  builders_report: { mark: "BR", label: "Builder's report" },
  consents: { mark: "CCC", label: "Code Compliance & consents" },
  floor_plan: { mark: "FP", label: "Floor plan" },
  sale_agreement: { mark: "SPA", label: "Sale & purchase agreement" },
  other: { mark: "DOC", label: "Other document" },
};

const OFFER_STATUS_TONE: Record<string, "grey" | "amber" | "green" | "red"> = {
  indicated: "grey",
  with_vendor: "amber",
  accepted: "green",
  declined: "red",
  withdrawn: "grey",
};

const TABS = ["Overview", "Documents", "Open homes", "Offers", "Vendor report"] as const;

export function PropertyTabs({
  listing,
  stats,
  openHomeDays,
  offers,
  enquiries,
  documents,
  emailStatus,
}: {
  listing: Listing;
  stats: { totalAttendees: number; localCount: number; consentCount: number; repeatCount: number; tierCounts: Record<Tier, number> };
  openHomeDays: { day: string; attendees: Attendee[] }[];
  offers: Offer[];
  enquiries: Enquiry[];
  documents: Document[];
  emailStatus: Record<string, DayEmailStatus>;
}) {
  const [tab, setTab] = useState<(typeof TABS)[number]>("Overview");
  const localPct = stats.totalAttendees ? Math.round((stats.localCount / stats.totalAttendees) * 100) : 0;

  return (
    <div>
      <div className="mb-1 text-xs text-[#837c6c]">
        <Link href="/dashboard/listings" className="font-semibold text-[#14130f]">
          Listings
        </Link>{" "}
        / {listing.address}
      </div>
      <h1 className="font-display mb-1 text-[26px] font-semibold tracking-tight">{listing.address}</h1>
      <p className="mb-6 text-[13.5px] text-[#837c6c]">
        {listing.bedrooms ? `${listing.bedrooms} bed · ` : ""}
        {listing.bathrooms ? `${listing.bathrooms} bath · ` : ""}
        {listing.suburb}
        {listing.sale_method ? ` · ${listing.sale_method}` : ""}
        {listing.sale_method_date
          ? ` closes ${formatNZDate(listing.sale_method_date, { day: "numeric", month: "short", year: "numeric" })}`
          : ""}
      </p>

      <div className="mb-6 flex gap-1 border-b border-[#e7e2d4]">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`-mb-px border-b-2 px-4 py-2.5 text-[13.5px] font-semibold transition-colors ${
              tab === t ? "border-[#14130f] text-[#14130f]" : "border-transparent text-[#837c6c] hover:text-[#14130f]"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Overview" && (
        <div>
          <div className="mb-8 grid grid-cols-2 gap-6 md:grid-cols-4">
            <Stat n={stats.totalAttendees} l="Total attendees" />
            <Stat n={`${localPct}%`} l="Local buyers" d={`${stats.localCount} of ${stats.totalAttendees} attendees`} />
            <Stat n={stats.consentCount} l="Opted into database" />
            <Stat n={stats.repeatCount} l="Repeat visitors" />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Panel title="Attendance by open home">
              {openHomeDays.length === 0 ? (
                <Empty text="No open homes recorded yet." />
              ) : (
                <div className="space-y-2">
                  {[...openHomeDays].reverse().map(({ day, attendees }) => (
                    <BarRow
                      key={day}
                      label={formatNZDayKey(day, { weekday: "short", day: "numeric", month: "short" })}
                      value={attendees.length}
                      max={Math.max(...openHomeDays.map((d) => d.attendees.length), 1)}
                    />
                  ))}
                </div>
              )}
            </Panel>
            <Panel title={`Buyer interest tiers (${stats.totalAttendees} attendees)`}>
              <div className="space-y-2">
                {(["AAA", "AA", "A", "B", "C"] as Tier[]).map((t) => (
                  <div key={t} className="flex items-center gap-2.5 text-[12.5px]">
                    <span className={`min-w-[38px] rounded px-2 py-0.5 text-center text-[11px] font-extrabold ${TIER_STYLES[t]}`}>
                      {t}
                    </span>
                    <div
                      className="h-4 rounded bg-[#14130f]"
                      style={{
                        width: `${Math.max((stats.tierCounts[t] / Math.max(stats.totalAttendees, 1)) * 220, stats.tierCounts[t] > 0 ? 8 : 0)}px`,
                      }}
                    />
                    <span className="font-bold tabular-nums">{stats.tierCounts[t]}</span>
                  </div>
                ))}
              </div>
              <p className="mt-2.5 text-xs text-[#837c6c]">
                Tiers update automatically as buyers revisit or make offers.
              </p>
            </Panel>
          </div>
          <div className="mt-4">
            <VendorDetailsPanel listing={listing} />
          </div>
        </div>
      )}

      {tab === "Documents" && <DocumentsTab listingId={listing.id} documents={documents} />}

      {tab === "Open homes" && (
        <OpenHomesTab listing={listing} openHomeDays={openHomeDays} emailStatus={emailStatus} />
      )}

      {tab === "Offers" && <OffersTab listingId={listing.id} offers={offers} />}

      {tab === "Vendor report" && (
        <VendorReportTab
          listing={listing}
          enquiries={enquiries}
          attendance={{
            totalGroups: stats.totalAttendees,
            localGroups: stats.localCount,
            outOfAreaGroups: stats.totalAttendees - stats.localCount,
            tierCounts: stats.tierCounts,
          }}
        />
      )}
    </div>
  );
}

function BarRow({ label, value, max }: { label: string; value: number; max: number }) {
  return (
    <div className="flex items-center gap-2.5 text-[12.5px]">
      <span className="w-[110px] flex-shrink-0 text-[#837c6c]">{label}</span>
      <div className="h-4 rounded bg-[#14130f]" style={{ width: `${(value / max) * 220}px` }} />
      <span className="font-bold tabular-nums">{value}</span>
    </div>
  );
}

function AttendeeRow({ a }: { a: Attendee }) {
  return (
    <tr className="border-b border-[#eef1f5] last:border-none">
      <td className="py-2.5 pr-2">
        <span className={`inline-block min-w-[34px] rounded px-2 py-0.5 text-center text-[11px] font-extrabold ${TIER_STYLES[a.tier]}`}>
          {a.tier}
        </span>
      </td>
      <td className="py-2.5 pr-2 font-bold">{a.full_name}</td>
      <td className="py-2.5 pr-2 text-[#524d40] tabular-nums">
        {a.mobile} · {a.email}
      </td>
      <td className="py-2.5 pr-2">
        <Pill tone={a.is_local ? "green" : "grey"}>{a.is_local ? a.suburb || "Local" : "Out of area"}</Pill>
      </td>
      <td className="py-2.5 pr-2">
        <Pill tone={a.consent ? "slate" : "grey"}>{a.consent ? "Opted in" : "Declined"}</Pill>
      </td>
      <td className="py-2.5 text-[#524d40]">{a.interest}</td>
    </tr>
  );
}

function OpenHomesTab({
  listing,
  openHomeDays,
  emailStatus,
}: {
  listing: Listing;
  openHomeDays: { day: string; attendees: Attendee[] }[];
  emailStatus: Record<string, DayEmailStatus>;
}) {
  if (openHomeDays.length === 0) {
    return (
      <Panel title="Open homes">
        <Empty text="No open homes recorded yet — attendees will show up here once someone checks in." />
      </Panel>
    );
  }
  const [latest, ...earlier] = openHomeDays;
  return (
    <div className="space-y-4">
      <Panel
        title={`${formatNZDayKey(latest.day, { weekday: "long", day: "numeric", month: "long" })} · ${latest.attendees.length} attendees`}
      >
        <table className="mb-4 w-full text-[13px]">
          <thead>
            <tr className="border-b border-[#e7e2d4] text-left text-[11px] uppercase tracking-wide text-[#837c6c]">
              <th className="pb-2">Tier</th>
              <th className="pb-2">Name</th>
              <th className="pb-2">Contact</th>
              <th className="pb-2">Local?</th>
              <th className="pb-2">Consent</th>
              <th className="pb-2">Interested in</th>
            </tr>
          </thead>
          <tbody>
            {latest.attendees.map((a) => (
              <AttendeeRow key={a.id} a={a} />
            ))}
          </tbody>
        </table>
        <EmailBatchControls
          listing={listing}
          dayKey={latest.day}
          status={emailStatus[latest.day] ?? { followup: "none", seller_report: "none" }}
        />
      </Panel>
      {earlier.length > 0 && (
        <Panel title="Earlier open homes">
          <div className="space-y-4">
            {earlier.map(({ day, attendees }) => {
              const local = attendees.filter((a) => a.is_local).length;
              return (
                <div key={day} className="border-b border-[#eef1f5] pb-4 last:border-none last:pb-0">
                  <p className="mb-2.5 text-[13px]">
                    <b>{formatNZDayKey(day, { weekday: "long", day: "numeric", month: "short" })}</b> ·{" "}
                    {attendees.length} attendees · {local} local
                  </p>
                  <EmailBatchControls
                    listing={listing}
                    dayKey={day}
                    status={emailStatus[day] ?? { followup: "none", seller_report: "none" }}
                  />
                </div>
              );
            })}
          </div>
        </Panel>
      )}
    </div>
  );
}

function batchLabel(status: EmailBatchStatus, base: string) {
  if (status === "sent") return `${base} sent ✓`;
  if (status === "draft") return `Review ${base.toLowerCase()} draft`;
  return `Draft ${base.toLowerCase()}`;
}

function EmailBatchControls({
  listing,
  dayKey,
  status,
}: {
  listing: Listing;
  dayKey: string;
  status: DayEmailStatus;
}) {
  const draftFollowup = generateFollowupDrafts.bind(null, listing.id, dayKey);
  const draftSeller = generateSellerReportDraft.bind(null, listing.id, dayKey);
  const [followupState, followupAction, followupPending] = useActionState<EmailActionState, FormData>(
    draftFollowup,
    {}
  );
  const [sellerState, sellerAction, sellerPending] = useActionState<EmailActionState, FormData>(draftSeller, {});

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-[#e7e2d4] bg-[#faf8f3] p-3">
      <form action={followupAction}>
        <button
          disabled={followupPending || status.followup === "sent"}
          className={`rounded border px-3 py-1.5 text-xs font-semibold ${
            status.followup === "sent"
              ? "border-[#e7e2d4] text-[#837c6c]"
              : "border-[#14130f] text-[#14130f] hover:bg-[#14130f] hover:text-white"
          }`}
        >
          {followupPending ? "Drafting…" : batchLabel(status.followup, "Follow-up emails")}
        </button>
      </form>
      <form action={sellerAction}>
        <button
          disabled={sellerPending || status.seller_report === "sent"}
          className={`rounded border px-3 py-1.5 text-xs font-semibold ${
            status.seller_report === "sent"
              ? "border-[#e7e2d4] text-[#837c6c]"
              : "border-[#14130f] text-[#14130f] hover:bg-[#14130f] hover:text-white"
          }`}
        >
          {sellerPending ? "Drafting…" : batchLabel(status.seller_report, "Seller report")}
        </button>
      </form>
      {(status.followup === "draft" || status.seller_report === "draft") && (
        <Link href="/dashboard/emails" className="text-xs font-semibold text-[#14130f] underline">
          Review &amp; send in Emails
        </Link>
      )}
      {(followupState.error || followupState.info) && (
        <p className={`w-full text-xs ${followupState.error ? "text-[#b23b2e]" : "text-[#2f6f4e]"}`}>
          {followupState.error ?? followupState.info}
        </p>
      )}
      {(sellerState.error || sellerState.info) && (
        <p className={`w-full text-xs ${sellerState.error ? "text-[#b23b2e]" : "text-[#2f6f4e]"}`}>
          {sellerState.error ?? sellerState.info}
        </p>
      )}
    </div>
  );
}

function VendorDetailsPanel({ listing }: { listing: Listing }) {
  const [editing, setEditing] = useState(false);
  const boundAction = updateVendorDetails.bind(null, listing.id);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(boundAction, { ok: false });

  if (!editing) {
    return (
      <Panel
        title="Vendor & email content"
        action={
          <button
            onClick={() => setEditing(true)}
            className="rounded border border-[#e7e2d4] px-3 py-1.5 text-xs font-semibold hover:border-[#14130f]"
          >
            Edit
          </button>
        }
      >
        <div className="grid gap-3 text-[13px] sm:grid-cols-2">
          <div>
            <div className="text-[11px] uppercase tracking-wide text-[#837c6c]">Vendor</div>
            <div>{listing.vendor_name || "—"}</div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wide text-[#837c6c]">Vendor email</div>
            <div>{listing.vendor_email || "—"}</div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wide text-[#837c6c]">Listing link</div>
            <div>{listing.listing_url || "—"}</div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wide text-[#837c6c]">Cover photo</div>
            <div>{listing.photo_storage_path ? "Uploaded ✓" : "Not uploaded"}</div>
          </div>
        </div>
        {!listing.vendor_email && (
          <p className="mt-3 text-xs text-[#a9761f]">
            Add a vendor email to enable seller report drafts.
          </p>
        )}
      </Panel>
    );
  }

  return (
    <Panel title="Vendor & email content">
      <form
        action={(fd) => {
          formAction(fd);
          setEditing(false);
        }}
        className="grid grid-cols-2 gap-3"
      >
        <input name="vendor_name" placeholder="Vendor name" defaultValue={listing.vendor_name ?? ""} className="field-input" />
        <input
          name="vendor_email"
          type="email"
          placeholder="Vendor email"
          defaultValue={listing.vendor_email ?? ""}
          className="field-input"
        />
        <input
          name="listing_url"
          placeholder="Listing link (e.g. bayleys.co.nz/2251234)"
          defaultValue={listing.listing_url ?? ""}
          className="field-input col-span-2"
        />
        <label className="col-span-2 text-xs text-[#837c6c]">
          Cover photo for vendor reports
          <input name="photo" type="file" accept="image/*" className="field-input mt-1" />
        </label>
        <textarea
          name="description_notes"
          placeholder="A few notes about the home (used in the follow-up email recap)"
          defaultValue={listing.description_notes ?? ""}
          rows={2}
          className="field-input col-span-2"
        />
        <textarea
          name="area_notes"
          placeholder="A few notes about the area (used in the follow-up email)"
          defaultValue={listing.area_notes ?? ""}
          rows={2}
          className="field-input col-span-2"
        />
        <div className="col-span-2 flex gap-2">
          <button disabled={pending} className="rounded-lg bg-[#14130f] px-4 py-2 text-sm font-semibold text-white">
            Save
          </button>
          <button type="button" onClick={() => setEditing(false)} className="text-sm font-semibold text-[#837c6c]">
            Cancel
          </button>
        </div>
        {state.error && <p className="col-span-2 text-sm text-[#b23b2e]">{state.error}</p>}
      </form>
    </Panel>
  );
}

function OffersTab({ listingId, offers }: { listingId: string; offers: Offer[] }) {
  const [showForm, setShowForm] = useState(false);
  const boundAction = addOffer.bind(null, listingId);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(boundAction, { ok: false });

  return (
    <Panel
      title={`Offers (${offers.length})`}
      action={
        <button
          onClick={() => setShowForm((s) => !s)}
          className="rounded border border-[#e7e2d4] px-3 py-1.5 text-xs font-semibold hover:border-[#14130f]"
        >
          {showForm ? "Cancel" : "+ Log offer"}
        </button>
      }
    >
      {showForm && (
        <form
          action={(fd) => {
            formAction(fd);
            setShowForm(false);
          }}
          className="mb-5 grid grid-cols-2 gap-3 rounded-lg border border-[#e7e2d4] bg-[#faf8f3] p-4"
        >
          <input name="buyerName" placeholder="Buyer name" required className="field-input col-span-2" />
          <input name="buyerEmail" placeholder="Buyer email (optional)" className="field-input" />
          <input name="amount" type="number" placeholder="Amount ($)" className="field-input" />
          <input name="conditions" placeholder="Conditions" className="field-input col-span-2" />
          <input name="expiry" type="datetime-local" className="field-input" />
          <select name="status" className="field-input" defaultValue="indicated">
            <option value="indicated">Indicated</option>
            <option value="with_vendor">With vendor</option>
            <option value="accepted">Accepted</option>
            <option value="declined">Declined</option>
            <option value="withdrawn">Withdrawn</option>
          </select>
          <button disabled={pending} className="col-span-2 rounded-lg bg-[#14130f] py-2 text-sm font-semibold text-white">
            Save offer
          </button>
          {state.error && <p className="col-span-2 text-sm text-[#b23b2e]">{state.error}</p>}
        </form>
      )}
      {offers.length === 0 ? (
        <Empty text="No offers logged yet." />
      ) : (
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-[#e7e2d4] text-left text-[11px] uppercase tracking-wide text-[#837c6c]">
              <th className="pb-2">Buyer</th>
              <th className="pb-2">Amount</th>
              <th className="pb-2">Conditions</th>
              <th className="pb-2">Expiry</th>
              <th className="pb-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {offers.map((o) => (
              <tr key={o.id} className="border-b border-[#eef1f5] last:border-none">
                <td className="py-2.5 pr-2">
                  <b>{o.buyer_name}</b>
                  {o.buyer_email && <div className="text-[#837c6c]">{o.buyer_email}</div>}
                </td>
                <td className="py-2.5 pr-2 font-bold tabular-nums">{o.amount ? `$${Number(o.amount).toLocaleString()}` : "—"}</td>
                <td className="py-2.5 pr-2 text-[#524d40]">{o.conditions || "—"}</td>
                <td className="py-2.5 pr-2 text-[#524d40] tabular-nums">
                  {o.expiry ? `${formatNZDate(o.expiry, { day: "numeric", month: "short" })}, ${formatNZTime(o.expiry)}` : "—"}
                </td>
                <td className="py-2.5">
                  <Pill tone={OFFER_STATUS_TONE[o.status] ?? "grey"}>{o.status.replace("_", " ")}</Pill>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p className="mt-3 text-xs text-[#837c6c]">All offers logged with timestamps for vendor reporting and REA compliance.</p>
    </Panel>
  );
}

function DocumentsTab({ listingId, documents }: { listingId: string; documents: Document[] }) {
  const [showForm, setShowForm] = useState(false);
  const boundAction = uploadDocument.bind(null, listingId);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(boundAction, { ok: false });

  return (
    <Panel
      title="Property documents"
      action={
        <button
          onClick={() => setShowForm((s) => !s)}
          className="rounded border border-[#e7e2d4] px-3 py-1.5 text-xs font-semibold hover:border-[#14130f]"
        >
          {showForm ? "Cancel" : "+ Upload document"}
        </button>
      }
    >
      {showForm && (
        <form action={formAction} className="mb-5 flex flex-wrap items-center gap-3 rounded-lg border border-[#e7e2d4] bg-[#faf8f3] p-4">
          <select name="category" className="field-input w-auto" defaultValue="other">
            {Object.entries(CATEGORY_LABELS).map(([value, { label }]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <input name="file" type="file" required className="text-sm" />
          <button disabled={pending} className="rounded-lg bg-[#14130f] px-4 py-2 text-sm font-semibold text-white">
            Upload
          </button>
          {state.error && <p className="w-full text-sm text-[#b23b2e]">{state.error}</p>}
        </form>
      )}
      {documents.length === 0 ? (
        <Empty text="No documents uploaded yet." />
      ) : (
        documents.map((doc) => {
          const meta = CATEGORY_LABELS[doc.category] ?? CATEGORY_LABELS.other;
          return (
            <div key={doc.id} className="flex items-center gap-3 border-b border-[#eef1f5] py-3 last:border-none">
              <div className="flex h-9 w-11 flex-shrink-0 items-center justify-center rounded bg-[#f3f1ea] text-[10px] font-bold tracking-wide text-[#524d40]">
                {meta.mark}
              </div>
              <div className="flex-1">
                <b className="block text-[13.5px]">{doc.name}</b>
                <span className="text-xs text-[#837c6c]">
                  {meta.label} · {formatNZDate(doc.created_at, { day: "numeric", month: "short", year: "numeric" })}
                  {doc.size_bytes ? ` · ${Math.round(doc.size_bytes / 1024)} KB` : ""}
                </span>
              </div>
              {doc.url && (
                <a
                  href={doc.url}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded border border-[#e7e2d4] px-3 py-1.5 text-xs font-semibold hover:border-[#14130f]"
                >
                  View
                </a>
              )}
            </div>
          );
        })
      )}
    </Panel>
  );
}
