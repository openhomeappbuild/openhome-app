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

const round1000 = (n: number) => Math.round(n / 1000) * 1000;

// However a comparable's price gets scaled to the subject, never trust the
// scaling more than 2x either way — a bad match that slipped past the
// flags below shouldn't be able to blow the estimate out on its own.
const MAX_ADJUSTMENT = 2;
const clampRatio = (ratio: number) => Math.min(Math.max(ratio, 1 / MAX_ADJUSTMENT), MAX_ADJUSTMENT);

/**
 * Scales a comparable's sale price to the subject so wildly different-sized
 * properties can be compared on the same basis, using whichever anchor is
 * actually available, best evidence first:
 *
 * 1. CV-index — both capital values present (the standard approach: recent
 *    sales in an area tend to sell at a consistent ratio to their rating
 *    value, so apply that ratio to the subject's own CV).
 * 2. Floor-area rate — no CV, but both floor areas are known. Building size
 *    is the more direct driver of a dwelling's value than its land size.
 * 3. Land-area rate, square-root dampened — last resort, land area being
 *    the one figure almost always present even for a bare section. Land
 *    value per m² falls as sections get bigger and rises as they shrink,
 *    so a straight linear ratio badly over/under-shoots for an oddly-sized
 *    section; a sqrt keeps the adjustment directionally right without
 *    extrapolating that hard.
 * 4. Raw sale price — nothing to scale against at all.
 */
export function computeIndicatedValue(input: {
  salePrice: number;
  compCapitalValue: number | null;
  subjectCapitalValue: number | null;
  compFloorAreaM2?: number | null;
  subjectFloorAreaM2?: number | null;
  compLandAreaM2?: number | null;
  subjectLandAreaM2?: number | null;
}): number {
  const { salePrice, compCapitalValue, subjectCapitalValue, compFloorAreaM2, subjectFloorAreaM2, compLandAreaM2, subjectLandAreaM2 } = input;

  if (compCapitalValue && subjectCapitalValue) {
    return round1000(salePrice * clampRatio(subjectCapitalValue / compCapitalValue));
  }
  if (compFloorAreaM2 && subjectFloorAreaM2) {
    return round1000(salePrice * clampRatio(subjectFloorAreaM2 / compFloorAreaM2));
  }
  if (compLandAreaM2 && subjectLandAreaM2) {
    return round1000(salePrice * clampRatio(Math.sqrt(subjectLandAreaM2 / compLandAreaM2)));
  }
  return round1000(salePrice);
}

function median(nums: number[]): number | null {
  if (nums.length === 0) return null;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

/**
 * A comparable can still land a long way from the rest of the batch even
 * after suggestGrade/flagIfNonMarket/flagIfSizeMismatch all pass it — two
 * houses on similarly sized sections can be genuinely different quality, or
 * the scaling in computeIndicatedValue can only do so much with weak
 * anchors. This runs once per batch, after every row has an indicated
 * value, and catches whatever's left by comparing each one against the
 * batch's own median rather than against the subject's own attributes.
 * Needs at least 4 included rows before it trusts the median enough to act.
 */
export function flagOutliersByIndicatedValue<
  T extends { indicated_value: number; included: boolean; flagged_reason: string | null }
>(rows: T[]): T[] {
  const baseline = rows.filter((r) => r.included).map((r) => r.indicated_value);
  const med = median(baseline);
  if (!med || baseline.length < 4) return rows;

  return rows.map((r) => {
    if (!r.included) return r;
    const ratio = r.indicated_value / med;
    if (ratio >= 2.2 || ratio <= 1 / 2.2) {
      return {
        ...r,
        included: false,
        flagged_reason: `Indicated value ($${Math.round(r.indicated_value / 1000)}k) is well outside the rest of this batch (median $${Math.round(med / 1000)}k) — check before including.`,
      };
    }
    return r;
  });
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
