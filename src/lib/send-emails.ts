import "server-only";
import { Resend } from "resend";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { EMAIL_FROM } from "@/lib/resend";

type EmailRow = {
  id: string;
  recipient_email: string;
  subject: string;
  body_html: string;
};

/**
 * Sends each row through Resend with a tracking pixel appended, and updates
 * its status in place. Shared by the manual "Approve & send" action and the
 * scheduled-send cron route so there's one place that knows how a draft
 * actually gets sent.
 */
export async function sendEmailRows(rows: EmailRow[], appUrl: string, resend: Resend): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;
  for (const row of rows) {
    const pixel = `<img src="${appUrl}/api/track/${row.id}" width="1" height="1" alt="" style="display:block;border:0;" />`;
    const { error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: row.recipient_email,
      subject: row.subject,
      html: row.body_html + pixel,
    });
    if (error) {
      await supabaseAdmin.from("emails").update({ status: "failed", error: error.message }).eq("id", row.id);
      failed++;
    } else {
      await supabaseAdmin.from("emails").update({ status: "sent", sent_at: new Date().toISOString() }).eq("id", row.id);
      sent++;
    }
  }
  return { sent, failed };
}
