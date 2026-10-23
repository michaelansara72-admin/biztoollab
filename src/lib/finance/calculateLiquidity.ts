/**
 * Balance-sheet liquidity ratios from one reporting date.
 *
 * The caller supplies every amount in the same currency and on the same
 * accounting basis. This module does not convert currency, does not store a
 * reporting date, and does not collect bank connections, account identifiers,
 * or other personal financial data.
 *
 * `currentRestrictedCash` belongs in current assets only when that restricted
 * cash is classified as current. Noncurrent restricted cash must not be
 * entered in that field. Restricted cash is excluded from quick assets and
 * from the cash ratio.
 *
 * Amounts are IEEE-754 binary64 numbers in the currency's major unit. The
 * calculation does not round. Values such as 0.01 are not decimal currency
 * and may already be inexact before they reach this function. Each monetary
 * input must be finite and in the closed range from 0 through
 * `LIQUIDITY_MAX_MONETARY_AMOUNT`. A blank, a non-number, a negative, or a
 * value above that maximum is rejected. Invalid input is never replaced
 * with zero. An explicit zero is kept.
 *
 * Seven maximum asset amounts still sum to a finite binary64 value. Division
 * by a positive but tiny liability can still overflow; that result is
 * rejected instead of being returned as Infinity. Zero liabilities make the
 * three ratios unavailable. They are not reported as Infinity, NaN, or zero.
 *
 * This module does not score financial health and does not apply a
 * healthy or unhealthy cutoff.
 */

export const LIQUIDITY_MONETARY_FIELDS = [
  "unrestrictedCashAndEquivalents",
  "currentRestrictedCash",
  "eligibleShortTermInvestments",
  "netCollectibleCurrentReceivables",
  "inventory",
  "prepaidExpenses",
  "otherCurrentAssets",
  "currentLiabilities",
] as const;

export type LiquidityMonetaryField = (typeof LIQUIDITY_MONETARY_FIELDS)[number];

/**
 * One trillion major currency units. Integers through this bound, and the
 * sum of seven of them, are exactly representable in binary64.
 */
export const LIQUIDITY_MAX_MONETARY_AMOUNT = 1_000_000_000_000;

export const LIQUIDITY_ASSUMPTIONS = [
  "one-currency-one-reporting-date-one-accounting-basis",
  "current-restricted-cash-only",
  "restricted-cash-excluded-from-quick-and-cash-ratios",
  "binary64-no-rounding",
  "no-health-score-or-threshold",
] as const;

export type LiquidityAssumption = (typeof LIQUIDITY_ASSUMPTIONS)[number];

export type LiquidityInput = {
  unrestrictedCashAndEquivalents: number;
  currentRestrictedCash: number;
  eligibleShortTermInvestments: number;
  netCollectibleCurrentReceivables: number;
  inventory: number;
  prepaidExpenses: number;
  otherCurrentAssets: number;
  currentLiabilities: number;
};

/**
 * A ratio of currency to currency. `unavailable-zero-liabilities` means the
 * denominator was exactly zero, so no ratio is defined.
 */
export type LiquidityRatio =
  | { status: "defined"; value: number }
  | { status: "unavailable-zero-liabilities" };

export type LiquidityResult = {
  totalCurrentAssets: number;
  quickAssets: number;
  currentLiabilities: number;
  currentRatio: LiquidityRatio;
  quickRatio: LiquidityRatio;
  cashRatio: LiquidityRatio;
  netWorkingCapital: number;
  assumptions: typeof LIQUIDITY_ASSUMPTIONS;
};

export type LiquidityFieldRejectionCode =
  | "missing-field"
  | "non-numeric"
  | "non-finite"
  | "negative"
  | "above-maximum";

export type LiquidityCalculation =
  | { ok: true; result: LiquidityResult }
  | {
      ok: false;
      code: LiquidityFieldRejectionCode;
      field: LiquidityMonetaryField;
    }
  | { ok: false; code: "incomplete-input" }
  | { ok: false; code: "non-finite-result" };

