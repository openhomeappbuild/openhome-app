import { supabaseAdmin } from "@/lib/supabase-admin";
import { formatNZDayKey } from "@/lib/nz-time";
import { Panel, Empty } from "../ui";
import { SendBatchButton } from "./send-batch-button";

export const dynamic = "force-dynamic";

const TYPE_LABEL: Record<string, string> = {
  followup: "Attendee follow-up",
  seller_report: "Seller report",
};

export default async function EmailsPage() {
  const { data: emailRows } = await supabaseAdmin
    .from("emails")
    .select("*")
    .order("created_at", { ascending: false });

  const { data: listings } = await supabaseAdmin.from("listings").select("id, address");
  const listingAddress = new Map((listings ?? []).map((l) => [l.id, l.address]));

  type EmailRow = NonNullable<typeof emailRows>[number];
  const batches = new Map<string, EmailRow[]>();
  for (const row of emailRows ?? []) {
    const key = `${row.listing_id}::${row.open_home_day}::${row.type}`;
    batches.set(key, [...(batches.get(key) ?? []), row]);
  }

  const draftBatches: { key: string; rows: EmailRow[] }[] = [];
  const sentBatches: { key: string; rows: EmailRow[] }[] = [];
  for (const [key, rows] of batches) {
    if (rows.some((r) => r.status === "draft")) draftBatches.push({ key, rows });
    else sentBatches.push({ key, rows });
  }

  return (
    <div>
      <h1 className="font-display mb-1 text-[26px] font-semibold tracking-tight">Emails & newsletter</h1>
      <p className="mb-8 text-[13.5px] text-[#837c6c]">
        Auto-drafted by the app — you review and approve before anything sends
      </p>

      <div className="space-y-4">
        <Panel title={`Drafts ready to review (${draftBatches.length})`}>
          {draftBatches.length === 0 ? (
            <Empty text="No drafts waiting. Draft follow-up or seller report emails from a listing's Open Homes tab." />
          ) : (
            <div className="space-y-6">
              {draftBatches.map(({ key, rows }) => {
                const first = rows.filter((r) => r.status === "draft")[0];
                const [listingId, dayKey, type] = key.split("::");
                return (
                  <div key={key} className="border-b border-[#eef1f5] pb-6 last:border-none last:pb-0">
                    <div className="mb-2 flex items-center justify-between">
                      <div>
                        <b className="text-[14px]">{TYPE_LABEL[type] ?? type}</b>
                        <span className="ml-2 text-xs text-[#837c6c]">
                          {listingAddress.get(listingId) ?? "Listing"} ·{" "}
                          {formatNZDayKey(dayKey, { day: "numeric", month: "short" })} · {rows.length} recipient
                          {rows.length === 1 ? "" : "s"}
                        </span>
                      </div>
                      <SendBatchButton listingId={listingId} dayKey={dayKey} type={type} />
                    </div>
                    <div className="rounded-lg border border-[#e7e2d4]">
                      <div className="border-b border-[#e7e2d4] bg-[#faf8f3] px-4 py-2.5 text-xs text-[#524d40]">
                        <b>To:</b> {first.recipient_name ?? first.recipient_email}
                        {rows.length > 1 ? ` (+${rows.length - 1} others, sent individually)` : ""}
                        <br />
                        <b>Subject:</b> {first.subject}
                      </div>
                      <div
                        className="max-h-[360px] overflow-y-auto px-5 py-4 text-sm"
                        dangerouslySetInnerHTML={{ __html: first.body_html }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Panel>

        <Panel title="Sent">
          {sentBatches.length === 0 ? (
            <Empty text="Nothing sent yet." />
          ) : (
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-[#e7e2d4] text-left text-[11px] uppercase tracking-wide text-[#837c6c]">
                  <th className="pb-2">Type</th>
                  <th className="pb-2">Listing</th>
                  <th className="pb-2">Open home</th>
                  <th className="pb-2">Recipients</th>
                  <th className="pb-2">Sent</th>
                </tr>
              </thead>
              <tbody>
                {sentBatches.map(({ key, rows }) => {
                  const [listingId, dayKey, type] = key.split("::");
                  const sentCount = rows.filter((r) => r.status === "sent").length;
                  const failedCount = rows.filter((r) => r.status === "failed").length;
                  const sentAt = rows.find((r) => r.sent_at)?.sent_at;
                  return (
                    <tr key={key} className="border-b border-[#eef1f5] last:border-none">
                      <td className="py-2.5 pr-2">{TYPE_LABEL[type] ?? type}</td>
                      <td className="py-2.5 pr-2">{listingAddress.get(listingId) ?? "—"}</td>
                      <td className="py-2.5 pr-2">{formatNZDayKey(dayKey, { day: "numeric", month: "short" })}</td>
                      <td className="py-2.5 pr-2">
                        {sentCount} sent{failedCount ? `, ${failedCount} failed` : ""}
                      </td>
                      <td className="py-2.5 text-[#837c6c]">
                        {sentAt ? new Date(sentAt).toLocaleDateString("en-NZ", { day: "numeric", month: "short" }) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </Panel>
      </div>
    </div>
  );
}
