import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { formatNZDate, formatNZTime, nzDayKey } from "@/lib/nz-time";
import { getUnfollowedContacts } from "@/lib/followups";
import { Stat, Panel, Empty, Pill } from "./ui";

export const dynamic = "force-dynamic";

function startOfMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
}

export default async function DashboardHomePage() {
  const today = nzDayKey(new Date());

  const [{ count: activeListings }, { data: monthCheckins }, { data: allCheckins }, { data: offers }, { data: followUps }, unfollowed] =
    await Promise.all([
      supabaseAdmin.from("listings").select("*", { count: "exact", head: true }).eq("status", "active"),
      supabaseAdmin.from("checkins").select("id").gte("created_at", startOfMonth()),
      supabaseAdmin.from("checkins").select("email, consent"),
      supabaseAdmin.from("offers").select("id, buyer_name, amount, expiry, status, listing_id"),
      supabaseAdmin.from("follow_ups").select("*").eq("status", "outstanding").order("due_date", { ascending: true }),
      getUnfollowedContacts(),
    ]);

  const dueFollowUps = (followUps ?? []).filter((f) => f.due_date <= today);

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

  const attentionItems: { text: string; pill: string; tone: "red" | "amber" }[] = [];
  for (const offer of openOffers) {
    const addr = listingAddress.get(offer.listing_id) ?? "a listing";
    const urgent = offer.expiry && new Date(offer.expiry).getTime() - Date.now() < 1000 * 60 * 60 * 48;
    attentionItems.push({
      text: `Offer from ${offer.buyer_name} on ${addr}${
        offer.amount ? ` — $${Number(offer.amount).toLocaleString()}` : ""
      }`,
      pill: urgent ? "Urgent" : "With vendor",
      tone: urgent ? "red" : "amber",
    });
  }

  const stats = [
    { n: activeListings ?? 0, l: "Active listings" },
    { n: monthCheckins?.length ?? 0, l: "Attendees this month" },
    { n: consentedEmails.size, l: "Contacts in database" },
    { n: openOffers.length, l: "Offers awaiting response" },
  ];

  return (
    <div>
      <h1 className="font-display mb-1 text-[26px] font-semibold tracking-tight">Good morning, Chris</h1>
      <p className="mb-8 text-[13.5px] text-[#837c6c]">
        {formatNZDate(new Date(), { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
      </p>

      <div className="mb-9 grid grid-cols-2 gap-6 md:grid-cols-4">
        {stats.map((s) => (
          <Stat key={s.l} n={s.n} l={s.l} />
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Panel title="Needs your attention">
          {attentionItems.length === 0 ? (
            <Empty text="Nothing needs attention right now." />
          ) : (
            <table className="w-full text-[13px]">
              <tbody>
                {attentionItems.map((item, i) => (
                  <tr key={i} className="border-b border-[#eef1f5] last:border-none">
                    <td className="py-2.5 pr-3">{item.text}</td>
                    <td className="py-2.5 text-right">
                      <Pill tone={item.tone}>{item.pill}</Pill>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>

        <Panel title="Upcoming open homes">
          {(upcomingListings ?? []).length === 0 ? (
            <Empty text="No open homes scheduled." />
          ) : (
            <table className="w-full text-[13px]">
              <tbody>
                {upcomingListings!.map((l) => (
                  <tr key={l.id} className="border-b border-[#eef1f5] last:border-none">
                    <td className="py-2.5 pr-3">
                      <b>{l.address}</b>
                      <br />
                      <span className="text-[#837c6c]">
                        {formatNZDate(l.open_home_start!, { weekday: "short", day: "numeric", month: "short" })},{" "}
                        {formatNZTime(l.open_home_start!)}–{formatNZTime(l.open_home_end!)}
                      </span>
                    </td>
                    <td className="py-2.5 text-right">
                      <Link href={`/checkin/${l.id}`}>
                        <Pill tone="slate">Check-in ready</Pill>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Panel
          title={`Outstanding calls (${dueFollowUps.filter((f) => f.type === "call").length})`}
          action={
            <Link href="/dashboard/schedule" className="text-xs font-semibold text-[#14130f] underline">
              Open schedule
            </Link>
          }
        >
          {dueFollowUps.length === 0 ? (
            <Empty text="No calls or emails due today." />
          ) : (
            <table className="w-full text-[13px]">
              <tbody>
                {dueFollowUps.slice(0, 6).map((f) => (
                  <tr key={f.id} className="border-b border-[#eef1f5] last:border-none">
                    <td className="py-2.5 pr-3">
                      <b>{f.contact_name || f.contact_email}</b>
                      {f.reason && <div className="text-[#837c6c]">{f.reason}</div>}
                    </td>
                    <td className="py-2.5 text-right">
                      <Pill tone={f.due_date < today ? "red" : "amber"}>
                        {f.type === "call" ? "Call" : "Email"} {f.due_date < today ? "overdue" : "today"}
                      </Pill>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>

        <Panel
          title={`Not yet followed up (${unfollowed.length})`}
          action={
            <Link href="/dashboard/schedule" className="text-xs font-semibold text-[#14130f] underline">
              Open schedule
            </Link>
          }
        >
          {unfollowed.length === 0 ? (
            <Empty text="Everyone who's visited has been followed up on." />
          ) : (
            <table className="w-full text-[13px]">
              <tbody>
                {unfollowed.slice(0, 6).map((c) => (
                  <tr key={c.email} className="border-b border-[#eef1f5] last:border-none">
                    <td className="py-2.5 pr-3">
                      <b>{c.fullName}</b>
                      <div className="text-[#837c6c]">{c.email}</div>
                    </td>
                    <td className="py-2.5 text-right text-[#837c6c]">
                      {formatNZDate(c.lastVisit, { day: "numeric", month: "short" })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>
      </div>
    </div>
  );
}
