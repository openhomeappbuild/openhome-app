import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { formatNZDate, nzDayKey } from "@/lib/nz-time";

export const dynamic = "force-dynamic";

export default async function ListingsPage() {
  const { data: listings } = await supabaseAdmin
    .from("listings")
    .select("*")
    .order("created_at", { ascending: false });

  const { data: checkins } = await supabaseAdmin.from("checkins").select("listing_id, created_at");

  const statsByListing = new Map<string, { attendees: number; openHomes: Set<string> }>();
  for (const c of checkins ?? []) {
    const entry = statsByListing.get(c.listing_id) ?? { attendees: 0, openHomes: new Set<string>() };
    entry.attendees += 1;
    entry.openHomes.add(nzDayKey(c.created_at));
    statsByListing.set(c.listing_id, entry);
  }

  return (
    <div>
      <h1 className="font-display mb-1 text-[26px] font-semibold tracking-tight">Listings</h1>
      <p className="mb-8 text-[13.5px] text-[#837c6c]">
        {listings?.length ?? 0} active · click a listing to open its file
      </p>

      <div className="grid gap-4 md:grid-cols-2">
        {(listings ?? []).map((listing, i) => {
          const stats = statsByListing.get(listing.id);
          return (
            <Link
              key={listing.id}
              href={`/dashboard/listings/${listing.id}`}
              className="block overflow-hidden rounded-lg border border-[#e7e2d4] bg-white transition-colors hover:border-[#14130f]"
            >
              <div className="relative flex h-[86px] items-center justify-between bg-[#14130f] px-5">
                <span className="font-display text-[28px] text-white/25">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-white">
                  {listing.sale_method}
                </span>
              </div>
              <div className="p-4">
                <div className="text-[15px] font-bold">{listing.address}</div>
                <div className="my-1 text-xs text-[#837c6c]">
                  {listing.bedrooms ? `${listing.bedrooms} bed · ` : ""}
                  {listing.bathrooms ? `${listing.bathrooms} bath · ` : ""}
                  {listing.car_spaces ? `${listing.car_spaces} car` : ""}
                </div>
                <div className="flex justify-between border-t border-[#eee9dc] pt-2.5 text-xs text-[#524d40]">
                  <span>
                    {listing.sale_method_date
                      ? `Closes ${formatNZDate(listing.sale_method_date, { day: "numeric", month: "short", year: "numeric" })}`
                      : ""}
                  </span>
                  <b>
                    {stats
                      ? `${stats.openHomes.size} open home${stats.openHomes.size === 1 ? "" : "s"} · ${stats.attendees} attendees`
                      : "No attendees yet"}
                  </b>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
