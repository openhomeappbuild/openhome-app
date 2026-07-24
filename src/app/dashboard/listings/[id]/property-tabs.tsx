"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { addOffer, uploadDocument, type ActionState } from "./actions";
import { TIER_STYLES, type Tier } from "@/lib/tier";

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

const CATEGORY_LABELS: Record<string, { icon: string; label: string }> = {
  title: { icon: "📜", label: "Record of Title" },
  lim: { icon: "🏛️", label: "LIM Report" },
  builders_report: { icon: "🔧", label: "Builder's report" },
  consents: { icon: "🏗️", label: "Code Compliance & consents" },
  floor_plan: { icon: "📐", label: "Floor plan" },
  sale_agreement: { icon: "📄", label: "Sale & purchase agreement" },
  other: { icon: "📄", label: "Other document" },
};

const OFFER_STATUS_STYLES: Record<string, string> = {
  indicated: "bg-[#edf0f4] text-[#6b7787]",
  with_vendor: "bg-[#faf0dd] text-[#b7791f]",
  accepted: "bg-[#e3f4ec] text-[#1e8e5a]",
  declined: "bg-[#fae5e2] text-[#c0392b]",
  withdrawn: "bg-[#edf0f4] text-[#6b7787]",
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
      <div className="mb-1 text-xs text-[#6b7787]">
        <Link href="/dashboard/listings" className="font-semibold text-[#111]">
          Listings
        </Link>{" "}
        / {listing.address}
      </div>
      <h1 className="mb-1 text-[22px] font-bold">{listing.address}</h1>
      <p className="mb-5 text-[13.5px] text-[#6b7787]">
        {listing.bedrooms ? `${listing.bedrooms} bed · ` : ""}
        {listing.bathrooms ? `${listing.bathrooms} bath · ` : ""}
        {listing.suburb}
        {listing.sale_method ? ` · ${listing.sale_method}` : ""}
        {listing.sale_method_date
          ? ` closes ${new Date(listing.sale_method_date).toLocaleDateString("en-NZ", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}`
          : ""}
      </p>

      <div className="mb-5 flex gap-1 border-b-2 border-[#e2e7ed]">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`-mb-0.5 border-b-[2.5px] px-4 py-2.5 text-[13.5px] font-semibold ${
              tab === t ? "border-[#111] text-[#111]" : "border-transparent text-[#6b7787]"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Overview" && (
        <div>
          <div className="mb-5 grid grid-cols-2 gap-3.5 md:grid-cols-4">
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
                      label={new Date(day).toLocaleDateString("en-NZ", { weekday: "short", day: "numeric", month: "short" })}
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
                      className="h-4 rounded bg-[#111]"
                      style={{
                        width: `${Math.max((stats.tierCounts[t] / Math.max(stats.totalAttendees, 1)) * 220, stats.tierCounts[t] > 0 ? 8 : 0)}px`,
                      }}
                    />
                    <span className="font-bold">{stats.tierCounts[t]}</span>
                  </div>
                ))}
              </div>
              <p className="mt-2.5 text-xs text-[#6b7787]">
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

function Stat({ n, l, d }: { n: number | string; l: string; d?: string }) {
  return (
    <div className="rounded-xl border border-[#e2e7ed] bg-white p-4">
      <div className="text-[26px] font-bold">{n}</div>
      <div className="mt-0.5 text-xs text-[#6b7787]">{l}</div>
      {d && <div className="mt-1.5 text-[11.5px] font-semibold text-[#1e8e5a]">{d}</div>}
    </div>
  );
}

function Panel({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-[#e2e7ed] bg-white p-5">
      <h3 className="mb-3 flex items-center justify-between text-[15px] font-semibold">
        {title}
        {action}
      </h3>
      {children}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="text-sm text-[#6b7787]">{text}</p>;
}

function BarRow({ label, value, max }: { label: string; value: number; max: number }) {
  return (
    <div className="flex items-center gap-2.5 text-[12.5px]">
      <span className="w-[110px] flex-shrink-0 text-[#6b7787]">{label}</span>
      <div className="h-4 rounded bg-[#111]" style={{ width: `${(value / max) * 220}px` }} />
      <span className="font-bold">{value}</span>
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
      <td className="py-2.5 pr-2 text-[#43505e]">
        {a.mobile} · {a.email}
      </td>
      <td className="py-2.5 pr-2">
        <Pill tone={a.is_local ? "green" : "grey"}>{a.is_local ? a.suburb || "Local" : "Out of area"}</Pill>
      </td>
      <td className="py-2.5 pr-2">
        <Pill tone={a.consent ? "teal" : "grey"}>{a.consent ? "Opted in" : "Declined"}</Pill>
      </td>
      <td className="py-2.5 text-[#43505e]">{a.interest}</td>
    </tr>
  );
}

function Pill({ tone, children }: { tone: "green" | "grey" | "teal" | "red" | "amber"; children: React.ReactNode }) {
  const styles: Record<string, string> = {
    green: "bg-[#e3f4ec] text-[#1e8e5a]",
    grey: "bg-[#edf0f4] text-[#6b7787]",
    teal: "bg-[#ececec] text-[#111]",
    red: "bg-[#fae5e2] text-[#c0392b]",
    amber: "bg-[#faf0dd] text-[#b7791f]",
  };
  return <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${styles[tone]}`}>{children}</span>;
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
      <Panel title={`${new Date(latest.day).toLocaleDateString("en-NZ", { weekday: "long", day: "numeric", month: "long" })} · ${latest.attendees.length} attendees`}>
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-[#e2e7ed] text-left text-[11px] uppercase tracking-wide text-[#6b7787]">
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
                      <b>{new Date(day).toLocaleDateString("en-NZ", { weekday: "long", day: "numeric", month: "short" })}</b>{" "}
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
        <button onClick={() => setShowForm((s) => !s)} className="rounded-lg border border-[#e2e7ed] px-3 py-1.5 text-xs font-semibold">
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
          className="mb-5 grid grid-cols-2 gap-3 rounded-lg border border-[#e2e7ed] p-4"
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
          <button disabled={pending} className="col-span-2 rounded-lg bg-[#111] py-2 text-sm font-semibold text-white">
            Save offer
          </button>
          {state.error && <p className="col-span-2 text-sm text-[#c0392b]">{state.error}</p>}
        </form>
      )}
      {offers.length === 0 ? (
        <Empty text="No offers logged yet." />
      ) : (
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-[#e2e7ed] text-left text-[11px] uppercase tracking-wide text-[#6b7787]">
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
                  {o.buyer_email && <div className="text-[#6b7787]">{o.buyer_email}</div>}
                </td>
                <td className="py-2.5 pr-2 font-bold">{o.amount ? `$${Number(o.amount).toLocaleString()}` : "—"}</td>
                <td className="py-2.5 pr-2 text-[#43505e]">{o.conditions || "—"}</td>
                <td className="py-2.5 pr-2 text-[#43505e]">
                  {o.expiry ? new Date(o.expiry).toLocaleString("en-NZ", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "—"}
                </td>
                <td className="py-2.5">
                  <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${OFFER_STATUS_STYLES[o.status]}`}>
                    {o.status.replace("_", " ")}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p className="mt-3 text-xs text-[#6b7787]">All offers logged with timestamps for vendor reporting and REA compliance.</p>
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
        <button onClick={() => setShowForm((s) => !s)} className="rounded-lg border border-[#e2e7ed] px-3 py-1.5 text-xs font-semibold">
          {showForm ? "Cancel" : "+ Upload document"}
        </button>
      }
    >
      {showForm && (
        <form action={formAction} className="mb-5 flex flex-wrap items-center gap-3 rounded-lg border border-[#e2e7ed] p-4">
          <select name="category" className="field-input w-auto" defaultValue="other">
            {Object.entries(CATEGORY_LABELS).map(([value, { label }]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <input name="file" type="file" required className="text-sm" />
          <button disabled={pending} className="rounded-lg bg-[#111] px-4 py-2 text-sm font-semibold text-white">
            Upload
          </button>
          {state.error && <p className="w-full text-sm text-[#c0392b]">{state.error}</p>}
        </form>
      )}
      {documents.length === 0 ? (
        <Empty text="No documents uploaded yet." />
      ) : (
        documents.map((doc) => {
          const meta = CATEGORY_LABELS[doc.category] ?? CATEGORY_LABELS.other;
          return (
            <div key={doc.id} className="flex items-center gap-3 border-b border-[#eef1f5] py-3 last:border-none">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-[#ececec] text-lg">
                {meta.icon}
              </div>
              <div className="flex-1">
                <b className="block text-[13.5px]">{doc.name}</b>
                <span className="text-xs text-[#6b7787]">
                  {meta.label} · {new Date(doc.created_at).toLocaleDateString("en-NZ", { day: "numeric", month: "short", year: "numeric" })}
                  {doc.size_bytes ? ` · ${Math.round(doc.size_bytes / 1024)} KB` : ""}
                </span>
              </div>
              {doc.url && (
                <a href={doc.url} target="_blank" rel="noreferrer" className="rounded-lg border border-[#e2e7ed] px-3 py-1.5 text-xs font-semibold">
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
