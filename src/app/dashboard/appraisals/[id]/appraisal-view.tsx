"use client";

import { useActionState, useState, useTransition } from "react";
import Link from "next/link";
import {
  uploadComparablesCsv,
  addComparableManual,
  updateComparable,
  deleteComparable,
  updateAppraisalSubject,
  type ActionState,
} from "./actions";
import { estimateRange, type Grade } from "@/lib/valuation";
import { Panel, Stat, Empty } from "../../ui";

type Appraisal = {
  id: string;
  address: string;
  suburb: string | null;
  region: string;
  legal_description: string | null;
  title_reference: string | null;
  floor_area_m2: number | null;
  land_area_m2: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  land_value: number | null;
  improvements_value: number | null;
  capital_value: number | null;
  last_sold_date: string | null;
  last_sold_price: number | null;
  description: string | null;
  vendor_name: string | null;
  vendor_email: string | null;
  status: string;
};

type Comparable = {
  id: string;
  address: string;
  sale_date: string | null;
  floor_area_m2: number | null;
  land_area_m2: number | null;
  bedrooms: number | null;
  sale_price: number;
  capital_value: number | null;
  is_current_listing: boolean;
  grade: string;
  included: boolean;
  flagged_reason: string | null;
  indicated_value: number;
};

const money = (n: number) => `$${n.toLocaleString("en-NZ")}`;

export function AppraisalView({ appraisal, comparables }: { appraisal: Appraisal; comparables: Comparable[] }) {
  const range = estimateRange(comparables);

  return (
    <div>
      <div className="mb-1 text-xs text-[#837c6c]">
        <Link href="/dashboard/appraisals" className="font-semibold text-[#14130f]">
          Appraisals
        </Link>{" "}
        / {appraisal.address}
      </div>
      <h1 className="font-display mb-1 text-[26px] font-semibold tracking-tight">{appraisal.address}</h1>
      <p className="mb-8 text-[13.5px] text-[#837c6c]">
        {appraisal.floor_area_m2 ? `${appraisal.floor_area_m2}m² floor · ` : ""}
        {appraisal.land_area_m2 ? `${appraisal.land_area_m2}m² land · ` : ""}
        {appraisal.bedrooms ? `${appraisal.bedrooms} bed` : ""}
        {appraisal.capital_value ? ` · CV ${money(appraisal.capital_value)}` : ""}
      </p>

      <SubjectPanel appraisal={appraisal} />

      <div className="mt-4">
        <ComparablesPanel appraisalId={appraisal.id} comparables={comparables} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-6 md:grid-cols-4">
        <Stat n={range ? money(range.low) : "—"} l="Lowest expectation" />
        <Stat n={range ? money(range.high) : "—"} l="On a good day" />
        <Stat n={range?.count ?? 0} l="Comparables included" />
        <Stat n={appraisal.capital_value ? money(appraisal.capital_value) : "—"} l="Capital value (CV)" />
      </div>

      <div className="mt-4">
        <ProposalPanel appraisal={appraisal} comparables={comparables.filter((c) => c.included)} range={range} />
      </div>
    </div>
  );
}

