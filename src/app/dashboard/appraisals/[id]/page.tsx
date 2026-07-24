import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { AppraisalView } from "./appraisal-view";

export const dynamic = "force-dynamic";

export default async function AppraisalDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [{ data: appraisal }, { data: comparables }] = await Promise.all([
    supabaseAdmin.from("appraisals").select("*").eq("id", id).single(),
    supabaseAdmin
      .from("appraisal_comparables")
      .select("*")
      .eq("appraisal_id", id)
      .order("indicated_value", { ascending: false }),
  ]);

  if (!appraisal) notFound();

  return <AppraisalView appraisal={appraisal} comparables={comparables ?? []} />;
}
