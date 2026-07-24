import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { formatNZDate, nzDayKey } from "@/lib/nz-time";

export const dynamic = "force-dynamic";

const GRADIENTS = [
  "from-[#31597c] to-[#16283f]",
  "from-[#7c5a31] to-[#3f2d16]",
  "from-[#317c5c] to-[#163f2d]",
  "from-[#5c317c] to-[#2d163f]",
];

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
      <h1 className="mb-1 text-[22px] font-bold">Listings</h1>
      <p className="mb-6 text-[13.5px] text-[#6b7787]">
        {listings?.length ?? 0} active · click a listing to open its file
      </p>

      <div className="grid gap-4 md:grid-cols-2">
        {(listings ?? []).map((listing, i) => {
          const stats = statsByListing.get(listing.id);
          return (
            <Link
              key={listing.id}
              href={`/dashboard/listings/${listing.id}`}
              className="block overflow-hidden rounded-2xl border border-[#e2e7ed] bg-white transition-shadow hover:shadow-lg"
            >
              <div
                className={`flex h-[110px] items-end bg-gradient-to-br p-3 text-[34px] text-white ${
                  GRADIENTS[i % GRADIENTS.length]
                }`}
              >
                🏡
              </div>
              <div className="p-4">
                <div className="text-[15px] font-bold">{listing.address}</div>
                <div className="my-1 text-xs text-[#6b7787]">
                  {listing.bedrooms ? `${listing.bedrooms} bed · ` : ""}
                  {listing.bathrooms ? `${listing.bathrooms} bath · ` : ""}
                  {listing.car_spaces ? `${listing.car_spaces} car` : ""}
                </div>
                <div className="flex justify-between text-xs text-[#43505e]">
                  <span>
                    {listing.sale_method}
                    {listing.sale_method_date
                      ? ` — ${formatNZDate(listing.sale_method_date, { day: "numeric", month: "short", year: "numeric" })}`
                      : ""}
                  </span>
                  <b>
                    {stats ? `${stats.openHomes.size} open home${stats.openHomes.size === 1 ? "" : "s"} · ${stats.attendees} attendees` : "No attendees yet"}
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
