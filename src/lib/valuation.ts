export type Grade = "Superior" | "Similar" | "Inferior";

export function suggestGrade(subjectFloorM2: number | null, compFloorM2: number | null): Grade {
  if (!subjectFloorM2 || !compFloorM2) return "Similar";
  const ratio = compFloorM2 / subjectFloorM2;
  if (ratio >= 1.08) return "Superior";
  if (ratio <= 0.92) return "Inferior";
  return "Similar";
}

export function flagIfNonMarket(salePrice: number, capitalValue: number | null): string | null {
  if (!capitalValue) return null;
  const pctOfCv = Math.round((salePrice / capitalValue) * 100);
  if (pctOfCv <= 60) {
    return `Sold at ~${pctOfCv}% of CV — likely a non-market or related-party transfer.`;
  }
  return null;
}

/**
 * CV-index method: scales each comparable's sale price by the ratio of the
 * subject's capital value to the comparable's, giving an indicated value for
 * the subject. One of the five valuation approaches in the brief — plain
 * arithmetic, not AI. Falls back to the raw sale price when either CV is
 * missing.
 */
export function computeIndicatedValue(
  salePrice: number,
  compCapitalValue: number | null,
  subjectCapitalValue: number | null
): number {
  if (!compCapitalValue || !subjectCapitalValue) return Math.round(salePrice / 1000) * 1000;
  return Math.round((salePrice * (subjectCapitalValue / compCapitalValue)) / 1000) * 1000;
}

export function estimateRange(comps: { indicated_value: number; included: boolean }[]) {
  const included = comps.filter((c) => c.included).map((c) => c.indicated_value);
  if (included.length === 0) return null;
  return {
    low: Math.round(Math.min(...included) / 10000) * 10000,
    high: Math.round(Math.max(...included) / 10000) * 10000,
    count: included.length,
  };
}
