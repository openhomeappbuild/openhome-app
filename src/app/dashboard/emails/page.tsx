import { supabaseAdmin } from "@/lib/supabase-admin";
import { Panel } from "../ui";

export const dynamic = "force-dynamic";

export default async function EmailsPage() {
  const { data: consentedCheckins } = await supabaseAdmin
    .from("checkins")
    .select("id")
    .eq("consent", true);

  return (
    <div>
      <h1 className="font-display mb-1 text-[26px] font-semibold tracking-tight">Emails & newsletter</h1>
      <p className="mb-8 text-[13.5px] text-[#837c6c]">
        Auto-drafted by the app — you review and approve before anything sends
      </p>

      <Panel title="Coming next">
        <p className="text-sm leading-relaxed text-[#524d40]">
          Email automation (attendee follow-up, seller reports, and the monthly newsletter) is the next build
          phase. Right now you have{" "}
          <b className="text-[#14130f]">{consentedCheckins?.length ?? 0} contacts opted in</b> ready to receive
          them once drafting is wired up.
        </p>
      </Panel>
    </div>
  );
}
