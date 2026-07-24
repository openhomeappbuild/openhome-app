"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { parseCsv } from "@/lib/csv";
import { suggestGrade, flagIfNonMarket, computeIndicatedValue } from "@/lib/valuation";

export type ActionState = { ok: boolean; error?: string; info?: string };

function normalizeHeader(h: string) {
  return h.toLowerCase().replace(/[^a-z0-9]/g, "");
}

const HEADER_ALIASES: Record<string, string[]> = {
  address: ["address"],
  saleDate: ["saledate", "date", "solddate"],
  floorArea: ["floorarea", "floorm2", "floor", "floorareamm2", "floorareasqm"],
  landArea: ["landarea", "landm2", "land", "landareasqm"],
  bedrooms: ["bedrooms", "beds", "bed"],
  salePrice: ["saleprice", "price"],
  capitalValue: ["capitalvalue", "cv", "rv", "ratingvalue"],
  currentListing: ["currentlisting", "listing", "onmarket"],
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

async function getSubjectCapitalValue(appraisalId: string): Promise<number | null> {
  const { data } = await supabaseAdmin
    .from("appraisals")
    .select("capital_value, floor_area_m2")
    .eq("id", appraisalId)
    .single();
  return data?.capital_value ?? null;
}

export async function uploadComparablesCsv(
  appraisalId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Please choose a CSV file first." };
  }

  const text = await file.text();
  const rows = parseCsv(text);
  if (rows.length < 2) return { ok: false, error: "That file doesn't look like a CSV with a header row." };

  const [header, ...dataRows] = rows;
  const col = {
    address: findColumn(header, "address"),
    saleDate: findColumn(header, "saleDate"),
    floorArea: findColumn(header, "floorArea"),
    landArea: findColumn(header, "landArea"),
    bedrooms: findColumn(header, "bedrooms"),
    salePrice: findColumn(header, "salePrice"),
    capitalValue: findColumn(header, "capitalValue"),
    currentListing: findColumn(header, "currentListing"),
  };

  if (col.address === -1 || col.salePrice === -1) {
    return {
      ok: false,
      error: "CSV needs at least Address and Sale Price columns. Download the template for the expected format.",
    };
  }

  const { data: subject } = await supabaseAdmin
    .from("appraisals")
    .select("capital_value, floor_area_m2")
    .eq("id", appraisalId)
    .single();

  const rowsToInsert = dataRows
    .map((r) => {
      const address = r[col.address]?.trim();
      const salePrice = Number(r[col.salePrice]?.replace(/[^0-9.-]/g, ""));
      if (!address || !salePrice) return null;
      const capitalValue = col.capitalValue !== -1 ? Number(r[col.capitalValue]?.replace(/[^0-9.-]/g, "")) || null : null;
      const floorArea = col.floorArea !== -1 ? Number(r[col.floorArea]) || null : null;
      const saleDateRaw = col.saleDate !== -1 ? r[col.saleDate]?.trim() : "";
      const saleDate = saleDateRaw && !isNaN(Date.parse(saleDateRaw)) ? new Date(saleDateRaw).toISOString().slice(0, 10) : null;

      return {
        appraisal_id: appraisalId,
        address,
        sale_date: saleDate,
        floor_area_m2: floorArea,
        land_area_m2: col.landArea !== -1 ? Number(r[col.landArea]) || null : null,
        bedrooms: col.bedrooms !== -1 ? Number(r[col.bedrooms]) || null : null,
        sale_price: salePrice,
        capital_value: capitalValue,
        is_current_listing: col.currentListing !== -1 ? /^(true|yes|1)$/i.test(r[col.currentListing]?.trim() ?? "") : false,
        grade: suggestGrade(subject?.floor_area_m2 ?? null, floorArea),
        included: true,
        flagged_reason: flagIfNonMarket(salePrice, capitalValue),
        indicated_value: computeIndicatedValue(salePrice, capitalValue, subject?.capital_value ?? null),
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null)
    .map((r) => (r.flagged_reason ? { ...r, included: false } : r));

  if (rowsToInsert.length === 0) {
    return { ok: false, error: "No usable rows found — check the file matches the expected columns." };
  }

  const { error } = await supabaseAdmin.from("appraisal_comparables").insert(rowsToInsert);
  if (error) return { ok: false, error: "Could not save comparables. Please try again." };

  revalidatePath(`/dashboard/appraisals/${appraisalId}`);
  return { ok: true, info: `Imported ${rowsToInsert.length} comparable${rowsToInsert.length === 1 ? "" : "s"}.` };
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
  const capitalValue = Number(formData.get("capital_value")) || null;
  const subjectCv = await getSubjectCapitalValue(appraisalId);
  const { data: subject } = await supabaseAdmin
    .from("appraisals")
    .select("floor_area_m2")
    .eq("id", appraisalId)
    .single();

  const flagged = flagIfNonMarket(salePrice, capitalValue);

  const { error } = await supabaseAdmin.from("appraisal_comparables").insert({
    appraisal_id: appraisalId,
    address,
    sale_date: String(formData.get("sale_date") ?? "").trim() || null,
    floor_area_m2: floorArea,
    land_area_m2: Number(formData.get("land_area_m2")) || null,
    bedrooms: Number(formData.get("bedrooms")) || null,
    sale_price: salePrice,
    capital_value: capitalValue,
    is_current_listing: formData.get("is_current_listing") === "on",
    grade: suggestGrade(subject?.floor_area_m2 ?? null, floorArea),
    included: !flagged,
    flagged_reason: flagged,
    indicated_value: computeIndicatedValue(salePrice, capitalValue, subjectCv),
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
