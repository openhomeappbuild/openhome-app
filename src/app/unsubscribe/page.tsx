import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;
  const cleanEmail = (email ?? "").trim().toLowerCase();

  if (cleanEmail) {
    await supabaseAdmin.from("unsubscribed_emails").upsert({ email: cleanEmail });
  }

  return (
    <main className="flex min-h-full flex-1 items-center justify-center bg-[#faf8f3] p-6">
      <div className="w-full max-w-sm rounded-lg border border-[#e7e2d4] bg-white p-8 text-center">
        <b className="font-display block text-[19px] font-semibold text-[#14130f]">Open Home App</b>
        {cleanEmail ? (
          <>
            <h1 className="font-display mt-4 mb-1 text-lg font-semibold">You're unsubscribed</h1>
            <p className="text-sm text-[#837c6c]">
              {cleanEmail} won't receive any further follow-up or report emails from us.
            </p>
          </>
        ) : (
          <>
            <h1 className="font-display mt-4 mb-1 text-lg font-semibold">No email address given</h1>
            <p className="text-sm text-[#837c6c]">Use the unsubscribe link from one of our emails.</p>
          </>
        )}
      </div>
    </main>
  );
}
