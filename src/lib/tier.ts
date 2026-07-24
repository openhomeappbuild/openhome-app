export type Tier = "AAA" | "AA" | "A" | "B" | "C";

export function computeTier({
  visitCount,
  isLocal,
  hasOffer,
  interest,
}: {
  visitCount: number;
  isLocal: boolean;
  hasOffer: boolean;
  interest: string;
}): Tier {
  if (hasOffer) return "AAA";
  if (visitCount >= 2 && isLocal) return "AA";
  if (visitCount >= 2 || (isLocal && interest !== "Just looking")) return "A";
  if (isLocal) return "B";
  return "C";
}

export const TIER_STYLES: Record<Tier, string> = {
  AAA: "bg-[#b3261e] text-white",
  AA: "bg-[#e07b1f] text-white",
  A: "bg-[#111] text-white",
  B: "bg-[#c9d3de] text-[#33404f]",
  C: "bg-[#edf0f4] text-[#8b98a7]",
};
