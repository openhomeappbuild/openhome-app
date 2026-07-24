"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase-admin";

export type AppraisalActionState = { error?: string };

function toNum(value: FormDataEntryValue | null) {
  const s = String(value ?? "").trim();
  return s ? Number(s) : null;
}

export async function createAppraisal(
  _prevState: AppraisalActionState,
  formData: FormData
): Promise<AppraisalActionState> {
  const address = String(formData.get("address") ?? "").trim();
  const suburb = String(formData.get("suburb") ?? "").trim() || null;
  const region = String(formData.get("region") ?? "").trim() || "Queenstown";

  if (!address) return { error: "Address is required." };

  const { data, error } = await supabaseAdmin
    .from("appraisals")
    .insert({
      address,
      suburb,
      region,
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
      vendor_name: String(formData.get("vendor_name") ?? "").trim() || null,
      vendor_email: String(formData.get("vendor_email") ?? "").trim() || null,
    })
    .select("id")
    .single();

  if (error || !data) return { error: "Could not save the appraisal. Please try again." };

  revalidatePath("/dashboard/appraisals");
  redirect(`/dashboard/appraisals/${data.id}`);
}