function SubjectPanel({ appraisal }: { appraisal: Appraisal }) {
  const [editing, setEditing] = useState(false);
  const boundAction = updateAppraisalSubject.bind(null, appraisal.id);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(boundAction, { ok: false });

  if (!editing) {
    return (
      <Panel
        title="Subject property"
        action={
          <button
            onClick={() => setEditing(true)}
            className="rounded border border-[#e7e2d4] px-3 py-1.5 text-xs font-semibold hover:border-[#14130f]"
          >
            Edit
          </button>
        }
      >
        <div className="grid grid-cols-2 gap-3 text-[13px] sm:grid-cols-4">
          <Fact l="Legal / title" v={[appraisal.legal_description, appraisal.title_reference].filter(Boolean).join(" · ") || "—"} />
          <Fact l="Floor / land" v={`${appraisal.floor_area_m2 ?? "—"}m² / ${appraisal.land_area_m2 ?? "—"}m²`} />
          <Fact l="Config" v={`${appraisal.bedrooms ?? "—"} bed · ${appraisal.bathrooms ?? "—"} bath`} />
          <Fact l="Land value" v={appraisal.land_value ? money(appraisal.land_value) : "—"} />
          <Fact l="Improvements" v={appraisal.improvements_value ? money(appraisal.improvements_value) : "—"} />
          <Fact l="Capital value" v={appraisal.capital_value ? money(appraisal.capital_value) : "—"} />
          <Fact
            l="Last sold"
            v={
              appraisal.last_sold_date
                ? `${new Date(appraisal.last_sold_date).toLocaleDateString("en-NZ", { month: "short", year: "numeric" })}${appraisal.last_sold_price ? ` · ${money(appraisal.last_sold_price)}` : ""}`
                : "—"
            }
          />
          <Fact l="Vendor" v={appraisal.vendor_name || "—"} />
        </div>
        {appraisal.description && (
          <p className="mt-3 rounded-lg border border-[#e7e2d4] bg-[#faf8f3] p-3 text-[13px] leading-relaxed text-[#524d40]">
            {appraisal.description}
          </p>
        )}
      </Panel>
    );
  }

  return (
    <Panel title="Subject property">
      <form
        action={(fd) => {
          formAction(fd);
          setEditing(false);
        }}
        className="grid grid-cols-2 gap-3 sm:grid-cols-4"
      >
        <input name="address" defaultValue={appraisal.address} placeholder="Address" required className="field-input col-span-2 sm:col-span-4" />
        <input name="suburb" defaultValue={appraisal.suburb ?? ""} placeholder="Suburb" className="field-input" />
        <input name="legal_description" defaultValue={appraisal.legal_description ?? ""} placeholder="Legal description" className="field-input" />
        <input name="title_reference" defaultValue={appraisal.title_reference ?? ""} placeholder="Title reference" className="field-input" />
        <input name="floor_area_m2" type="number" defaultValue={appraisal.floor_area_m2 ?? ""} placeholder="Floor area (m²)" className="field-input" />
        <input name="land_area_m2" type="number" defaultValue={appraisal.land_area_m2 ?? ""} placeholder="Land area (m²)" className="field-input" />
        <input name="bedrooms" type="number" defaultValue={appraisal.bedrooms ?? ""} placeholder="Bedrooms" className="field-input" />
        <input name="bathrooms" type="number" defaultValue={appraisal.bathrooms ?? ""} placeholder="Bathrooms" className="field-input" />
        <input name="land_value" type="number" defaultValue={appraisal.land_value ?? ""} placeholder="Land value ($)" className="field-input" />
        <input name="improvements_value" type="number" defaultValue={appraisal.improvements_value ?? ""} placeholder="Improvements value ($)" className="field-input" />
        <input name="capital_value" type="number" defaultValue={appraisal.capital_value ?? ""} placeholder="Capital value ($)" className="field-input" />
        <input name="last_sold_date" type="date" defaultValue={appraisal.last_sold_date ?? ""} className="field-input" />
        <input name="last_sold_price" type="number" defaultValue={appraisal.last_sold_price ?? ""} placeholder="Last sold price ($)" className="field-input" />
        <input name="vendor_name" defaultValue={appraisal.vendor_name ?? ""} placeholder="Vendor name" className="field-input" />
        <input name="vendor_email" type="email" defaultValue={appraisal.vendor_email ?? ""} placeholder="Vendor email" className="field-input" />
        <textarea
          name="description"
          defaultValue={appraisal.description ?? ""}
          placeholder="Property description for the proposal (condition, features, views...)"
          rows={3}
          className="field-input col-span-2 sm:col-span-4"
        />
        <div className="col-span-2 flex gap-2 sm:col-span-4">
          <button disabled={pending} className="rounded-lg bg-[#14130f] px-4 py-2 text-sm font-semibold text-white">
            Save
          </button>
          <button type="button" onClick={() => setEditing(false)} className="text-sm font-semibold text-[#837c6c]">
            Cancel
          </button>
        </div>
        {state.error && <p className="col-span-2 text-sm text-[#b23b2e] sm:col-span-4">{state.error}</p>}
      </form>
    </Panel>
  );
}

