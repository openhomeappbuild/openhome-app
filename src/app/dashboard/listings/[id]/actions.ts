"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase-admin";

export type ActionState = { ok: boolean; error?: string };

export async function addOffer(
  listingId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const buyerName = String(formData.get("buyerName") ?? "").trim();
  const buyerEmail = String(formData.get("buyerEmail") ?? "").trim() || null;
  const amountRaw = String(formData.get("amount") ?? "").trim();
  const conditions = String(formData.get("conditions") ?? "").trim() || null;
  const expiryRaw = String(formData.get("expiry") ?? "").trim();
  const status = String(formData.get("status") ?? "indicated");

  if (!buyerName) return { ok: false, error: "Buyer name is required." };

  const { error } = await supabaseAdmin.from("offers").insert({
    listing_id: listingId,
    buyer_name: buyerName,
    buyer_email: buyerEmail,
    amount: amountRaw ? Number(amountRaw) : null,
    conditions,
    expiry: expiryRaw ? new Date(expiryRaw).toISOString() : null,
    status,
  });

  if (error) return { ok: false, error: "Could not save offer. Please try again." };

  revalidatePath(`/dashboard/listings/${listingId}`);
  return { ok: true };
}

const CATEGORIES = [
  "title",
  "lim",
  "builders_report",
  "consents",
  "floor_plan",
  "sale_agreement",
  "other",
];

export async function uploadDocument(
  listingId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const file = formData.get("file");
  const category = String(formData.get("category") ?? "other");

  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Please choose a file to upload." };
  }
  if (!CATEGORIES.includes(category)) {
    return { ok: false, error: "Invalid document category." };
  }

  const storagePath = `${listingId}/${Date.now()}-${file.name}`;
  const { error: uploadError } = await supabaseAdmin.storage
    .from("documents")
    .upload(storagePath, file, { contentType: file.type });

  if (uploadError) return { ok: false, error: "Upload failed. Please try again." };

  const { error: insertError } = await supabaseAdmin.from("documents").insert({
    listing_id: listingId,
    name: file.name,
    category,
    storage_path: storagePath,
    size_bytes: file.size,
  });

  if (insertError) return { ok: false, error: "Upload saved but the record failed. Contact support." };

  revalidatePath(`/dashboard/listings/${listingId}`);
  return { ok: true };
}

export async function updateVendorDetails(
  listingId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const vendorName = String(formData.get("vendor_name") ?? "").trim() || null;
  const vendorEmail = String(formData.get("vendor_email") ?? "").trim() || null;
  const descriptionNotes = String(formData.get("description_notes") ?? "").trim() || null;
  const areaNotes = String(formData.get("area_notes") ?? "").trim() || null;

  const { error } = await supabaseAdmin
    .from("listings")
    .update({
      vendor_name: vendorName,
      vendor_email: vendorEmail,
      description_notes: descriptionNotes,
      area_notes: areaNotes,
    })
    .eq("id", listingId);

  if (error) return { ok: false, error: "Could not save details. Please try again." };

  revalidatePath(`/dashboard/listings/${listingId}`);
  return { ok: true };
}
