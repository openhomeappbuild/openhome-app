"use client";

import { useActionState, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
  uploadComparablesCsv,
  addComparableManual,
  updateComparable,
  deleteComparable,
  updateAppraisalSubject,
  setEstimateOverride,
  clearEstimateOverride,
  type ActionState,
} from "./actions";
import { estimateRange, defaultValuationInputs, type Grade } from "@/lib/valuation";
import { Panel, Stat, Empty, Pill } from "../../ui";

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
  estimate_low: number | null;
  estimate_high: number | null;
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
  const hasOverride = appraisal.estimate_low != null && appraisal.estimate_high != null;
  const effectiveRange = hasOverride
    ? { low: appraisal.estimate_low as number, high: appraisal.estimate_high as number, count: range?.count ?? 0 }
    : range;

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
        <Stat n={effectiveRange ? money(effectiveRange.low) : "—"} l="Lowest expectation" d={hasOverride ? "Your estimate" : undefined} />
        <Stat n={effectiveRange ? money(effectiveRange.high) : "—"} l="On a good day" d={hasOverride ? "Your estimate" : undefined} />
        <Stat n={range?.count ?? 0} l="Comparables included" />
        <Stat n={appraisal.capital_value ? money(appraisal.capital_value) : "—"} l="Capital value (CV)" />
      </div>

      <EstimateOverrideControl appraisal={appraisal} computedRange={range} hasOverride={hasOverride} />

      <div className="mt-4">
        <ValuationPanel appraisal={appraisal} comparables={comparables} />
      </div>

      <div className="mt-4">
        <ProposalPanel appraisal={appraisal} comparables={comparables.filter((c) => c.included)} range={effectiveRange} />
      </div>
    </div>
  );
}

