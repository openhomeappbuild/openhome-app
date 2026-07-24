import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { estimateRange } from "@/lib/valuation";
import { NewAppraisalForm } from "./new-appraisal-form";

export const dynamic = "force-dynamic";

export default async function AppraisalsPage() {
  const { data: appraisals } = await supabaseAdmin
    .from("appraisals")
    .select("*")
    .order("created_at", { ascending: false });

  const { data: comparables } = await supabaseAdmin
    .from("appraisal_comparables")
    .select("appraisal_id, indicated_value, included");

  const rangeByAppraisal = new Map<string, ReturnType<typeof estimateRange>>();
  for (const a of appraisals ?? []) {
    const comps = (comparables ?? []).filter((c) => c.appraisal_id === a.id);
    rangeByAppraisal.set(a.id, estimateRange(comps));
  }

  return (
    <div>
      <h1 className="font-display mb-1 text-[26px] font-semibold tracking-tight">Appraisals</h1>
      <p className="mb-8 text-[13.5px] text-[#837c6c]">
        Upload a Prover (or Property Guru / REINZ) sales export, or add comparables by hand — the app grades
        them and builds the proposal
      </p>

      <NewAppraisalForm />

      {(appraisals ?? []).length === 0 ? (
        <p className="text-sm text-[#837c6c]">No appraisals yet.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {(appraisals ?? []).map((a) => {
            const range = rangeByAppraisal.get(a.id);
            return (
              <Link
                key={a.id}
                href={`/dashboard/appraisals/${a.id}`}
                className="block rounded-lg border border-[#e7e2d4] bg-white p-4 transition-colors hover:border-[#14130f]"
              >
                <div className="text-[15px] font-bold">{a.address}</div>
                <div className="my-1 text-xs text-[#837c6c]">
                  {a.suburb ? `${a.suburb} · ` : ""}
                  {a.floor_area_m2 ? `${a.floor_area_m2}m² floor · ` : ""}
                  {a.bedrooms ? `${a.bedrooms} bed` : ""}
                </div>
                <div className="border-t border-[#eee9dc] pt-2.5 text-xs text-[#524d40]">
                  {range
                    ? `Range: $${range.low.toLocaleString("en-NZ")} – $${range.high.toLocaleString("en-NZ")} (${range.count} comparables)`
                    : "No comparables added yet"}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