const ASSET_FIELDS = [
  "unrestrictedCashAndEquivalents",
  "currentRestrictedCash",
  "eligibleShortTermInvestments",
  "netCollectibleCurrentReceivables",
  "inventory",
  "prepaidExpenses",
  "otherCurrentAssets",
] as const satisfies readonly LiquidityMonetaryField[];

const QUICK_FIELDS = [
  "unrestrictedCashAndEquivalents",
  "eligibleShortTermInvestments",
  "netCollectibleCurrentReceivables",
] as const satisfies readonly LiquidityMonetaryField[];

/**
 * Current ratio, quick ratio, cash ratio, and net working capital.
 *
 * totalCurrentAssets includes current restricted cash.
 * quickAssets is unrestricted cash, eligible short-term investments, and
 * net collectible receivables.
 * cash ratio uses unrestricted cash only.
 * The caller's object is not modified.
 */
export function calculateLiquidity(
  input: LiquidityInput,
): LiquidityCalculation {
  if (input === null || typeof input !== "object") {
    return { ok: false, code: "incomplete-input" };
  }

  const amounts = {} as Record<LiquidityMonetaryField, number>;

  for (const field of LIQUIDITY_MONETARY_FIELDS) {
    const read = readMonetaryField(input, field);

    if (!read.ok) {
      return read;
    }

    amounts[field] = read.value;
  }

  const totalCurrentAssets = sumAmounts(ASSET_FIELDS.map((field) => amounts[field]));
  const quickAssets = sumAmounts(QUICK_FIELDS.map((field) => amounts[field]));
  const currentLiabilities = amounts.currentLiabilities;

  if (totalCurrentAssets === null || quickAssets === null) {
    return { ok: false, code: "non-finite-result" };
  }

  const netWorkingCapital = totalCurrentAssets - currentLiabilities;

  if (!Number.isFinite(netWorkingCapital)) {
    return { ok: false, code: "non-finite-result" };
  }

  const currentRatio = ratio(totalCurrentAssets, currentLiabilities);
  const quickRatio = ratio(quickAssets, currentLiabilities);
  const cashRatio = ratio(
    amounts.unrestrictedCashAndEquivalents,
    currentLiabilities,
  );

  if (currentRatio === null || quickRatio === null || cashRatio === null) {
    return { ok: false, code: "non-finite-result" };
  }

  return {
    ok: true,
    result: {
      totalCurrentAssets,
      quickAssets,
      currentLiabilities,
      currentRatio,
      quickRatio,
      cashRatio,
      netWorkingCapital,
      assumptions: LIQUIDITY_ASSUMPTIONS,
    },
  };
}

function readMonetaryField(
  input: LiquidityInput,
  field: LiquidityMonetaryField,
):
  | { ok: true; value: number }
  | {
      ok: false;
      code: LiquidityFieldRejectionCode;
      field: LiquidityMonetaryField;
    } {
  if (!Object.hasOwn(input, field) || input[field] === undefined) {
    return { ok: false, code: "missing-field", field };
  }

  const value: unknown = input[field];

  if (typeof value !== "number") {
    return { ok: false, code: "non-numeric", field };
  }

  if (!Number.isFinite(value)) {
    return { ok: false, code: "non-finite", field };
  }

  if (value < 0) {
    return { ok: false, code: "negative", field };
  }

  if (value > LIQUIDITY_MAX_MONETARY_AMOUNT) {
    return { ok: false, code: "above-maximum", field };
  }

  return { ok: true, value: value === 0 ? 0 : value };
}

function sumAmounts(values: readonly number[]): number | null {
  let total = 0;

  for (const value of values) {
    total += value;

    if (!Number.isFinite(total)) {
      return null;
    }
  }

  return total;
}

function ratio(numerator: number, denominator: number): LiquidityRatio | null {
  if (denominator === 0) {
    return { status: "unavailable-zero-liabilities" };
  }

  const value = numerator / denominator;

  if (!Number.isFinite(value)) {
    return null;
  }

  return { status: "defined", value };
}
