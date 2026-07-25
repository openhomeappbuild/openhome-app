import { supabaseAdmin } from "@/lib/supabase-admin";

// The smallest valid transparent GIF — served regardless of whether the id
// is recognized, so a broken/expired link never shows a broken-image icon
// in the recipient's email client.
const PIXEL = Buffer.from("R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==", "base64");

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const { data: email } = await supabaseAdmin
    .from("emails")
    .select("opened_at, open_count")
    .eq("id", id)
    .single();

  if (email) {
    await supabaseAdmin
      .from("emails")
      .update({
        opened_at: email.opened_at ?? new Date().toISOString(),
        last_opened_at: new Date().toISOString(),
        open_count: (email.open_count ?? 0) + 1,
      })
      .eq("id", id);
  }

  return new Response(PIXEL, {
    headers: {
      "Content-Type": "image/gif",
      "Content-Length": String(PIXEL.length),
      "Cache-Control": "no-store, no-cache, must-revalidate",
      Pragma: "no-cache",
    },
  });
}
