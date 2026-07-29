import { supabaseAdmin } from "@/lib/supabase-admin";
import { formatNZDayKey, formatNZDate } from "@/lib/nz-time";
import { Panel, Empty } from "../ui";
import { SendBatchButton } from "./send-batch-button";
import { ScheduledBatchControls } from "./scheduled-batch-controls";

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
  const scheduledBatches: { key: string; rows: EmailRow[] }[] = [];
  const sentBatches: { key: string; rows: EmailRow[] }[] = [];
  for (const [key, rows] of batches) {
    if (rows.some((r) => r.status === "draft")) draftBatches.push({ key, rows });
    else if (rows.some((r) => r.status === "scheduled")) scheduledBatches.push({ key, rows });
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

        <Panel title={`Scheduled (${scheduledBatches.length})`}>
          {scheduledBatches.length === 0 ? (
            <Empty text="Nothing scheduled — approve a draft above and pick a date instead of sending straight away." />
          ) : (
            <div className="space-y-6">
              {scheduledBatches.map(({ key, rows }) => {
                const first = rows[0];
                const [listingId, dayKey, type] = key.split("::");
                return (
                  <div key={key} className="border-b border-[#eef1f5] pb-6 last:border-none last:pb-0">
                    <div className="mb-2 flex items-center justify-between">
                      <div>
                        <b className="text-[14px]">{TYPE_LABEL[type] ?? type}</b>
                        <span className="ml-2 text-xs text-[#837c6c]">
                          {listingAddress.get(listingId) ?? "Listing"} ·{" "}
                          {formatNZDayKey(dayKey, { day: "numeric", month: "short" })} · {rows.length} recipient
                          {rows.length === 1 ? "" : "s"} · sends{" "}
                          {first.scheduled_for ? formatNZDate(`${first.scheduled_for}T00:00:00Z`, { day: "numeric", month: "short" }) : "soon"}
                        </span>
                      </div>
                      <ScheduledBatchControls listingId={listingId} dayKey={dayKey} type={type} />
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
            <div className="divide-y divide-[#eef1f5]">
              {sentBatches.map(({ key, rows }) => {
                const [listingId, dayKey, type] = key.split("::");
                const sentRows = rows.filter((r) => r.status === "sent");
                const failedCount = rows.filter((r) => r.status === "failed").length;
                const openedCount = sentRows.filter((r) => r.opened_at).length;
                const sentAt = rows.find((r) => r.sent_at)?.sent_at;
                const openRate = sentRows.length ? Math.round((openedCount / sentRows.length) * 100) : 0;

                return (
                  <details key={key} className="group py-3">
                    <summary className="flex cursor-pointer list-none items-center gap-3 text-[13px] [&::-webkit-details-marker]:hidden">
                      <span className="text-[#837c6c] transition-transform group-open:rotate-90">▸</span>
                      <b className="w-[130px] flex-shrink-0">{TYPE_LABEL[type] ?? type}</b>
                      <span className="flex-1 text-[#524d40]">
                        {listingAddress.get(listingId) ?? "—"} ·{" "}
                        {formatNZDayKey(dayKey, { day: "numeric", month: "short" })}
                      </span>
                      <span className="text-[#524d40]">
                        {sentRows.length} sent{failedCount ? `, ${failedCount} failed` : ""}
                      </span>
                      <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${openedCount > 0 ? "bg-[#e7f0ea] text-[#2f6f4e]" : "bg-[#f3f1ea] text-[#837c6c]"}`}>
                        {openedCount}/{sentRows.length} opened ({openRate}%)
                      </span>
                      <span className="w-[70px] flex-shrink-0 text-right text-xs text-[#837c6c]">
                        {sentAt ? new Date(sentAt).toLocaleDateString("en-NZ", { day: "numeric", month: "short" }) : "—"}
                      </span>
                    </summary>
                    <table className="mt-3 w-full text-[12.5px]">
                      <thead>
                        <tr className="border-b border-[#e7e2d4] text-left text-[10.5px] uppercase tracking-wide text-[#837c6c]">
                          <th className="pb-1.5 pl-6">Recipient</th>
                          <th className="pb-1.5">Status</th>
                          <th className="pb-1.5">Opened</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((r) => (
                          <tr key={r.id} className="border-b border-[#f3f1ea] last:border-none">
                            <td className="py-1.5 pl-6">{r.recipient_name ?? r.recipient_email}</td>
                            <td className="py-1.5 capitalize text-[#524d40]">{r.status}</td>
                            <td className="py-1.5 text-[#524d40]">
                              {r.opened_at
                                ? `${new Date(r.opened_at).toLocaleDateString("en-NZ", { day: "numeric", month: "short" })}${r.open_count > 1 ? ` (${r.open_count}×)` : ""}`
                                : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </details>
                );
              })}
            </div>
          )}
          <p className="mt-4 text-xs text-[#837c6c]">
            Opens are measured with a tracking pixel, so they're a useful signal rather than an exact count — some
            mail apps (notably Apple Mail) pre-load images for every message regardless of whether it was actually
            read, which inflates opens, and opens can under-count when images are blocked.
          </p>
        </Panel>
      </div>
    </div>
  );
}
