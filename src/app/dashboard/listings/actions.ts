"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { nzWallTimeToUTC } from "@/lib/nz-time";

export type AddListingState = { error?: string };

function toNullableInt(value: FormDataEntryValue | null) {
  const s = String(value ?? "").trim();
  return s ? Number(s) : null;
}

function toNullableDate(value: FormDataEntryValue | null) {
  const s = String(value ?? "").trim();
  return s || null;
}

export async function addListing(
  _prevState: AddListingState,
  formData: FormData
): Promise<AddListingState> {
  const address = String(formData.get("address") ?? "").trim();
  const suburb = String(formData.get("suburb") ?? "").trim();
  const region = String(formData.get("region") ?? "").trim() || "Queenstown";
  const postcode = String(formData.get("postcode") ?? "").trim() || null;
  const saleMethod = String(formData.get("sale_method") ?? "").trim() || null;
  const saleMethodDate = toNullableDate(formData.get("sale_method_date"));
  const openHomeStartRaw = String(formData.get("open_home_start") ?? "").trim();
  const openHomeEndRaw = String(formData.get("open_home_end") ?? "").trim();

  if (!address) return { error: "Address is required." };
  if (!suburb) return { error: "Suburb is required." };
  if (openHomeStartRaw && !openHomeEndRaw) {
    return { error: "Please also set an open home end time." };
  }

  const { data, error } = await supabaseAdmin
    .from("listings")
    .insert({
      address,
      suburb,
      region,
      postcode,
      bedrooms: toNullableInt(formData.get("bedrooms")),
      bathrooms: toNullableInt(formData.get("bathrooms")),
      car_spaces: toNullableInt(formData.get("car_spaces")),
      sale_method: saleMethod,
      sale_method_date: saleMethodDate,
      open_home_start: openHomeStartRaw ? nzWallTimeToUTC(openHomeStartRaw).toISOString() : null,
      open_home_end: openHomeEndRaw ? nzWallTimeToUTC(openHomeEndRaw).toISOString() : null,
      vendor_name: String(formData.get("vendor_name") ?? "").trim() || null,
      vendor_email: String(formData.get("vendor_email") ?? "").trim() || null,
    })
    .select("id")
    .single();

  if (error || !data) return { error: "Could not save the listing. Please try again." };

  revalidatePath("/dashboard/listings");
  revalidatePath("/dashboard");
  redirect(`/dashboard/listings/${data.id}`);
}
