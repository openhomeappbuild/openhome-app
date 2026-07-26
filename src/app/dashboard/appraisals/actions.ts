"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { runCsvImport } from "./[id]/actions";

export type AppraisalActionState = { error?: string };

/**
 * The subject property's own facts (floor area, land area, CV, last sold)
 * drive both grading and the CV-index method for every comparable — so
 * creation now just takes the address plus the same CSV the agent would
 * upload anyway. If that CSV's own first row is the subject (Prover's
 * "nearby sales" search is centred on it, so it usually is), those facts
 * get filled in immediately via runCsvImport's self-fill before a single
 * comparable is graded against them, rather than the agent re-typing
 * numbers the export already has.
 */
export async function createAppraisal(
  _prevState: AppraisalActionState,
  formData: FormData
): Promise<AppraisalActionState> {
  const address = String(formData.get("address") ?? "").trim();
  if (!address) return { error: "Address is required." };

  const { data, error } = await supabaseAdmin
    .from("appraisals")
    .insert({ address, region: "Queenstown" })
    .select("id")
    .single();

  if (error || !data) return { error: "Could not save the appraisal. Please try again." };

  const file = formData.get("file");
  if (file instanceof File && file.size > 0) {
    // If the CSV fails to parse, the appraisal itself still saved fine —
    // land on the appraisal page either way so the agent can retry the
    // upload there instead of losing the new record.
    await runCsvImport(data.id, file);
  }

  revalidatePath("/dashboard/appraisals");
  redirect(`/dashboard/appraisals/${data.id}`);
}
