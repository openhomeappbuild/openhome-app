"use server";

import { supabase } from "@/lib/supabase";
import { checkEmail, NZ_MOBILE_RE } from "@/lib/email-check";

export type CheckInState = {
  ok: boolean;
  error?: string;
  firstName?: string;
};

export async function checkIn(
  listingId: string,
  _prevState: CheckInState,
  formData: FormData
): Promise<CheckInState> {
  const fullName = String(formData.get("fullName") ?? "").trim();
  const mobile = String(formData.get("mobile") ?? "").replace(/[\s\-()]/g, "");
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const isLocal = formData.get("isLocal") === "yes";
  const suburb = String(formData.get("suburb") ?? "").trim();
  const interest = String(formData.get("interest") ?? "");
  const consent = formData.get("consent") === "on";

  if (fullName.length < 2) return { ok: false, error: "Please enter your name." };
  if (!NZ_MOBILE_RE.test(mobile)) {
    return { ok: false, error: "Please enter a valid NZ mobile (e.g. 021 234 5678)." };
  }
  const emailResult = checkEmail(email);
  if (emailResult.status !== "ok") {
    return { ok: false, error: "Please enter a valid, verified email address." };
  }
  if (isLocal && !suburb) {
    return { ok: false, error: "Please tell us which part of town you're from." };
  }
  if (!interest) return { ok: false, error: "Please pick the option that fits best." };

  const { error } = await supabase.from("checkins").insert({
    listing_id: listingId,
    full_name: fullName,
    mobile,
    email,
    is_local: isLocal,
    suburb: isLocal ? suburb : null,
    interest,
    consent,
  });

  if (error) {
    return { ok: false, error: "Something went wrong saving your details. Please try again." };
  }

  return { ok: true, firstName: fullName.split(" ")[0] };
}
