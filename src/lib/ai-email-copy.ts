import "server-only";
import { getGeminiClient, GEMINI_TEXT_MODEL } from "@/lib/gemini";

export type FollowupCopy = { recap: string; areaBlurb: string };

/**
 * Writes the two "wordy" paragraphs of the attendee follow-up email — a
 * recap of the home and a blurb about the area — from the listing's own
 * facts and notes. Told explicitly not to invent anything not given here,
 * since a hallucinated feature or amenity in a real client email is a much
 * worse failure than a plain, short paragraph. Falls back to null (letting
 * the caller use the plain template) if Gemini isn't configured, the
 * response doesn't parse, or the call fails for any reason — a flaky AI
 * call should never block a draft from being generated.
 */
export async function generateFollowupCopy(input: {
  address: string;
  suburb: string;
  region: string;
  bedrooms: number | null;
  bathrooms: number | null;
  carSpaces: number | null;
  descriptionNotes: string | null;
  areaNotes: string | null;
}): Promise<FollowupCopy | null> {
  const ai = getGeminiClient();
  if (!ai) return null;

  const facts = [
    input.bedrooms ? `${input.bedrooms} bedrooms` : null,
    input.bathrooms ? `${input.bathrooms} bathrooms` : null,
    input.carSpaces ? `${input.carSpaces} car spaces` : null,
  ]
    .filter(Boolean)
    .join(", ");

  const prompt = `You are writing two short paragraphs for a real estate agent's follow-up email to someone who just attended an open home. Warm, professional, concise New Zealand real estate tone — not salesy, no exclamation marks, no hype adjectives like "stunning" or "must-see".

Property: ${input.address}, ${input.suburb}
Facts: ${facts || "not specified"}
Agent's notes on the property: ${input.descriptionNotes || "none given"}
Agent's notes on the area: ${input.areaNotes || "none given"}

Only use the facts given above — never invent features, amenities, schools, views, or other claims that aren't stated. If the notes are sparse, write a shorter paragraph rather than padding it with generic filler.

Respond with strict JSON only, no markdown fences, no commentary:
{"recap": "1-2 sentences recapping the home itself", "areaBlurb": "1-2 sentences about ${input.suburb} / ${input.region}"}`;

  try {
    const response = await ai.models.generateContent({
      model: GEMINI_TEXT_MODEL,
      contents: prompt,
    });
    const text = (response.text ?? "").trim();
    const jsonText = text.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
    const parsed = JSON.parse(jsonText);
    if (typeof parsed.recap !== "string" || typeof parsed.areaBlurb !== "string") return null;
    if (!parsed.recap.trim() || !parsed.areaBlurb.trim()) return null;
    return { recap: parsed.recap.trim(), areaBlurb: parsed.areaBlurb.trim() };
  } catch {
    return null;
  }
}
