import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export default async function EmailsPage() {
  const { data: consentedCheckins } = await supabaseAdmin
    .from("checkins")
    .select("id")
    .eq("consent", true);

  return (
    <div>
      <h1 className="mb-1 text-[22px] font-bold">Emails & newsletter</h1>
      <p className="mb-6 text-[13.5px] text-[#6b7787]">
        Auto-drafted by the app — you review and approve before anything sends
      </p>

      <div className="rounded-xl border border-[#e2e7ed] bg-white p-6">
        <p className="text-sm leading-relaxed text-[#43505e]">
          Email automation (attendee follow-up, seller reports, and the monthly newsletter) is the next build
          phase. Right now you have{" "}
          <b>{consentedCheckins?.length ?? 0} contacts opted in</b> ready to receive them once drafting is wired
          up.
        </p>
      </div>
    </div>
  );
}
