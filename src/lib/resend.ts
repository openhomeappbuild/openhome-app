import "server-only";
import { Resend } from "resend";

export const EMAIL_FROM = process.env.EMAIL_FROM ?? "Open Home App <onboarding@resend.dev>";

export function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  return new Resend(apiKey);
}
