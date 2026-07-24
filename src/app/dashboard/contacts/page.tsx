import { supabaseAdmin } from "@/lib/supabase-admin";
import { computeTier, TIER_STYLES, type Tier } from "@/lib/tier";
import { formatNZDate } from "@/lib/nz-time";

export const dynamic = "force-dynamic";

export default async function ContactsPage() {
  const [{ data: checkins }, { data: listings }, { data: offers }] = await Promise.all([
    supabaseAdmin.from("checkins").select("*").order("created_at", { ascending: true }),
    supabaseAdmin.from("listings").select("id, address"),
    supabaseAdmin.from("offers").select("buyer_email"),
  ]);

  const listingAddress = new Map((listings ?? []).map((l) => [l.id, l.address]));
  const offerEmails = new Set((offers ?? []).map((o) => o.buyer_email).filter(Boolean));

  type Contact = {
    email: string;
    fullName: string;
    mobile: string;
    isLocal: boolean;
    suburb: string | null;
    consent: boolean;
    interest: string;
    source: string;
    addedAt: string;
    visitCount: number;
    tier: Tier;
  };

  const byEmail = new Map<string, Contact>();
  for (const c of checkins ?? []) {
    const existing = byEmail.get(c.email);
    if (!existing) {
      byEmail.set(c.email, {
        email: c.email,
        fullName: c.full_name,
        mobile: c.mobile,
        isLocal: c.is_local,
        suburb: c.suburb,
        consent: c.consent,
        interest: c.interest,
        source: listingAddress.get(c.listing_id) ?? "Open home",
        addedAt: c.created_at,
        visitCount: 1,
        tier: "C",
      });
    } else {
      existing.visitCount += 1;
      existing.fullName = c.full_name;
      existing.isLocal = c.is_local;
      existing.suburb = c.suburb;
      existing.consent = c.consent;
      existing.interest = c.interest;
    }
  }

  const contacts = Array.from(byEmail.values())
    .map((c) => ({
      ...c,
      tier: computeTier({
        visitCount: c.visitCount,
        isLocal: c.isLocal,
        hasOffer: offerEmails.has(c.email),
        interest: c.interest,
      }),
    }))
    .sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime());

  const subscriberCount = contacts.filter((c) => c.consent).length;

  return (
    <div>
      <h1 className="mb-1 text-[22px] font-bold">Contacts database</h1>
      <p className="mb-6 text-[13.5px] text-[#6b7787]">
        {contacts.length} contacts · {subscriberCount} newsletter subscribers · grown automatically from open home
        sign-ins (with consent)
      </p>

      <div className="rounded-xl border border-[#e2e7ed] bg-white p-5">
        <h3 className="mb-3 text-[15px] font-semibold">All contacts</h3>
        {contacts.length === 0 ? (
          <p className="text-sm text-[#6b7787]">No contacts yet — they'll appear here as attendees check in.</p>
        ) : (
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[#e2e7ed] text-left text-[11px] uppercase tracking-wide text-[#6b7787]">
                <th className="pb-2">Tier</th>
                <th className="pb-2">Name</th>
                <th className="pb-2">Source</th>
                <th className="pb-2">Local?</th>
                <th className="pb-2">Newsletter</th>
                <th className="pb-2">Interested in</th>
                <th className="pb-2">Added</th>
              </tr>
            </thead>
            <tbody>
              {contacts.map((c) => (
                <tr key={c.email} className="border-b border-[#eef1f5] last:border-none">
                  <td className="py-2.5 pr-2">
                    <span
                      className={`inline-block min-w-[34px] rounded px-2 py-0.5 text-center text-[11px] font-extrabold ${TIER_STYLES[c.tier]}`}
                    >
                      {c.tier}
                    </span>
                  </td>
                  <td className="py-2.5 pr-2">
                    <b>{c.fullName}</b>
                    <div className="text-[#6b7787]">{c.email}</div>
                  </td>
                  <td className="py-2.5 pr-2 text-[#43505e]">{c.source}</td>
                  <td className="py-2.5 pr-2">
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${c.isLocal ? "bg-[#e3f4ec] text-[#1e8e5a]" : "bg-[#edf0f4] text-[#6b7787]"}`}>
                      {c.isLocal ? c.suburb || "Local" : "Out of area"}
                    </span>
                  </td>
                  <td className="py-2.5 pr-2">
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${c.consent ? "bg-[#ececec] text-[#111]" : "bg-[#edf0f4] text-[#6b7787]"}`}>
                      {c.consent ? "Subscribed" : "Not subscribed"}
                    </span>
                  </td>
                  <td className="py-2.5 pr-2 text-[#43505e]">{c.interest}</td>
                  <td className="py-2.5 text-[#43505e]">
                    {formatNZDate(c.addedAt, { day: "numeric", month: "short" })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p className="mt-4 text-xs text-[#6b7787]">
          Only attendees who ticked the consent box at sign-in are added — Privacy Act 2020 compliant. Every email
          includes one-click unsubscribe.
        </p>
      </div>
    </div>
  );
}
