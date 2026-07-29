import { supabaseAdmin } from "@/lib/supabase-admin";

export type UnfollowedContact = {
  email: string;
  fullName: string;
  lastVisit: string;
  listingId: string | null;
};

/**
 * A contact counts as "followed up" once either a completed follow-up task
 * or a sent automated follow-up email lands after their most recent open
 * home visit — so this only surfaces genuine gaps, not people the
 * templated email already reached.
 */
export async function getUnfollowedContacts(): Promise<UnfollowedContact[]> {
  const [{ data: checkins }, { data: doneFollowUps }, { data: sentEmails }] = await Promise.all([
    supabaseAdmin.from("checkins").select("email, full_name, created_at, listing_id").order("created_at", { ascending: false }),
    supabaseAdmin.from("follow_ups").select("contact_email, completed_at").eq("status", "done"),
    supabaseAdmin.from("emails").select("recipient_email, sent_at").eq("type", "followup").eq("status", "sent"),
  ]);

  const latestCheckinByEmail = new Map<string, { fullName: string; createdAt: string; listingId: string | null }>();
  for (const c of checkins ?? []) {
    if (!latestCheckinByEmail.has(c.email)) {
      latestCheckinByEmail.set(c.email, { fullName: c.full_name, createdAt: c.created_at, listingId: c.listing_id });
    }
  }

  const lastHandledByEmail = new Map<string, string>();
  for (const f of doneFollowUps ?? []) {
    if (!f.completed_at) continue;
    const existing = lastHandledByEmail.get(f.contact_email);
    if (!existing || f.completed_at > existing) lastHandledByEmail.set(f.contact_email, f.completed_at);
  }
  for (const e of sentEmails ?? []) {
    if (!e.sent_at) continue;
    const existing = lastHandledByEmail.get(e.recipient_email);
    if (!existing || e.sent_at > existing) lastHandledByEmail.set(e.recipient_email, e.sent_at);
  }

  const unfollowed: UnfollowedContact[] = [];
  for (const [email, checkin] of latestCheckinByEmail) {
    const lastHandled = lastHandledByEmail.get(email);
    if (!lastHandled || lastHandled < checkin.createdAt) {
      unfollowed.push({ email, fullName: checkin.fullName, lastVisit: checkin.createdAt, listingId: checkin.listingId });
    }
  }
  return unfollowed.sort((a, b) => new Date(a.lastVisit).getTime() - new Date(b.lastVisit).getTime());
}