function EstimateOverrideControl({
  appraisal,
  computedRange,
  hasOverride,
}: {
  appraisal: Appraisal;
  computedRange: ReturnType<typeof estimateRange>;
  hasOverride: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const boundAction = setEstimateOverride.bind(null, appraisal.id);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(boundAction, { ok: false });
  const [, startTransition] = useTransition();

  if (hasOverride && !editing) {
    return (
      <p className="mt-2 text-xs text-[#837c6c]">
        Using your own figure instead of the comparables range.{" "}
        <button onClick={() => setEditing(true)} className="font-semibold text-[#14130f] underline">
          Edit
        </button>{" "}
        ·{" "}
        <button
          onClick={() => startTransition(() => clearEstimateOverride(appraisal.id))}
          className="font-semibold text-[#14130f] underline"
        >
          Revert to computed range
        </button>
      </p>
    );
  }

  if (!editing) {
    return (
      <p className="mt-2 text-xs text-[#837c6c]">
        That's a computed cross-check, not a verdict.{" "}
        <button onClick={() => setEditing(true)} className="font-semibold text-[#14130f] underline">
          Set your own estimate
        </button>{" "}
        if your judgment on this property differs.
      </p>
    );
  }

  return (
    <form
      action={(fd) => {
        formAction(fd);
        setEditing(false);
      }}
      className="mt-2 flex flex-wrap items-end gap-2"
    >
      <div>
        <label className="mb-1 block text-[10.5px] uppercase tracking-wide text-[#837c6c]">Your low ($)</label>
        <input
          name="estimate_low"
          type="number"
          min="0"
          defaultValue={appraisal.estimate_low ?? computedRange?.low ?? ""}
          className="field-input w-[140px]"
        />
      </div>
      <div>
        <label className="mb-1 block text-[10.5px] uppercase tracking-wide text-[#837c6c]">Your high ($)</label>
        <input
          name="estimate_high"
          type="number"
          min="0"
          defaultValue={appraisal.estimate_high ?? computedRange?.high ?? ""}
          className="field-input w-[140px]"
        />
      </div>
      <button disabled={pending} className="rounded-lg bg-[#14130f] px-3 py-2 text-xs font-semibold text-white">
        Save
      </button>
      <button type="button" onClick={() => setEditing(false)} className="text-xs font-semibold text-[#837c6c]">
        Cancel
      </button>
      {state.error && <p className="w-full text-xs text-[#b23b2e]">{state.error}</p>}
    </form>
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
        <p className="col-span-2 -mt-1 text-[11px] leading-relaxed text-[#837c6c] sm:col-span-4">
          Land value + improvements value = capital value, always — leave one of the three blank and it's
          calculated from the other two. Find the official split on the property's council rates record or a
          QV.co.nz search if you don't have all three yet. If you know of value the CV doesn't reflect yet (a
          recent renovation, a pool put in since the last rating valuation), add it to Improvements — that
          flows into the CV-index method's indicated values, the main driver of the range below.
        </p>
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
            <input
              name="file"
              type="file"
              accept=".csv,text/csv"
              required
              className="cursor-pointer text-sm text-[#524d40] file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-[#14130f] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-[#2a281f]"
            />
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

function Slider({
  label,
  value,
  display,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  display: string;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="mb-3">
      <label className="mb-1 flex items-baseline justify-between text-[11.5px] font-semibold text-[#524d40]">
        <span>{label}</span>
        <span className="text-[13px] font-bold text-[#14130f]">{display}</span>
      </label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[#14130f]"
      />
    </div>
  );
}

function MethodCard({
  title,
  badge,
  explainer,
  children,
  formula,
  value,
  wide,
}: {
  title: string;
  badge: string;
  explainer: string;
  children: React.ReactNode;
  formula: string;
  value: number;
  wide?: boolean;
}) {
  return (
    <div className={`flex flex-col rounded-lg border border-[#e7e2d4] p-4 ${wide ? "sm:col-span-2" : ""}`}>
      <div className="mb-1.5 flex items-center gap-2">
        <b className="text-[13.5px]">{title}</b>
        <span className="rounded-full bg-[#f3f1ea] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#837c6c]">
          {badge}
        </span>
      </div>
      <p className="mb-3 text-[11.5px] leading-relaxed text-[#837c6c]">{explainer}</p>
      {children}
      <div className="mt-auto flex items-baseline justify-between border-t border-[#e7e2d4] pt-2.5">
        <span className="text-[10.5px] uppercase tracking-wide text-[#837c6c]">{formula}</span>
        <span className="text-[19px] font-bold tabular-nums">{money(Math.round(value))}</span>
      </div>
    </div>
  );
}

function ValuationPanel({ appraisal, comparables }: { appraisal: Appraisal; comparables: Comparable[] }) {
  const defaults = useMemo(() => defaultValuationInputs(appraisal, comparables), [appraisal, comparables]);
  const [comparisonValue, setComparisonValue] = useState(defaults.comparisonValue);
  const [weeklyRent, setWeeklyRent] = useState(defaults.weeklyRent);
  const [grossYield, setGrossYield] = useState(defaults.grossYield);
  const [cvRatio, setCvRatio] = useState(defaults.cvRatio);
  const [ratePerM2, setRatePerM2] = useState(defaults.ratePerM2);
  const [landValue, setLandValue] = useState(defaults.landValue);
  const [buildCostPerM2, setBuildCostPerM2] = useState(defaults.buildCostPerM2);
  const [depreciation, setDepreciation] = useState(defaults.depreciation);

  const floorArea = appraisal.floor_area_m2 ?? 0;
  const capitalValue = appraisal.capital_value ?? 0;

  const vComparison = comparisonValue;
  const vIncome = (weeklyRent * 52) / (grossYield / 100);
  const vCvIndex = capitalValue * (cvRatio / 100);
  const vRate = floorArea * ratePerM2;
  const vSummation = landValue + floorArea * buildCostPerM2 * (1 - depreciation / 100);

  const methods = [
    { label: "Direct comparison", value: vComparison },
    { label: "Income approach", value: vIncome },
    { label: "CV-index", value: vCvIndex },
    { label: "Rate per m²", value: vRate },
    { label: "Summation (cost)", value: vSummation },
  ].filter((m) => m.value > 0);

  const weighted =
    methods.reduce((sum, m) => {
      const weight = m.label === "Direct comparison" ? 0.4 : 0.15;
      return sum + m.value * weight;
    }, 0) / (methods.reduce((s, m) => s + (m.label === "Direct comparison" ? 0.4 : 0.15), 0) || 1);

  const vals = methods.map((m) => m.value);
  const lo = vals.length ? Math.min(...vals) : 0;
  const hi = vals.length ? Math.max(...vals) : 0;
  const med = vals.length ? [...vals].sort((a, b) => a - b)[Math.floor(vals.length / 2)] : 0;
  const spread = med ? ((hi - lo) / med) * 100 : 0;

  const convergence =
    spread <= 10
      ? { tone: "green" as const, label: "Strong — methods agree", text: "All methods sit within ~10% of each other. The reconciled figure is well supported — present the range to the vendor with confidence." }
      : spread <= 20
        ? { tone: "amber" as const, label: "Moderate — one outlier", text: "Most methods agree but at least one diverges. Check its assumptions — the outlier usually reveals something, like replacement cost exceeding market, or rent lagging price." }
        : { tone: "red" as const, label: "Weak — methods disagree", text: "The methods disagree materially. Revisit the assumptions before quoting a range — this property may be unusual for its area." };

  const axMin = Math.min(lo, capitalValue || lo) * 0.95;
  const axMax = Math.max(hi, capitalValue || hi) * 1.05;
  const axSpan = axMax - axMin || 1;

  return (
    <Panel title="Multi-method valuation">
      <p className="mb-4 text-[12.5px] leading-relaxed text-[#837c6c]">
        Five independent readings on the same property, seeded from the subject facts and included comparables
        above. Adjust any assumption — the reconciliation and confidence rating update live. This is a cross-check
        tool; it doesn&apos;t change the comparables range shown above or in the proposal.
      </p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <MethodCard title="1 · Direct comparison" badge="Primary" value={vComparison} formula="Adjusted midpoint" explainer="What similar properties actually sold for, adjusted for differences. The market's own verdict — carries the most weight for standard homes.">
          <Slider label="Adjusted midpoint from comparables" value={comparisonValue} display={money(comparisonValue)} min={Math.round((defaults.comparisonValue * 0.8) / 1000) * 1000} max={Math.round((defaults.comparisonValue * 1.2) / 1000) * 1000} step={5000} onChange={setComparisonValue} />
        </MethodCard>

        <MethodCard title="2 · Income approach" badge="Investor lens" value={vIncome} formula="Rent × 52 ÷ yield" explainer="Value from rental return: annual rent divided by the yield buyers expect. Most relevant for properties with strong rental demand.">
          <Slider label="Weekly rent" value={weeklyRent} display={`$${weeklyRent.toLocaleString("en-NZ")}`} min={Math.max(Math.round((defaults.weeklyRent * 0.7) / 25) * 25, 100)} max={Math.round((defaults.weeklyRent * 1.3) / 25) * 25} step={25} onChange={setWeeklyRent} />
          <Slider label="Gross yield buyers accept" value={grossYield} display={`${grossYield.toFixed(1)}%`} min={3} max={8} step={0.1} onChange={setGrossYield} />
        </MethodCard>

        <MethodCard title="3 · CV-index" badge="Cross-check" value={vCvIndex} formula="CV × ratio" explainer="Recent local sales achieved a ratio to their rating (CV) values; apply that ratio to the subject's CV. Crude but fully automatic — a good outlier detector.">
          <Slider label="Local sales-to-CV ratio" value={cvRatio} display={`${cvRatio}%`} min={80} max={130} step={1} onChange={setCvRatio} />
        </MethodCard>

        <MethodCard title="4 · Rate per m²" badge="Cross-check" value={vRate} formula={`${floorArea || "—"}m² × rate`} explainer="Comparable sale prices per square metre of floor area, applied to the subject. Shows whether size alone explains the price.">
          <Slider label="Rate per m² of floor area" value={ratePerM2} display={`$${ratePerM2.toLocaleString("en-NZ")}`} min={Math.max(Math.round((defaults.ratePerM2 * 0.7) / 50) * 50, 500)} max={Math.round((defaults.ratePerM2 * 1.3) / 50) * 50} step={50} onChange={setRatePerM2} />
        </MethodCard>

        <MethodCard title="5 · Summation (cost)" badge="Upper anchor" value={vSummation} formula="Land + build − depreciation" explainer="Land value plus the depreciated replacement cost of the buildings. Typically sets a ceiling — when buying is cheaper than building, value at the top of the range is supported." wide>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Slider label="Land value" value={landValue} display={money(landValue)} min={Math.round((defaults.landValue * 0.7) / 10000) * 10000} max={Math.round((defaults.landValue * 1.3) / 10000) * 10000} step={10000} onChange={setLandValue} />
            <Slider label="Build cost per m²" value={buildCostPerM2} display={`$${buildCostPerM2.toLocaleString("en-NZ")}`} min={Math.max(Math.round((defaults.buildCostPerM2 * 0.6) / 50) * 50, 500)} max={Math.round((defaults.buildCostPerM2 * 1.4) / 50) * 50} step={50} onChange={setBuildCostPerM2} />
            <Slider label="Depreciation" value={depreciation} display={`${depreciation}%`} min={0} max={40} step={1} onChange={setDepreciation} />
          </div>
        </MethodCard>
      </div>

      <h4 className="font-display mt-5 mb-2.5 text-[13.5px] font-semibold">Reconciliation</h4>
      <div className="space-y-2">
        {methods.map((m) => {
          const left = ((m.value - axMin) / axSpan) * 100;
          return (
            <div key={m.label} className="flex items-center gap-3">
              <span className="w-[140px] flex-shrink-0 text-[11.5px] font-semibold text-[#524d40]">{m.label}</span>
              <div className="relative h-4 flex-1 overflow-hidden rounded bg-[#f3f1ea]">
                <div className="absolute inset-y-0 left-0 rounded bg-[#14130f] opacity-80" style={{ width: `${Math.max(0, Math.min(100, left))}%` }} />
              </div>
              <span className="w-[92px] flex-shrink-0 text-right text-[12px] font-bold tabular-nums">{money(Math.round(m.value))}</span>
            </div>
          );
        })}
      </div>
      {vals.length > 0 && (
        <p className="mt-2 text-[11.5px] text-[#837c6c]">
          Methods span {money(Math.round(lo))} – {money(Math.round(hi))} (spread {spread.toFixed(0)}% of the median).
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-3">
        <div className="min-w-[220px] flex-1 rounded-lg border-2 border-[#14130f] p-4 text-center">
          <div className="text-[10.5px] uppercase tracking-wide text-[#837c6c]">Reconciled estimate</div>
          <div className="font-display mt-1 text-[26px] font-bold">{vals.length ? money(Math.round(weighted)) : "—"}</div>
          <div className="mt-1 text-[11px] text-[#837c6c]">Weighted: comparison 40% · other four methods 15% each</div>
        </div>
        <div className="min-w-[220px] flex-1 rounded-lg border border-[#e7e2d4] p-4">
          <div className="mb-1.5 text-[10.5px] uppercase tracking-wide text-[#837c6c]">Convergence check</div>
          {vals.length > 0 ? (
            <>
              <Pill tone={convergence.tone}>{convergence.label}</Pill>
              <p className="mt-2 text-[11.5px] leading-relaxed text-[#837c6c]">{convergence.text}</p>
            </>
          ) : (
            <p className="text-[11.5px] text-[#837c6c]">Add subject facts and at least one comparable to see a reading here.</p>
          )}
        </div>
      </div>

      <p className="mt-4 text-[11.5px] leading-relaxed text-[#837c6c]">
        Method values are indicative tools for an agent&apos;s appraisal — this is not a registered valuation, and
        any figure presented to a vendor remains the agent&apos;s professional judgment.
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
