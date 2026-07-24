import { redirect, notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function CheckInIndexPage() {
  const { data: listing } = await supabase
    .from("listings")
    .select("id")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!listing) notFound();
  redirect(`/checkin/${listing.id}`);
}
