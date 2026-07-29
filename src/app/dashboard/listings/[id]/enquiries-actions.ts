"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { nzDayKey } from "@/lib/nz-time";

export type ActionState = { ok: boolean; error?: string };

/**
 * Seeds an enquiries row for every checkin that doesn't have one yet. Safe to
 * call on every page load — the unique index on checkin_id makes this a no-op
 * for attendees already represented.
 */
export async function syncEnquiriesFromCheckins(listingId: string) {
  const [{ data: checkins }, { data: existing }] = await Promise.all([
    supabaseAdmin.from("checkins").select("*").eq("listing_id", listingId),
    supabaseAdmin.from("enquiries").select("checkin_id").eq("listing_id", listingId).not("checkin_id", "is", null),
  ]);

  const seeded = new Set((existing ?? []).map((e) => e.checkin_id));
  const missing = (checkins ?? []).filter((c) => !seeded.has(c.id));
  if (missing.length === 0) return;

  await supabaseAdmin.from("enquiries").insert(
    missing.map((c) => ({
      listing_id: listingId,
      contact_date: nzDayKey(c.created_at),
      name: c.full_name,
      source: "Open home",
      comment: null,
      price_feedback: null,
      interest_status: c.interest === "Just looking" ? "unsure" : "interested",
      inspected: true,
      checkin_id: c.id,
    }))
  );
}

export async function addEnquiry(listingId: string, _prevState: ActionState, formData: FormData): Promise<ActionState> {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { ok: false, error: "Name is required." };

  const { error } = await supabaseAdmin.from("enquiries").insert({
    listing_id: listingId,
    contact_date: String(formData.get("contact_date") ?? "").trim() || new Date().toISOString().slice(0, 10),
    name,
    source: String(formData.get("source") ?? "").trim() || null,
    comment: String(formData.get("comment") ?? "").trim() || null,
    price_feedback: String(formData.get("price_feedback") ?? "").trim() || null,
    interest_status: String(formData.get("interest_status") ?? "unsure"),
    inspected: formData.get("inspected") === "on",
  });

  if (error) return { ok: false, error: "Could not save enquiry. Please try again." };

  revalidatePath(`/dashboard/listings/${listingId}`);
  return { ok: true };
}

export async function updateEnquiry(
  listingId: string,
  enquiryId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { ok: false, error: "Name is required." };

  const { error } = await supabaseAdmin
    .from("enquiries")
    .update({
      contact_date: String(formData.get("contact_date") ?? "").trim() || new Date().toISOString().slice(0, 10),
      name,
      source: String(formData.get("source") ?? "").trim() || null,
      comment: String(formData.get("comment") ?? "").trim() || null,
      price_feedback: String(formData.get("price_feedback") ?? "").trim() || null,
      interest_status: String(formData.get("interest_status") ?? "unsure"),
      inspected: formData.get("inspected") === "on",
    })
    .eq("id", enquiryId);

  if (error) return { ok: false, error: "Could not save enquiry. Please try again." };

  revalidatePath(`/dashboard/listings/${listingId}`);
  return { ok: true };
}

export async function deleteEnquiry(listingId: string, enquiryId: string) {
  await supabaseAdmin.from("enquiries").delete().eq("id", enquiryId);
  revalidatePath(`/dashboard/listings/${listingId}`);
}
