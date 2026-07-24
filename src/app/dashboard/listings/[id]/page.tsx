import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { computeTier, type Tier } from "@/lib/tier";
import { nzDayKey } from "@/lib/nz-time";
import { PropertyTabs } from "./property-tabs";

type Checkin = {
  id: string;
  created_at: string;
  listing_id: string;
  full_name: string;
  mobile: string;
  email: string;
  is_local: boolean;
  suburb: string | null;
  interest: string;
  consent: boolean;
};

export default async function PropertyFilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [{ data: listing }, { data: checkins }, { data: offers }, { data: documents }] = await Promise.all([
    supabaseAdmin.from("listings").select("*").eq("id", id).single(),
    supabaseAdmin
      .from("checkins")
      .select("*")
      .eq("listing_id", id)
      .order("created_at", { ascending: true }),
    supabaseAdmin
      .from("offers")
      .select("*")
      .eq("listing_id", id)
      .order("created_at", { ascending: false }),
    supabaseAdmin
      .from("documents")
      .select("*")
      .eq("listing_id", id)
      .order("created_at", { ascending: false }),
  ]);

  if (!listing) notFound();

  const allCheckins = (checkins ?? []) as Checkin[];
  const offerEmails = new Set((offers ?? []).map((o) => o.buyer_email).filter(Boolean));
  const visitsByEmail = new Map<string, number>();
  for (const c of allCheckins) visitsByEmail.set(c.email, (visitsByEmail.get(c.email) ?? 0) + 1);

  const attendeesWithTier: (Checkin & { tier: Tier })[] = allCheckins.map((c) => ({
    ...c,
    tier: computeTier({
      visitCount: visitsByEmail.get(c.email) ?? 1,
      isLocal: c.is_local,
      hasOffer: offerEmails.has(c.email),
      interest: c.interest,
    }) as Tier,
  }));

  const totalAttendees = allCheckins.length;
  const localCount = allCheckins.filter((c) => c.is_local).length;
  const consentCount = allCheckins.filter((c) => c.consent).length;
  const repeatCount = Array.from(visitsByEmail.values()).filter((v) => v >= 2).length;

  const tierCounts: Record<Tier, number> = { AAA: 0, AA: 0, A: 0, B: 0, C: 0 };
  for (const a of attendeesWithTier) tierCounts[a.tier] += 1;

  const dayMap = new Map<string, typeof attendeesWithTier>();
  for (const a of attendeesWithTier) {
    const day = nzDayKey(a.created_at);
    dayMap.set(day, [...(dayMap.get(day) ?? []), a]);
  }
  const openHomeDays = Array.from(dayMap.entries())
    .map(([day, attendees]) => ({ day, attendees }))
    .sort((a, b) => b.day.localeCompare(a.day));

  const documentsWithUrls = await Promise.all(
    (documents ?? []).map(async (doc) => {
      const { data } = await supabaseAdmin.storage
        .from("documents")
        .createSignedUrl(doc.storage_path, 60 * 10);
      return { ...doc, url: data?.signedUrl ?? null };
    })
  );

  return (
    <PropertyTabs
      listing={listing}
      stats={{ totalAttendees, localCount, consentCount, repeatCount, tierCounts }}
      openHomeDays={openHomeDays}
      offers={offers ?? []}
      documents={documentsWithUrls}
    />
  );
}
