import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

function startOfMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
}

export default async function DashboardHomePage() {
  const [{ count: activeListings }, { data: monthCheckins }, { data: allCheckins }, { data: offers }] =
    await Promise.all([
      supabaseAdmin.from("listings").select("*", { count: "exact", head: true }).eq("status", "active"),
      supabaseAdmin.from("checkins").select("id").gte("created_at", startOfMonth()),
      supabaseAdmin.from("checkins").select("email, consent"),
      supabaseAdmin.from("offers").select("id, buyer_name, amount, expiry, status, listing_id"),
    ]);

  const consentedEmails = new Set(
    (allCheckins ?? []).filter((c) => c.consent).map((c) => c.email)
  );
  const openOffers = (offers ?? []).filter((o) => o.status === "indicated" || o.status === "with_vendor");

  const { data: listingsById } = await supabaseAdmin.from("listings").select("id, address");
  const listingAddress = new Map((listingsById ?? []).map((l) => [l.id, l.address]));

  const { data: upcomingListings } = await supabaseAdmin
    .from("listings")
    .select("id, address, suburb, open_home_start, open_home_end")
    .eq("status", "active")
    .not("open_home_start", "is", null)
    .order("open_home_start", { ascending: true });

  const attentionItems: { text: string; pill: string; pillClass: string }[] = [];
  for (const offer of openOffers) {
    const addr = listingAddress.get(offer.listing_id) ?? "a listing";
    const urgent = offer.expiry && new Date(offer.expiry).getTime() - Date.now() < 1000 * 60 * 60 * 48;
    attentionItems.push({
      text: `Offer from ${offer.buyer_name} on ${addr}${
        offer.amount ? ` — $${Number(offer.amount).toLocaleString()}` : ""
      }`,
      pill: urgent ? "Urgent" : "With vendor",
      pillClass: urgent ? "bg-[#fae5e2] text-[#c0392b]" : "bg-[#faf0dd] text-[#b7791f]",
    });
  }

  const stats = [
    { n: activeListings ?? 0, l: "Active listings" },
    { n: monthCheckins?.length ?? 0, l: "Open home attendees (this month)" },
    { n: consentedEmails.size, l: "Contacts in database" },
    { n: openOffers.length, l: "Offers awaiting response" },
  ];

  return (
    <div>
      <h1 className="mb-1 text-[22px] font-bold">Good morning, Chris</h1>
      <p className="mb-6 text-[13.5px] text-[#6b7787]">
        {new Date().toLocaleDateString("en-NZ", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
      </p>

      <div className="mb-6 grid grid-cols-2 gap-3.5 md:grid-cols-4">
        {stats.map((s) => (
          <div key={s.l} className="rounded-xl border border-[#e2e7ed] bg-white p-4">
            <div className="text-[26px] font-bold">{s.n}</div>
            <div className="mt-0.5 text-xs text-[#6b7787]">{s.l}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-[#e2e7ed] bg-white p-5">
          <h3 className="mb-3 text-[15px] font-semibold">Needs your attention</h3>
          {attentionItems.length === 0 ? (
            <p className="text-sm text-[#6b7787]">Nothing needs attention right now.</p>
          ) : (
            <table className="w-full text-[13px]">
              <tbody>
                {attentionItems.map((item, i) => (
                  <tr key={i} className="border-b border-[#eef1f5] last:border-none">
                    <td className="py-2.5 pr-3">{item.text}</td>
                    <td className="py-2.5 text-right">
                      <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${item.pillClass}`}>
                        {item.pill}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="rounded-xl border border-[#e2e7ed] bg-white p-5">
          <h3 className="mb-3 text-[15px] font-semibold">Upcoming open homes</h3>
          {(upcomingListings ?? []).length === 0 ? (
            <p className="text-sm text-[#6b7787]">No open homes scheduled.</p>
          ) : (
            <table className="w-full text-[13px]">
              <tbody>
                {upcomingListings!.map((l) => (
                  <tr key={l.id} className="border-b border-[#eef1f5] last:border-none">
                    <td className="py-2.5 pr-3">
                      <b>{l.address}</b>
                      <br />
                      <span className="text-[#6b7787]">
                        {new Date(l.open_home_start!).toLocaleDateString("en-NZ", {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                        })}
                        ,{" "}
                        {new Date(l.open_home_start!).toLocaleTimeString("en-NZ", {
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                        –
                        {new Date(l.open_home_end!).toLocaleTimeString("en-NZ", {
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </span>
                    </td>
                    <td className="py-2.5 text-right">
                      <Link
                        href={`/checkin/${l.id}`}
                        className="rounded-full bg-[#ececec] px-2.5 py-0.5 text-[11px] font-semibold text-[#111]"
                      >
                        Check-in ready
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
