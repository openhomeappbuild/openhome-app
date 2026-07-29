import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { computeTier, type Tier } from "@/lib/tier";
import { formatNZDate } from "@/lib/nz-time";
import { buildVendorReportPdf } from "@/lib/pdf/vendor-report";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const formData = await request.formData();

  const periodStart = String(formData.get("period_start") ?? "").trim();
  const periodEnd = String(formData.get("period_end") ?? "").trim();
  const campaignNote = String(formData.get("campaign_note") ?? "").trim();
  const portalFileEntries = formData.getAll("portal_files").filter((f): f is File => f instanceof File && f.size > 0);

  if (!periodStart || !periodEnd || !campaignNote) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }

  const [{ data: listing }, { data: enquiries }, { data: checkins }, { data: offers }] = await Promise.all([
    supabaseAdmin.from("listings").select("*").eq("id", id).single(),
    supabaseAdmin.from("enquiries").select("*").eq("listing_id", id).order("contact_date", { ascending: true }),
    supabaseAdmin.from("checkins").select("*").eq("listing_id", id),
    supabaseAdmin.from("offers").select("buyer_email").eq("listing_id", id),
  ]);

  if (!listing) return NextResponse.json({ error: "Listing not found." }, { status: 404 });

  let photo: { bytes: Uint8Array; contentType: string } | null = null;
  if (listing.photo_storage_path) {
    const { data: photoBlob } = await supabaseAdmin.storage.from("documents").download(listing.photo_storage_path);
    if (photoBlob) {
      const arrayBuffer = await photoBlob.arrayBuffer();
      photo = { bytes: new Uint8Array(arrayBuffer), contentType: photoBlob.type || "image/jpeg" };
    }
  }

  const offerEmails = new Set((offers ?? []).map((o) => o.buyer_email).filter(Boolean));
  const visitsByEmail = new Map<string, number>();
  for (const c of checkins ?? []) visitsByEmail.set(c.email, (visitsByEmail.get(c.email) ?? 0) + 1);

  const tierCounts: Record<Tier, number> = { AAA: 0, AA: 0, A: 0, B: 0, C: 0 };
  let localGroups = 0;
  for (const c of checkins ?? []) {
    if (c.is_local) localGroups += 1;
    const tier = computeTier({
      visitCount: visitsByEmail.get(c.email) ?? 1,
      isLocal: c.is_local,
      hasOffer: offerEmails.has(c.email),
      interest: c.interest,
    }) as Tier;
    tierCounts[tier] += 1;
  }
  const totalGroups = (checkins ?? []).length;

  const listedDate = new Date(listing.created_at);
  const endDate = new Date(`${periodEnd}T00:00:00Z`);
  const daysOnMarket = Math.max(0, Math.round((endDate.getTime() - listedDate.getTime()) / (1000 * 60 * 60 * 24)));

  const portalFiles = await Promise.all(
    portalFileEntries.map(async (f) => ({ bytes: new Uint8Array(await f.arrayBuffer()) }))
  );

  const pdfBytes = await buildVendorReportPdf({
    address: listing.address,
    suburb: listing.suburb,
    region: listing.region,
    vendorName: listing.vendor_name,
    saleMethod: listing.sale_method,
    listingUrl: listing.listing_url,
    agentName: listing.agent_name,
    agentPhone: listing.agent_phone,
    agentEmail: listing.agent_email,
    photo,
    periodStartLabel: formatNZDate(`${periodStart}T00:00:00Z`, { day: "numeric", month: "short", year: "numeric" }),
    periodEndLabel: formatNZDate(`${periodEnd}T00:00:00Z`, { day: "numeric", month: "short", year: "numeric" }),
    reportDateLabel: formatNZDate(new Date(), { day: "numeric", month: "long", year: "numeric" }),
    daysOnMarket,
    campaignNote,
    enquiries: (enquiries ?? []).map((e) => ({
      contact_date: e.contact_date,
      name: e.name,
      source: e.source,
      comment: e.comment,
      price_feedback: e.price_feedback,
      interest_status: e.interest_status,
      inspected: e.inspected,
    })),
    attendance: {
      totalGroups,
      localGroups,
      outOfAreaGroups: totalGroups - localGroups,
      tierCounts,
    },
    portalFiles,
  });

  const fileName = `Vendor report - ${listing.address}.pdf`.replace(/[/\\]/g, "-");

  return new NextResponse(Buffer.from(pdfBytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}
