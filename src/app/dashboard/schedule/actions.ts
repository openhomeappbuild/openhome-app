"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase-admin";

export type ActionState = { ok: boolean; error?: string };

function refresh() {
  revalidatePath("/dashboard/schedule");
  revalidatePath("/dashboard");
}

export async function createFollowUp(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const contactEmail = String(formData.get("contact_email") ?? "").trim();
  const contactName = String(formData.get("contact_name") ?? "").trim() || null;
  const type = String(formData.get("type") ?? "call");
  const reason = String(formData.get("reason") ?? "").trim() || null;
  const dueDate = String(formData.get("due_date") ?? "").trim() || new Date().toISOString().slice(0, 10);
  const listingId = String(formData.get("listing_id") ?? "").trim() || null;

  if (!contactEmail) return { ok: false, error: "An email address is required." };
  if (type !== "call" && type !== "email") return { ok: false, error: "Invalid follow-up type." };

  const { error } = await supabaseAdmin.from("follow_ups").insert({
    contact_email: contactEmail,
    contact_name: contactName,
    type,
    reason,
    due_date: dueDate,
    listing_id: listingId,
  });

  if (error) return { ok: false, error: "Could not save. Please try again." };
  refresh();
  return { ok: true };
}

export async function completeFollowUp(id: string) {
  await supabaseAdmin.from("follow_ups").update({ status: "done", completed_at: new Date().toISOString() }).eq("id", id);
  refresh();
}

export async function reopenFollowUp(id: string) {
  await supabaseAdmin.from("follow_ups").update({ status: "outstanding", completed_at: null }).eq("id", id);
  refresh();
}

export async function rescheduleFollowUp(id: string, dueDate: string) {
  await supabaseAdmin.from("follow_ups").update({ due_date: dueDate }).eq("id", id);
  refresh();
}

export async function deleteFollowUp(id: string) {
  await supabaseAdmin.from("follow_ups").delete().eq("id", id);
  refresh();
}
