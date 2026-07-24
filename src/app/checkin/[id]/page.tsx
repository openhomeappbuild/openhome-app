import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { CheckInForm } from "./checkin-form";

function formatOpenHomeWindow(start: string | null, end: string | null) {
  if (!start || !end) return null;
  const startDate = new Date(start);
  const endDate = new Date(end);
  const today = new Date();
  const isToday = startDate.toDateString() === today.toDateString();
  const time = (d: Date) =>
    d.toLocaleTimeString("en-NZ", { hour: "numeric", minute: "2-digit" }).replace(" ", "");
  const day = isToday
    ? "today"
    : startDate.toLocaleDateString("en-NZ", { weekday: "long", day: "numeric", month: "long" });
  return `Open home ${day} ${time(startDate)}–${time(endDate)}`;
}

function formatSaleMethod(method: string | null, date: string | null) {
  if (!method) return null;
  if (!date) return method;
  const d = new Date(date).toLocaleDateString("en-NZ", { day: "numeric", month: "short" });
  return `${method} — ${d}`;
}

export default async function CheckInPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ kiosk?: string }>;
}) {
  const { id } = await params;
  const { kiosk } = await searchParams;

  const { data: listing } = await supabase
    .from("listings")
    .select("*")
    .eq("id", id)
    .eq("status", "active")
    .single();

  if (!listing) notFound();

  const chips = [
    listing.bedrooms ? `${listing.bedrooms} bed` : null,
    listing.bathrooms ? `${listing.bathrooms} bath` : null,
    listing.car_spaces ? `${listing.car_spaces} car` : null,
    formatSaleMethod(listing.sale_method, listing.sale_method_date),
  ].filter(Boolean) as string[];

  const openHomeLine = formatOpenHomeWindow(listing.open_home_start, listing.open_home_end);

  return (
    <main className="flex min-h-full flex-1 items-start justify-center bg-[#eef1f5] py-0 sm:py-8">
      <div className="flex w-full max-w-md flex-col bg-[#eef1f5] sm:overflow-hidden sm:rounded-[26px] sm:shadow-2xl">
        <div className="relative bg-gradient-to-br from-[#0a0a0a] to-[#222] px-6 pb-5 pt-7 text-white">
          <div className="mb-3 flex items-center gap-2.5 text-xs uppercase tracking-wider text-[#9fb3c8]">
            <span>{listing.agent_name}</span>
          </div>
          {kiosk === "1" && (
            <span className="absolute right-5 top-5 rounded-full bg-white px-2.5 py-1 text-[11px] tracking-wide text-[#111]">
              KIOSK MODE
            </span>
          )}
          <h1 className="text-xl font-bold leading-snug">{listing.address}</h1>
          <div className="mt-1 text-[13px] text-[#b9c6d4]">
            {listing.suburb} {listing.postcode ?? ""}
            {openHomeLine ? ` · ${openHomeLine}` : ""}
          </div>
          {chips.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {chips.map((chip) => (
                <span key={chip} className="rounded-full bg-white/15 px-2.5 py-1 text-[11.5px]">
                  {chip}
                </span>
              ))}
            </div>
          )}
        </div>

        <CheckInForm listingId={listing.id} kiosk={kiosk === "1"} />
      </div>
    </main>
  );
}
