"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { nzDayKey } from "@/lib/nz-time";
import { buildFollowupEmail, buildSellerReportEmail } from "@/lib/email-templates";
import { getResendClient, EMAIL_FROM } from "@/lib/resend";

export type EmailActionState = { error?: string; info?: string };

async function getAppUrl() {
  const h = await headers();
  const host = h.get("host");
  const proto = host?.startsWith("localhost") ? "http" : "https";
  return `${proto}://${host}`;
}

async function batchAlreadySent(listingId: string, dayKey: string, type: string) {
  const { count } = await supabaseAdmin
    .from("emails")
    .select("*", { count: "exact", head: true })
    .eq("listing_id", listingId)
    .eq("open_home_day", dayKey)
    .eq("type", type)
    .eq("status", "sent");
  return (count ?? 0) > 0;
}

export async function generateFollowupDrafts(
  listingId: string,
  dayKey: string,
  _prevState: EmailActionState,
  _formData: FormData
): Promise<EmailActionState> {
  if (await batchAlreadySent(listingId, dayKey, "followup")) {
    return { error: "Follow-up emails for this open home have already been sent." };
  }

  const { data: listing } = await supabaseAdmin.from("listings").select("*").eq("id", listingId).single();
  if (!listing) return { error: "Listing not found." };

  const { data: allCheckins } = await supabaseAdmin
    .from("checkins")
    .select("full_name, email, created_at")
    .eq("listing_id", listingId);

  const dayCheckins = (allCheckins ?? []).filter((c) => nzDayKey(c.created_at) === dayKey);
  if (dayCheckins.length === 0) return { error: "No attendees found for that open home." };

  const { data: unsubbed } = await supabaseAdmin.from("unsubscribed_emails").select("email");
  const unsubscribedSet = new Set((unsubbed ?? []).map((u) => u.email));

  const recipients = dayCheckins.filter((c) => !unsubscribedSet.has(c.email));
  if (recipients.length === 0) return { error: "All attendees from this open home have unsubscribed." };

  const { data: similarListings } = await supabaseAdmin
    .from("listings")
    .select("id, address, bedrooms, sale_method")
    .neq("id", listingId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(2);

  const appUrl = await getAppUrl();

  await supabaseAdmin.from("emails").delete().eq("listing_id", listingId).eq("open_home_day", dayKey).eq("type", "followup").eq("status", "draft");

  const rows = recipients.map((c) => {
    const firstName = c.full_name.split(" ")[0];
    const { subject, html } = buildFollowupEmail({
      listing,
      firstName,
      email: c.email,
      dayKey,
      similarListings: similarListings ?? [],
      appUrl,
    });
    return {
      listing_id: listingId,
      type: "followup",
      open_home_day: dayKey,
      recipient_email: c.email,
      recipient_name: c.full_name,
      subject,
      body_html: html,
      status: "draft",
    };
  });

  const { error } = await supabaseAdmin.from("emails").insert(rows);
  if (error) return { error: "Could not save drafts. Please try again." };

  revalidatePath(`/dashboard/listings/${listingId}`);
  revalidatePath("/dashboard/emails");
  return { info: `${rows.length} follow-up draft${rows.length === 1 ? "" : "s"} ready to review.` };
}

export async function generateSellerReportDraft(
  listingId: string,
  dayKey: string,
  _prevState: EmailActionState,
  _formData: FormData
): Promise<EmailActionState> {
  if (await batchAlreadySent(listingId, dayKey, "seller_report")) {
    return { error: "The seller report for this open home has already been sent." };
  }

  const { data: listing } = await supabaseAdmin.from("listings").select("*").eq("id", listingId).single();
  if (!listing) return { error: "Listing not found." };
  if (!listing.vendor_email) {
    return { error: "Add the vendor's email address in the listing details before drafting a report." };
  }

  const { data: allCheckins } = await supabaseAdmin
    .from("checkins")
    .select("email, is_local, consent, created_at")
    .eq("listing_id", listingId);

  const dayCheckins = (allCheckins ?? []).filter((c) => nzDayKey(c.created_at) === dayKey);
  if (dayCheckins.length === 0) return { error: "No attendees found for that open home." };

  const visitsByEmail = new Map<string, number>();
  for (const c of allCheckins ?? []) visitsByEmail.set(c.email, (visitsByEmail.get(c.email) ?? 0) + 1);

  const stats = {
    total: dayCheckins.length,
    local: dayCheckins.filter((c) => c.is_local).length,
    outOfArea: dayCheckins.filter((c) => !c.is_local).length,
    repeat: dayCheckins.filter((c) => (visitsByEmail.get(c.email) ?? 1) >= 2).length,
    consented: dayCheckins.filter((c) => c.consent).length,
  };

  const appUrl = await getAppUrl();
  const { subject, html } = buildSellerReportEmail({ listing, dayKey, stats, appUrl });

  await supabaseAdmin.from("emails").delete().eq("listing_id", listingId).eq("open_home_day", dayKey).eq("type", "seller_report").eq("status", "draft");

  const { error } = await supabaseAdmin.from("emails").insert({
    listing_id: listingId,
    type: "seller_report",
    open_home_day: dayKey,
    recipient_email: listing.vendor_email,
    recipient_name: listing.vendor_name,
    subject,
    body_html: html,
    status: "draft",
  });
  if (error) return { error: "Could not save the draft. Please try again." };

  revalidatePath(`/dashboard/listings/${listingId}`);
  revalidatePath("/dashboard/emails");
  return { info: "Seller report drafted." };
}

export async function sendEmailBatch(
  listingId: string,
  dayKey: string,
  type: string,
  _prevState: EmailActionState,
  _formData: FormData
): Promise<EmailActionState> {
  const { data: drafts } = await supabaseAdmin
    .from("emails")
    .select("*")
    .eq("listing_id", listingId)
    .eq("open_home_day", dayKey)
    .eq("type", type)
    .eq("status", "draft");

  if (!drafts || drafts.length === 0) return { error: "No drafts to send." };

  const resend = getResendClient();
  if (!resend) {
    return { error: "Email sending isn't configured yet — add RESEND_API_KEY to enable sending." };
  }

  const appUrl = await getAppUrl();

  let sent = 0;
  for (const draft of drafts) {
    const pixel = `<img src="${appUrl}/api/track/${draft.id}" width="1" height="1" alt="" style="display:block;border:0;" />`;
    const { error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: draft.recipient_email,
      subject: draft.subject,
      html: draft.body_html + pixel,
    });
    if (error) {
      await supabaseAdmin.from("emails").update({ status: "failed", error: error.message }).eq("id", draft.id);
    } else {
      await supabaseAdmin.from("emails").update({ status: "sent", sent_at: new Date().toISOString() }).eq("id", draft.id);
      sent += 1;
    }
  }

  revalidatePath(`/dashboard/listings/${listingId}`);
  revalidatePath("/dashboard/emails");

  if (sent === 0) return { error: "All sends failed. Check your Resend configuration." };
  if (sent < drafts.length) return { info: `Sent ${sent} of ${drafts.length} — some failed, see history.` };
  return { info: `Sent to ${sent} recipient${sent === 1 ? "" : "s"}.` };
}