function Fact({ l, v }: { l: string; v: string }) {
  return (
    <div className="rounded-lg border border-[#e7e2d4] p-2.5">
      <div className="text-[10.5px] uppercase tracking-wide text-[#837c6c]">{l}</div>
      <div className="mt-0.5 text-[13px] font-bold">{v}</div>
    </div>
  );
}

const GRADE_STYLES: Record<string, string> = {
  Superior: "bg-[#e9ede9] text-[#33403c]",
  Similar: "bg-[#e7f0ea] text-[#2f6f4e]",
  Inferior: "bg-[#f3f1ea] text-[#837c6c]",
};

function ComparablesPanel({ appraisalId, comparables }: { appraisalId: string; comparables: Comparable[] }) {
  const [showCsv, setShowCsv] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [, startTransition] = useTransition();

  const boundCsv = uploadComparablesCsv.bind(null, appraisalId);
  const [csvState, csvAction, csvPending] = useActionState<ActionState, FormData>(boundCsv, { ok: false });

  const boundManual = addComparableManual.bind(null, appraisalId);
  const [manualState, manualAction, manualPending] = useActionState<ActionState, FormData>(boundManual, { ok: false });

  return (
    <Panel
      title={`Comparables (${comparables.length})`}
      action={
        <div className="flex gap-2">
          <button
            onClick={() => setShowCsv((s) => !s)}
            className="rounded border border-[#e7e2d4] px-3 py-1.5 text-xs font-semibold hover:border-[#14130f]"
          >
            {showCsv ? "Cancel" : "Upload CSV"}
          </button>
          <button
            onClick={() => setShowManual((s) => !s)}
            className="rounded border border-[#e7e2d4] px-3 py-1.5 text-xs font-semibold hover:border-[#14130f]"
          >
            {showManual ? "Cancel" : "+ Add manually"}
          </button>
        </div>
      }
    >
      {showCsv && (
        <form action={csvAction} className="mb-5 rounded-lg border border-[#e7e2d4] bg-[#faf8f3] p-4">
          <p className="mb-2 text-xs text-[#524d40]">
            Export your search from Prover / Property Guru / REINZ as CSV, or use the{" "}
            <a href="/comparables-template.csv" download className="font-semibold text-[#14130f] underline">
              template
            </a>
            . Needs at least Address and Sale Price columns.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <input name="file" type="file" accept=".csv,text/csv" required className="text-sm" />
            <button disabled={csvPending} className="rounded-lg bg-[#14130f] px-4 py-2 text-sm font-semibold text-white">
              {csvPending ? "Importing…" : "Import"}
            </button>
          </div>
          {csvState.error && <p className="mt-2 text-sm text-[#b23b2e]">{csvState.error}</p>}
          {csvState.info && <p className="mt-2 text-sm text-[#2f6f4e]">{csvState.info}</p>}
        </form>
      )}

      {showManual && (
        <form
          action={(fd) => {
            manualAction(fd);
            setShowManual(false);
          }}
          className="mb-5 grid grid-cols-2 gap-3 rounded-lg border border-[#e7e2d4] bg-[#faf8f3] p-4 sm:grid-cols-4"
        >
          <input name="address" placeholder="Address" required className="field-input col-span-2" />
          <input name="sale_date" type="date" className="field-input" />
          <input name="sale_price" type="number" placeholder="Sale price ($)" required className="field-input" />
          <input name="floor_area_m2" type="number" placeholder="Floor area (m²)" className="field-input" />
          <input name="land_area_m2" type="number" placeholder="Land area (m²)" className="field-input" />
          <input name="bedrooms" type="number" placeholder="Bedrooms" className="field-input" />
          <input name="capital_value" type="number" placeholder="Capital value ($)" className="field-input" />
          <label className="flex items-center gap-2 text-xs text-[#524d40]">
            <input type="checkbox" name="is_current_listing" className="h-4 w-4" />
            Currently on the market (not yet sold)
          </label>
          <button disabled={manualPending} className="col-span-2 rounded-lg bg-[#14130f] px-4 py-2 text-sm font-semibold text-white sm:col-span-4">
            Add comparable
          </button>
          {manualState.error && <p className="col-span-2 text-sm text-[#b23b2e] sm:col-span-4">{manualState.error}</p>}
        </form>
      )}

      {comparables.length === 0 ? (
        <Empty text="No comparables yet — upload a CSV or add one manually." />
      ) : (
        <table className="w-full text-[12.5px]">
          <thead>
            <tr className="border-b border-[#e7e2d4] text-left text-[10.5px] uppercase tracking-wide text-[#837c6c]">
              <th className="pb-2">Include</th>
              <th className="pb-2">Property</th>
              <th className="pb-2">Sold</th>
              <th className="pb-2">Floor</th>
              <th className="pb-2">Land</th>
              <th className="pb-2">Price</th>
              <th className="pb-2">CV</th>
              <th className="pb-2">Grade</th>
              <th className="pb-2">Indicated</th>
              <th className="pb-2"></th>
            </tr>
          </thead>
          <tbody>
            {comparables.map((c) => (
              <tr key={c.id} className="border-b border-[#eef1f5] last:border-none">
                <td className="py-2 pr-2">
                  <input
                    type="checkbox"
                    checked={c.included}
                    onChange={(e) =>
                      startTransition(() => {
                        updateComparable(appraisalId, c.id, { included: e.target.checked });
                      })
                    }
                    className="h-4 w-4"
                  />
                </td>
                <td className="py-2 pr-2">
                  <b>{c.address}</b>
                  {c.is_current_listing && <span className="ml-1.5 text-[10px] text-[#a9761f]">on market</span>}
                  {c.flagged_reason && <div className="text-[11px] text-[#b23b2e]">{c.flagged_reason}</div>}
                </td>
                <td className="py-2 pr-2 text-[#524d40]">
                  {c.sale_date ? new Date(c.sale_date).toLocaleDateString("en-NZ", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                </td>
                <td className="py-2 pr-2">{c.floor_area_m2 ? `${c.floor_area_m2}m²` : "—"}</td>
                <td className="py-2 pr-2">{c.land_area_m2 ? `${c.land_area_m2}m²` : "—"}</td>
                <td className="py-2 pr-2 font-bold tabular-nums">{money(c.sale_price)}</td>
                <td className="py-2 pr-2 tabular-nums">{c.capital_value ? money(c.capital_value) : "—"}</td>
                <td className="py-2 pr-2">
                  <select
                    defaultValue={c.grade}
                    onChange={(e) =>
                      startTransition(() => {
                        updateComparable(appraisalId, c.id, { grade: e.target.value as Grade });
                      })
                    }
                    className={`rounded px-1.5 py-1 text-[11px] font-semibold ${GRADE_STYLES[c.grade] ?? ""}`}
                  >
                    <option value="Superior">Superior</option>
                    <option value="Similar">Similar</option>
                    <option value="Inferior">Inferior</option>
                  </select>
                </td>
                <td className="py-2 pr-2 font-bold tabular-nums">{money(c.indicated_value)}</td>
                <td className="py-2">
                  <button
                    onClick={() =>
                      startTransition(() => {
                        deleteComparable(appraisalId, c.id);
                      })
                    }
                    className="text-[11px] font-semibold text-[#837c6c] hover:text-[#b23b2e]"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p className="mt-3 text-xs text-[#837c6c]">
        Grades and inclusion are auto-suggested (sales far below CV are auto-excluded as likely non-market) — you
        have the final say on every one before anything goes to a vendor.
      </p>
    </Panel>
  );
}

function ProposalPanel({
  appraisal,
  comparables,
  range,
}: {
  appraisal: Appraisal;
  comparables: Comparable[];
  range: ReturnType<typeof estimateRange>;
}) {
  const [show, setShow] = useState(false);

  return (
    <Panel
      title="Proposal document"
      action={
        <div className="flex gap-2">
          <button
            onClick={() => setShow((s) => !s)}
            disabled={!range}
            className="rounded border border-[#e7e2d4] px-3 py-1.5 text-xs font-semibold hover:border-[#14130f] disabled:opacity-40"
          >
            {show ? "Hide" : "Generate proposal"}
          </button>
          {show && (
            <button
              onClick={() => window.print()}
              className="rounded bg-[#14130f] px-3 py-1.5 text-xs font-semibold text-white"
            >
              Print / Save as PDF
            </button>
          )}
        </div>
      }
    >
      {!range && <Empty text="Include at least one comparable to generate the proposal." />}
      {show && range && (
        <div id="proposal-doc" className="overflow-hidden rounded-lg border border-[#e7e2d4]">
          <div className="bg-[#14130f] px-8 py-7 text-white">
            <b className="font-display block text-[15px]">Bayleys</b>
            <h2 className="font-display mt-3 text-xl font-semibold">A Market Appraisal</h2>
            <p className="mt-1 text-[13px] text-[#cfc9ba]">{appraisal.address}</p>
          </div>
          <div className="space-y-3 px-8 py-7 text-[13.5px] leading-relaxed text-[#2a3542]">
            <p>
              Thank you for the opportunity to appraise your property at {appraisal.address}. We are delighted to
              present our market appraisal for your perusal.
            </p>
            <table className="w-full border-collapse text-[12.5px]">
              <tbody>
                {appraisal.legal_description && (
                  <tr>
                    <td className="border border-[#e7e2d4] p-2 font-bold">The property is</td>
                    <td className="border border-[#e7e2d4] p-2">{appraisal.legal_description}</td>
                  </tr>
                )}
                {appraisal.title_reference && (
                  <tr>
                    <td className="border border-[#e7e2d4] p-2 font-bold">Title</td>
                    <td className="border border-[#e7e2d4] p-2">{appraisal.title_reference}</td>
                  </tr>
                )}
                {appraisal.land_value && (
                  <tr>
                    <td className="border border-[#e7e2d4] p-2 font-bold">Land value</td>
                    <td className="border border-[#e7e2d4] p-2">{money(appraisal.land_value)}</td>
                  </tr>
                )}
                {appraisal.improvements_value && (
                  <tr>
                    <td className="border border-[#e7e2d4] p-2 font-bold">Improvements value</td>
                    <td className="border border-[#e7e2d4] p-2">{money(appraisal.improvements_value)}</td>
                  </tr>
                )}
                {appraisal.capital_value && (
                  <tr>
                    <td className="border border-[#e7e2d4] p-2 font-bold">Rating value</td>
                    <td className="border border-[#e7e2d4] p-2">{money(appraisal.capital_value)}</td>
                  </tr>
                )}
              </tbody>
            </table>
            {appraisal.description && <p>{appraisal.description}</p>}
            <p>
              We have researched sales in the area of comparative size and construction in appraising the potential
              market value. It is a combination of this data, current market activity and our experience that
              brings about a professional appraisal.
            </p>
            <p>
              This is purely a guide based on historical data — often the market can be unpredictable, with a
              number of factors affecting the value of real estate. Market value could be more or less than this,
              but based on the market statistics available to us today we believe your property could be in the
              range:
            </p>
            <div className="flex gap-3">
              <div className="flex-1 rounded-lg border-2 border-[#14130f] p-3.5 text-center">
                <div className="text-[11px] uppercase tracking-wide text-[#837c6c]">Lowest expectation</div>
                <div className="mt-1 text-xl font-bold">{money(range.low)}</div>
              </div>
              <div className="flex-1 rounded-lg border-2 border-[#14130f] p-3.5 text-center">
                <div className="text-[11px] uppercase tracking-wide text-[#837c6c]">
                  On a good day, after an effective marketing campaign
                </div>
                <div className="mt-1 text-xl font-bold">{money(range.high)}</div>
              </div>
            </div>
            <h3 className="font-display text-[15px] font-semibold">Comparable sales relied upon</h3>
            <table className="w-full border-collapse text-[12.5px]">
              <thead>
                <tr>
                  <th className="border border-[#e7e2d4] bg-[#faf8f3] p-2 text-left text-[10.5px] uppercase text-[#837c6c]">Property</th>
                  <th className="border border-[#e7e2d4] bg-[#faf8f3] p-2 text-left text-[10.5px] uppercase text-[#837c6c]">Sold</th>
                  <th className="border border-[#e7e2d4] bg-[#faf8f3] p-2 text-left text-[10.5px] uppercase text-[#837c6c]">Floor</th>
                  <th className="border border-[#e7e2d4] bg-[#faf8f3] p-2 text-left text-[10.5px] uppercase text-[#837c6c]">Land</th>
                  <th className="border border-[#e7e2d4] bg-[#faf8f3] p-2 text-left text-[10.5px] uppercase text-[#837c6c]">Price</th>
                  <th className="border border-[#e7e2d4] bg-[#faf8f3] p-2 text-left text-[10.5px] uppercase text-[#837c6c]">Assessment</th>
                </tr>
              </thead>
              <tbody>
                {comparables.map((c) => (
                  <tr key={c.id}>
                    <td className="border border-[#e7e2d4] p-2">{c.address}</td>
                    <td className="border border-[#e7e2d4] p-2">
                      {c.is_current_listing
                        ? "On market"
                        : c.sale_date
                          ? new Date(c.sale_date).toLocaleDateString("en-NZ", { day: "numeric", month: "short", year: "numeric" })
                          : "—"}
                    </td>
                    <td className="border border-[#e7e2d4] p-2">{c.floor_area_m2 ? `${c.floor_area_m2}m²` : "—"}</td>
                    <td className="border border-[#e7e2d4] p-2">{c.land_area_m2 ? `${c.land_area_m2}m²` : "—"}</td>
                    <td className="border border-[#e7e2d4] p-2">{money(c.sale_price)}</td>
                    <td className="border border-[#e7e2d4] p-2">{c.grade}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p>
              The pricing decision is ultimately yours, and if there is an opportunity to exceed the estimated
              value, then we will aim to find you that purchaser.
            </p>
            <p>
              The marketing strategy for your property is crucial in the first two weeks of your campaign. This
              period is where we need to promote your property as far and wide as possible — we&apos;ll get one
              chance to make a first impression. As we progress with the sale, you will receive regular feedback
              about your property and the market interest we have.
            </p>
            <div className="flex items-center gap-3 border-t border-[#e7e2d4] pt-4">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-[#14130f] font-display text-white">
                CC
              </div>
              <div className="text-[12px] leading-relaxed text-[#837c6c]">
                <b className="block text-[13.5px] text-[#14130f]">Chris Campbell</b>
                Residential, Commercial and Waterfront Sales · Bayleys Queenstown
                <br />
                021 932 441 · chris.campbell@bayleys.co.nz · chriscampbell.co.nz
                <br />
                Queenstown and Southern NZ Realty Ltd, Licensed under the REA Act 2008
              </div>
            </div>
          </div>
        </div>
      )}
    </Panel>
  );
}
