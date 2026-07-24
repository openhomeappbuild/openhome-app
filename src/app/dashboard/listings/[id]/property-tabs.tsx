"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { addOffer, uploadDocument, type ActionState } from "./actions";
import { TIER_STYLES, type Tier } from "@/lib/tier";
import { formatNZDate, formatNZDayKey, formatNZTime } from "@/lib/nz-time";
import { Stat, Panel, Empty, Pill } from "../../ui";

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
};

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

const TABS = ["Overview", "Documents", "Open homes", "Offers"] as const;

export function PropertyTabs({
  listing,
  stats,
  openHomeDays,
  offers,
  documents,
}: {
  listing: Listing;
  stats: { totalAttendees: number; localCount: number; consentCount: number; repeatCount: number; tierCounts: Record<Tier, number> };
  openHomeDays: { day: string; attendees: Attendee[] }[];
  offers: Offer[];
  documents: Document[];
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
        </div>
      )}

      {tab === "Documents" && <DocumentsTab listingId={listing.id} documents={documents} />}

      {tab === "Open homes" && <OpenHomesTab openHomeDays={openHomeDays} />}

      {tab === "Offers" && <OffersTab listingId={listing.id} offers={offers} />}
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

function OpenHomesTab({ openHomeDays }: { openHomeDays: { day: string; attendees: Attendee[] }[] }) {
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
      <Panel title={`${formatNZDayKey(latest.day, { weekday: "long", day: "numeric", month: "long" })} · ${latest.attendees.length} attendees`}>
        <table className="w-full text-[13px]">
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
      </Panel>
      {earlier.length > 0 && (
        <Panel title="Earlier open homes">
          <table className="w-full text-[13px]">
            <tbody>
              {earlier.map(({ day, attendees }) => {
                const local = attendees.filter((a) => a.is_local).length;
                return (
                  <tr key={day} className="border-b border-[#eef1f5] last:border-none">
                    <td className="py-2.5">
                      <b>{formatNZDayKey(day, { weekday: "long", day: "numeric", month: "short" })}</b>{" "}
                      · {attendees.length} attendees · {local} local
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Panel>
      )}
    </div>
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
