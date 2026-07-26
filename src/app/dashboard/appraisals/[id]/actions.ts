"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { parseCsv } from "@/lib/csv";
import { suggestGrade, flagIfNonMarket, flagIfSizeMismatch, flagOutliersByIndicatedValue, computeIndicatedValue } from "@/lib/valuation";

export type ActionState = { ok: boolean; error?: string; info?: string };

function normalizeHeader(h: string) {
  return h.toLowerCase().replace(/[^a-z0-9]/g, "");
}

const HEADER_ALIASES: Record<string, string[]> = {
  address: ["address"],
  suburb: ["suburb"],
  saleDate: ["saledate", "date", "solddate", "lastsaledate"],
  floorArea: ["floorarea", "floorm2", "floor", "floorareamm2", "floorareasqm"],
  landArea: ["landarea", "landm2", "land", "landareasqm"],
  bedrooms: ["bedrooms", "beds", "bed"],
  salePrice: ["saleprice", "price", "lastsaleprice"],
  capitalValue: ["capitalvalue", "cv", "rv", "ratingvalue"],
  currentListing: ["currentlisting", "listing", "onmarket"],
  landUse: ["landuse", "propertytype", "use"],
};

function findColumn(headers: string[], field: string): number {
  const normalized = headers.map(normalizeHeader);
  const aliases = HEADER_ALIASES[field];
  for (const alias of aliases) {
    const idx = normalized.indexOf(alias);
    if (idx !== -1) return idx;
  }
  return -1;
}

/** Turns "" / "n/a" / garbage into null but keeps a real 0 (e.g. a vacant section has 0m² of floor area). */
function parseNum(raw: string | undefined): number | null {
  if (raw === undefined) return null;
  const cleaned = raw.replace(/[^0-9.-]/g, "").trim();
  if (cleaned === "" || cleaned === "-") return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

const MONTHS: Record<string, string> = {
  jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
  jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
};

/**
 * Prover exports dates as "12 Jun 2020". Parsed directly from the string
 * rather than via `new Date(...)`, because `Date.parse` reads that format
 * as local midnight and `toISOString()` then converts it to UTC — shifting
 * the day by one depending on the server's timezone offset (the same class
 * of bug documented for open-home times; see nz-time.ts).
 */
function parseSaleDate(raw: string | undefined): string | null {
  const s = raw?.trim();
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = s.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/);
  if (!m) return null;
  const month = MONTHS[m[2].slice(0, 3).toLowerCase()];
  if (!month) return null;
  return `${m[3]}-${month}-${m[1].padStart(2, "0")}`;
}

/**
 * Shared by the comparables panel's own upload form and by the "new
 * appraisal" flow, which now imports the CSV as part of creating the
 * appraisal so the subject gets fully filled in (see the self-fill block
 * below) before any comparable is graded against it — grading and the
 * CV-index method are both meaningless without that.
 */
