import { supabaseAdmin } from "@/lib/supabase-admin";
import { getResendClient } from "@/lib/resend";
import { sendEmailRows } from "@/lib/send-emails";
import { nzDayKey } from "@/lib/nz-time";

/**
 * Vercel Cron hits this once a day (see vercel.json — Hobby plan's only
 * option). Sends anything approved via "Schedule" whose date has arrived,
 * using the exact same send path as the manual "Approve & send" button.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const today = nzDayKey(new Date());
  const { data: due } = await supabaseAdmin
    .from("emails")
    .select("*")
    .eq("status", "scheduled")
    .lte("scheduled_for", today);

  if (!due || due.length === 0) {
    return Response.json({ sent: 0, failed: 0 });
  }

  const resend = getResendClient();
  if (!resend) {
    return Response.json({ error: "RESEND_API_KEY not configured" }, { status: 500 });
  }

  const appUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "https://openhome-app-five.vercel.app";

  const { sent, failed } = await sendEmailRows(due, appUrl, resend);
  return Response.json({ sent, failed, total: due.length });
}
