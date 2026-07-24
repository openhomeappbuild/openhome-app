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
  AAA: "bg-[#b23b2e] text-white",
  AA: "bg-[#a9761f] text-white",
  A: "bg-[#14130f] text-white",
  B: "bg-[#e7e2d4] text-[#524d40]",
  C: "bg-[#f3f1ea] text-[#a39c89]",
};
