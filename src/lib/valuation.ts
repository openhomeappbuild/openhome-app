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
 * Catches comparables that are a wildly different scale of property from
 * the subject — e.g. a lifestyle block pulled in by a "nearby sales"
 * search radius. This is the only sanity check available when the subject
 * has no floor area or capital value yet (grading and the CV-index method
 * both go blind in that case — see computeIndicatedValue), and land area
 * is the one figure Prover always provides, even for a bare section.
 */
export function flagIfSizeMismatch(subjectLandM2: number | null, compLandM2: number | null): string | null {
  if (!subjectLandM2 || !compLandM2) return null;
  const ratio = compLandM2 / subjectLandM2;
  if (ratio >= 3) {
    return `Land area is ${ratio.toFixed(1)}x the subject's — check this is a genuine comparable.`;
  }
  if (ratio <= 1 / 3) {
    return `Land area is only ${Math.round(ratio * 100)}% of the subject's — check this is a genuine comparable.`;
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

function median(nums: number[]): number | null {
  if (nums.length === 0) return null;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

type ComparableForDefaults = {
  included: boolean;
  sale_price: number;
  capital_value: number | null;
  floor_area_m2: number | null;
  indicated_value: number;
};

/**
 * Seeds starting values for the five valuation methods from the appraisal's
 * own subject facts and included comparables, so the agent adjusts real
 * numbers rather than typing a valuation from scratch. Falls back to broad
 * NZ-typical defaults only where the appraisal has no data at all for that
 * input, so the sliders never sit on zero.
 */
export function defaultValuationInputs(
  appraisal: {
    capital_value: number | null;
    land_value: number | null;
    improvements_value: number | null;
    floor_area_m2: number | null;
  },
  comparables: ComparableForDefaults[]
) {
  const included = comparables.filter((c) => c.included);

  const comparisonValue =
    median(included.map((c) => c.indicated_value)) ?? appraisal.capital_value ?? 800000;

  const cvRatios = included
    .filter((c) => c.capital_value)
    .map((c) => (c.sale_price / (c.capital_value as number)) * 100);
  const cvRatio = Math.round(median(cvRatios) ?? 100);

  const ratesPerM2 = included
    .filter((c) => c.floor_area_m2)
    .map((c) => c.sale_price / (c.floor_area_m2 as number));
  const ratePerM2 =
    Math.round((median(ratesPerM2) ?? (appraisal.capital_value && appraisal.floor_area_m2 ? appraisal.capital_value / appraisal.floor_area_m2 : 4500)) / 50) * 50;

  const weeklyRent = Math.round(((comparisonValue * 0.045) / 52) / 25) * 25;

  const landValue = appraisal.land_value ?? Math.round(comparisonValue * 0.4);

  const buildCostPerM2 =
    appraisal.improvements_value && appraisal.floor_area_m2
      ? Math.round(appraisal.improvements_value / appraisal.floor_area_m2 / 50) * 50
      : 2800;

  return {
    comparisonValue: Math.round(comparisonValue / 1000) * 1000,
    weeklyRent: Math.max(weeklyRent, 300),
    grossYield: 5,
    cvRatio: Math.min(Math.max(cvRatio, 80), 130),
    ratePerM2,
    landValue: Math.round(landValue / 1000) * 1000,
    buildCostPerM2,
    depreciation: 10,
  };
}