export async function runCsvImport(appraisalId: string, file: File): Promise<ActionState> {
  if (file.size === 0) {
    return { ok: false, error: "Please choose a CSV file first." };
  }

  // Excel-exported CSVs (Prover's included) often start with a "sep=,"
  // hint line and/or a UTF-8 BOM — neither is a data row.
  const text = (await file.text()).replace(/^﻿/, "").replace(/^sep=.*\r?\n/i, "");
  const rows = parseCsv(text);
  if (rows.length < 2) return { ok: false, error: "That file doesn't look like a CSV with a header row." };

  const [header, ...dataRows] = rows;
  const col = {
    address: findColumn(header, "address"),
    suburb: findColumn(header, "suburb"),
    saleDate: findColumn(header, "saleDate"),
    floorArea: findColumn(header, "floorArea"),
    landArea: findColumn(header, "landArea"),
    bedrooms: findColumn(header, "bedrooms"),
    salePrice: findColumn(header, "salePrice"),
    capitalValue: findColumn(header, "capitalValue"),
    currentListing: findColumn(header, "currentListing"),
    landUse: findColumn(header, "landUse"),
  };

  if (col.address === -1 || col.salePrice === -1) {
    return {
      ok: false,
      error: "CSV needs at least Address and Sale Price columns. Download the template for the expected format.",
    };
  }

  const { data: subject } = await supabaseAdmin
    .from("appraisals")
    .select("address, suburb, capital_value, floor_area_m2, land_area_m2, last_sold_date, last_sold_price")
    .eq("id", appraisalId)
    .single();
  const subjectAddressNorm = normalizeHeader(subject?.address ?? "");

  // Prover's "nearby sales" search is centred on the subject, so it's
  // typically the first result. If it's there, use its own figures to fill
  // in whatever subject fields the agent hasn't already entered by hand,
  // rather than making them re-type numbers the export already has.
  const filledFields: string[] = [];
  if (subject && dataRows[0] && normalizeHeader(dataRows[0][col.address]?.trim() ?? "") === subjectAddressNorm) {
    const first = dataRows[0];
    const subjectUpdate: Record<string, string | number> = {};

    const cv = col.capitalValue !== -1 ? parseNum(first[col.capitalValue]) : null;
    if (subject.capital_value == null && cv != null) {
      subjectUpdate.capital_value = cv;
      filledFields.push("capital value");
    }
    const floorArea = col.floorArea !== -1 ? parseNum(first[col.floorArea]) : null;
    if (subject.floor_area_m2 == null && floorArea != null && floorArea > 0) {
      subjectUpdate.floor_area_m2 = floorArea;
      filledFields.push("floor area");
    }
    const landArea = col.landArea !== -1 ? parseNum(first[col.landArea]) : null;
    if (subject.land_area_m2 == null && landArea != null) {
      subjectUpdate.land_area_m2 = landArea;
      filledFields.push("land area");
    }
    const lastSoldDate = col.saleDate !== -1 ? parseSaleDate(first[col.saleDate]) : null;
    if (subject.last_sold_date == null && lastSoldDate) {
      subjectUpdate.last_sold_date = lastSoldDate;
      filledFields.push("last sold date");
    }
    const lastSoldPrice = col.salePrice !== -1 ? parseNum(first[col.salePrice]) : null;
    if (subject.last_sold_price == null && lastSoldPrice != null) {
      subjectUpdate.last_sold_price = lastSoldPrice;
      filledFields.push("last sold price");
    }
    if (!subject.suburb && col.suburb !== -1 && first[col.suburb]?.trim()) {
      subjectUpdate.suburb = first[col.suburb].trim();
      filledFields.push("suburb");
    }

    if (Object.keys(subjectUpdate).length > 0) {
      await supabaseAdmin.from("appraisals").update(subjectUpdate).eq("id", appraisalId);
      Object.assign(subject, subjectUpdate);
    }
  }

  const rowsToInsert = dataRows
    .map((r) => {
      let address = r[col.address]?.trim();
      const salePrice = parseNum(r[col.salePrice]);
      if (!address || !salePrice) return null;

      // A "nearby sales" export from Prover often includes the subject
      // property itself in the results — it's not a comparable to itself.
      if (subjectAddressNorm && normalizeHeader(address) === subjectAddressNorm) return null;

      const suburb = col.suburb !== -1 ? r[col.suburb]?.trim() : "";
      if (suburb && !address.toLowerCase().includes(suburb.toLowerCase())) {
        address = `${address}, ${suburb}`;
      }

      const capitalValue = col.capitalValue !== -1 ? parseNum(r[col.capitalValue]) : null;
      const floorArea = col.floorArea !== -1 ? parseNum(r[col.floorArea]) : null;
      const landArea = col.landArea !== -1 ? parseNum(r[col.landArea]) : null;
      const saleDate = col.saleDate !== -1 ? parseSaleDate(r[col.saleDate]) : null;
      const landUse = col.landUse !== -1 ? r[col.landUse]?.trim() : "";

      // A vacant-section sale isn't a valid comparable for a dwelling appraisal
      // (or vice versa) — flag it rather than silently averaging it in.
      const isVacantLand = /vacant/i.test(landUse) || floorArea === 0;
      const flaggedReason =
        flagIfNonMarket(salePrice, capitalValue) ??
        (isVacantLand ? "Vacant land sale — not comparable to a dwelling." : null) ??
        flagIfSizeMismatch(subject?.land_area_m2 ?? null, landArea);

      return {
        appraisal_id: appraisalId,
        address,
        sale_date: saleDate,
        floor_area_m2: floorArea,
        land_area_m2: landArea,
        bedrooms: col.bedrooms !== -1 ? parseNum(r[col.bedrooms]) : null,
        sale_price: salePrice,
        capital_value: capitalValue,
        is_current_listing: col.currentListing !== -1 ? /^(true|yes|1)$/i.test(r[col.currentListing]?.trim() ?? "") : false,
        grade: suggestGrade(subject?.floor_area_m2 ?? null, floorArea),
        included: !flaggedReason,
        flagged_reason: flaggedReason,
        indicated_value: computeIndicatedValue({
          salePrice,
          compCapitalValue: capitalValue,
          subjectCapitalValue: subject?.capital_value ?? null,
          compFloorAreaM2: floorArea,
          subjectFloorAreaM2: subject?.floor_area_m2 ?? null,
          compLandAreaM2: landArea,
          subjectLandAreaM2: subject?.land_area_m2 ?? null,
        }),
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  if (rowsToInsert.length === 0) {
    return { ok: false, error: "No usable rows found — check the file matches the expected columns." };
  }

  const finalRows = flagOutliersByIndicatedValue(rowsToInsert);

  const { error } = await supabaseAdmin.from("appraisal_comparables").insert(finalRows);
  if (error) return { ok: false, error: "Could not save comparables. Please try again." };

  revalidatePath(`/dashboard/appraisals/${appraisalId}`);
  const base = `Imported ${finalRows.length} comparable${finalRows.length === 1 ? "" : "s"}.`;
  const info = filledFields.length > 0 ? `${base} Also filled in the subject's ${filledFields.join(", ")} from the CSV.` : base;
  return { ok: true, info };
}

export async function uploadComparablesCsv(
  appraisalId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const file = formData.get("file");
  if (!(file instanceof File)) return { ok: false, error: "Please choose a CSV file first." };
  return runCsvImport(appraisalId, file);
}

export async function addComparableManual(
  appraisalId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const address = String(formData.get("address") ?? "").trim();
  const salePrice = Number(String(formData.get("sale_price") ?? "").replace(/[^0-9.-]/g, ""));
  if (!address) return { ok: false, error: "Address is required." };
  if (!salePrice) return { ok: false, error: "Sale price is required." };

  const floorArea = Number(formData.get("floor_area_m2")) || null;
  const landArea = Number(formData.get("land_area_m2")) || null;
  const capitalValue = Number(formData.get("capital_value")) || null;
  const { data: subject } = await supabaseAdmin
    .from("appraisals")
    .select("floor_area_m2, land_area_m2, capital_value")
    .eq("id", appraisalId)
    .single();

  const flagged = flagIfNonMarket(salePrice, capitalValue) ?? flagIfSizeMismatch(subject?.land_area_m2 ?? null, landArea);

  const { error } = await supabaseAdmin.from("appraisal_comparables").insert({
    appraisal_id: appraisalId,
    address,
    sale_date: String(formData.get("sale_date") ?? "").trim() || null,
    floor_area_m2: floorArea,
    land_area_m2: landArea,
    bedrooms: Number(formData.get("bedrooms")) || null,
    sale_price: salePrice,
    capital_value: capitalValue,
    is_current_listing: formData.get("is_current_listing") === "on",
    grade: suggestGrade(subject?.floor_area_m2 ?? null, floorArea),
    included: !flagged,
    flagged_reason: flagged,
    indicated_value: computeIndicatedValue({
      salePrice,
      compCapitalValue: capitalValue,
      subjectCapitalValue: subject?.capital_value ?? null,
      compFloorAreaM2: floorArea,
      subjectFloorAreaM2: subject?.floor_area_m2 ?? null,
      compLandAreaM2: landArea,
      subjectLandAreaM2: subject?.land_area_m2 ?? null,
    }),
  });

  if (error) return { ok: false, error: "Could not save the comparable. Please try again." };

  revalidatePath(`/dashboard/appraisals/${appraisalId}`);
  return { ok: true };
}

export async function updateComparable(
  appraisalId: string,
  comparableId: string,
  updates: { grade?: string; included?: boolean }
) {
  await supabaseAdmin.from("appraisal_comparables").update(updates).eq("id", comparableId);
  revalidatePath(`/dashboard/appraisals/${appraisalId}`);
}

export async function deleteComparable(appraisalId: string, comparableId: string) {
  await supabaseAdmin.from("appraisal_comparables").delete().eq("id", comparableId);
  revalidatePath(`/dashboard/appraisals/${appraisalId}`);
}

export async function updateAppraisalSubject(
  appraisalId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const address = String(formData.get("address") ?? "").trim();
  if (!address) return { ok: false, error: "Address is required." };

  function toNum(value: FormDataEntryValue | null) {
    const s = String(value ?? "").trim();
    return s ? Number(s) : null;
  }

  const { error } = await supabaseAdmin
    .from("appraisals")
    .update({
      address,
      suburb: String(formData.get("suburb") ?? "").trim() || null,
      legal_description: String(formData.get("legal_description") ?? "").trim() || null,
      title_reference: String(formData.get("title_reference") ?? "").trim() || null,
      floor_area_m2: toNum(formData.get("floor_area_m2")),
      land_area_m2: toNum(formData.get("land_area_m2")),
      bedrooms: toNum(formData.get("bedrooms")),
      bathrooms: toNum(formData.get("bathrooms")),
      land_value: toNum(formData.get("land_value")),
      improvements_value: toNum(formData.get("improvements_value")),
      capital_value: toNum(formData.get("capital_value")),
      last_sold_date: String(formData.get("last_sold_date") ?? "").trim() || null,
      last_sold_price: toNum(formData.get("last_sold_price")),
      description: String(formData.get("description") ?? "").trim() || null,
      vendor_name: String(formData.get("vendor_name") ?? "").trim() || null,
      vendor_email: String(formData.get("vendor_email") ?? "").trim() || null,
    })
    .eq("id", appraisalId);

  if (error) return { ok: false, error: "Could not save. Please try again." };

  revalidatePath(`/dashboard/appraisals/${appraisalId}`);
  return { ok: true };
}
