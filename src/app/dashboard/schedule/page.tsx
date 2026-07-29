import { supabaseAdmin } from "@/lib/supabase-admin";
import { nzDayKey } from "@/lib/nz-time";
import { getUnfollowedContacts } from "@/lib/followups";
import { Panel, Stat } from "../ui";
import { NewFollowUpForm } from "./new-followup-form";
import { FollowUpList } from "./followup-list";
import { UnfollowedList } from "./unfollowed-list";

export const dynamic = "force-dynamic";

export default async function SchedulePage() {
  const today = nzDayKey(new Date());

  const [{ data: followUps }, { data: listings }, unfollowed] = await Promise.all([
    supabaseAdmin.from("follow_ups").select("*").order("due_date", { ascending: true }),
    supabaseAdmin.from("listings").select("id, address").eq("status", "active").order("address"),
    getUnfollowedContacts(),
  ]);

  const listingAddress = new Map((listings ?? []).map((l) => [l.id, l.address]));
  const withAddress = (rows: typeof followUps) =>
    (rows ?? []).map((r) => ({ ...r, listing_address: r.listing_id ? listingAddress.get(r.listing_id) ?? null : null }));

  const outstanding = (followUps ?? []).filter((f) => f.status === "outstanding");
  const overdue = withAddress(outstanding.filter((f) => f.due_date < today));
  const dueToday = withAddress(outstanding.filter((f) => f.due_date === today));
  const upcoming = withAddress(outstanding.filter((f) => f.due_date > today));
  const recentlyDone = withAddress(
    (followUps ?? []).filter((f) => f.status === "done").sort((a, b) => (b.completed_at ?? "").localeCompare(a.completed_at ?? "")).slice(0, 10)
  );

  const callsOutstanding = outstanding.filter((f) => f.type === "call").length;

  return (
    <div>
      <h1 className="font-display mb-1 text-[26px] font-semibold tracking-tight">Schedule</h1>
      <p className="mb-8 text-[13.5px] text-[#837c6c]">
        Follow-up calls and emails, plus anyone who's got in touch that hasn't been followed up on yet
      </p>

      <div className="mb-8 grid grid-cols-2 gap-6 md:grid-cols-4">
        <Stat n={overdue.length} l="Overdue" />
        <Stat n={dueToday.length} l="Due today" />
        <Stat n={callsOutstanding} l="Calls outstanding" />
        <Stat n={unfollowed.length} l="Not yet followed up" />
      </div>

      <NewFollowUpForm listings={listings ?? []} />

      <div className="space-y-4">
        {overdue.length > 0 && (
          <Panel title={`Overdue (${overdue.length})`}>
            <FollowUpList rows={overdue} emptyText="Nothing overdue." />
          </Panel>
        )}

        <Panel title={`Today's roster (${dueToday.length})`}>
          <FollowUpList rows={dueToday} emptyText="No calls or emails scheduled for today." />
        </Panel>

        <Panel title="Not yet followed up">
          <UnfollowedList contacts={unfollowed} />
        </Panel>

        <Panel title={`Upcoming (${upcoming.length})`}>
          <FollowUpList rows={upcoming} emptyText="Nothing scheduled ahead." />
        </Panel>

        <Panel title="Recently completed">
          <FollowUpList rows={recentlyDone} emptyText="Nothing completed yet." showDueDate={false} showReopen />
        </Panel>
      </div>
    </div>
  );
}
