export type OperatingOutlookInput = {
  monthlyRevenue: number;
  variableCostRatePercent: number;
  monthlyFixedCosts: number;
};

export type OperatingOutlookScenarioId = "downside" | "base" | "upside";

export type OperatingOutlookBreakEvenStatus =
  | "unique-threshold"
  | "no-finite-threshold"
  | "zero-profit-at-all-revenue";

export type OperatingOutlookRejectionCode =
  | "non-finite-monthly-revenue"
  | "negative-monthly-revenue"
  | "non-finite-variable-cost-rate"
  | "variable-cost-rate-below-zero"
  | "variable-cost-rate-above-100"
  | "non-finite-monthly-fixed-costs"
  | "negative-monthly-fixed-costs"
  | "non-finite-result";

export const OPERATING_OUTLOOK_ASSUMPTIONS = [
  "arithmetic-shocks-are-not-forecasts",
  "variable-cost-rate-unchanged-across-scenarios",
  "operating-profit-before-financing-and-taxes",
  "no-intermediate-rounding",
] as const;

export type OperatingOutlookAssumption =
  (typeof OPERATING_OUTLOOK_ASSUMPTIONS)[number];

export type OperatingOutlookScenarioAssumptions = {
  revenueMultiplier: number;
  fixedCostMultiplier: number;
  variableCostRateUnchanged: true;
  interpretation: "arithmetic-shock-not-a-forecast";
};

export type OperatingOutlookScenario = {
  scenario: OperatingOutlookScenarioId;
  monthlyRevenue: number;
  variableCostRatePercent: number;
  monthlyFixedCosts: number;
  variableCosts: number;
  contribution: number;
  operatingProfitBeforeFinancingAndTaxes: number;
  operatingMarginPercent: number | null;
  breakEvenRevenue: number | null;
  breakEvenStatus: OperatingOutlookBreakEvenStatus;
  assumptions: OperatingOutlookScenarioAssumptions;
};

export type OperatingOutlookResult = {
  input: OperatingOutlookInput;
  base: OperatingOutlookScenario;
  downside: OperatingOutlookScenario;
  upside: OperatingOutlookScenario;
  assumptions: typeof OPERATING_OUTLOOK_ASSUMPTIONS;
};

export type OperatingOutlookCalculation =
  | { ok: true; result: OperatingOutlookResult }
  | { ok: false; code: OperatingOutlookRejectionCode };

export const DOWNSIDE_REVENUE_MULTIPLIER = 0.85;
export const DOWNSIDE_FIXED_COST_MULTIPLIER = 1.1;
export const BASE_REVENUE_MULTIPLIER = 1;
export const BASE_FIXED_COST_MULTIPLIER = 1;
export const UPSIDE_REVENUE_MULTIPLIER = 1.15;
export const UPSIDE_FIXED_COST_MULTIPLIER = 1;

const scenarioDefinitions: readonly {
  scenario: OperatingOutlookScenarioId;
  revenueMultiplier: number;
  fixedCostMultiplier: number;
}[] = [
  {
    scenario: "base",
    revenueMultiplier: BASE_REVENUE_MULTIPLIER,
    fixedCostMultiplier: BASE_FIXED_COST_MULTIPLIER,
  },
  {
    scenario: "downside",
    revenueMultiplier: DOWNSIDE_REVENUE_MULTIPLIER,
    fixedCostMultiplier: DOWNSIDE_FIXED_COST_MULTIPLIER,
  },
  {
    scenario: "upside",
    revenueMultiplier: UPSIDE_REVENUE_MULTIPLIER,
    fixedCostMultiplier: UPSIDE_FIXED_COST_MULTIPLIER,
  },
];

/**
 * Monthly operating outlook from revenue, a variable-cost rate, and fixed costs.
 *
 * variableCosts = revenue * (rate / 100)
 * contribution = revenue - variableCosts
 * operatingProfit = contribution - fixedCosts
 *
 * Margin is undefined when revenue is zero. Break-even revenue is
 * fixedCosts / (1 - rate/100) when the variable-cost rate is below 100%
 * and that quotient is finite. A 100% rate has no unique finite threshold.
 *
 * Downside, base, and upside are stated arithmetic shocks, not forecasts.
 * Invalid numbers are rejected. Nothing is clamped or rounded.
 */
export function calculateOperatingOutlook(
  input: OperatingOutlookInput,
): OperatingOutlookCalculation {
  const monthlyRevenue = input.monthlyRevenue;
  const variableCostRatePercent = input.variableCostRatePercent;
  const monthlyFixedCosts = input.monthlyFixedCosts;

  if (!Number.isFinite(monthlyRevenue)) {
    return reject("non-finite-monthly-revenue");
  }

  if (monthlyRevenue < 0) {
    return reject("negative-monthly-revenue");
  }

  if (!Number.isFinite(variableCostRatePercent)) {
    return reject("non-finite-variable-cost-rate");
  }

  if (variableCostRatePercent < 0) {
    return reject("variable-cost-rate-below-zero");
  }

  if (variableCostRatePercent > 100) {
    return reject("variable-cost-rate-above-100");
  }

  if (!Number.isFinite(monthlyFixedCosts)) {
    return reject("non-finite-monthly-fixed-costs");
  }

  if (monthlyFixedCosts < 0) {
    return reject("negative-monthly-fixed-costs");
  }

  const variableCostRate = variableCostRatePercent / 100;

  if (!Number.isFinite(variableCostRate) || variableCostRate > 1) {
    return reject("non-finite-result");
  }

  const rateIsTotal = variableCostRatePercent === 100;
  const scenarios = {
    base: undefined as OperatingOutlookScenario | undefined,
    downside: undefined as OperatingOutlookScenario | undefined,
    upside: undefined as OperatingOutlookScenario | undefined,
  };

  for (const definition of scenarioDefinitions) {
    const scenario = calculateScenario({
      scenario: definition.scenario,
      monthlyRevenue: monthlyRevenue * definition.revenueMultiplier,
      variableCostRatePercent,
      variableCostRate,
      rateIsTotal,
      monthlyFixedCosts:
        monthlyFixedCosts * definition.fixedCostMultiplier,
      revenueMultiplier: definition.revenueMultiplier,
      fixedCostMultiplier: definition.fixedCostMultiplier,
    });

    if (scenario === null) {
      return reject("non-finite-result");
    }

    scenarios[definition.scenario] = scenario;
  }

  if (
    scenarios.base === undefined ||
    scenarios.downside === undefined ||
    scenarios.upside === undefined
  ) {
    return reject("non-finite-result");
  }

  return {
    ok: true,
    result: {
      input: {
        monthlyRevenue,
        variableCostRatePercent,
        monthlyFixedCosts,
      },
      base: scenarios.base,
      downside: scenarios.downside,
      upside: scenarios.upside,
      assumptions: OPERATING_OUTLOOK_ASSUMPTIONS,
    },
  };
}

function reject(
  code: OperatingOutlookRejectionCode,
): OperatingOutlookCalculation {
  return { ok: false, code };
}

function calculateScenario({
  scenario,
  monthlyRevenue,
  variableCostRatePercent,
  variableCostRate,
  rateIsTotal,
  monthlyFixedCosts,
  revenueMultiplier,
  fixedCostMultiplier,
}: {
  scenario: OperatingOutlookScenarioId;
  monthlyRevenue: number;
  variableCostRatePercent: number;
  variableCostRate: number;
  rateIsTotal: boolean;
  monthlyFixedCosts: number;
  revenueMultiplier: number;
  fixedCostMultiplier: number;
}): OperatingOutlookScenario | null {
  if (!Number.isFinite(monthlyRevenue) || !Number.isFinite(monthlyFixedCosts)) {
    return null;
  }

  const variableCosts = monthlyRevenue * variableCostRate;
  const contribution = monthlyRevenue - variableCosts;
  const operatingProfitBeforeFinancingAndTaxes =
    contribution - monthlyFixedCosts;

  if (
    !Number.isFinite(variableCosts) ||
    !Number.isFinite(contribution) ||
    !Number.isFinite(operatingProfitBeforeFinancingAndTaxes)
  ) {
    return null;
  }

  const operatingMarginPercent =
    monthlyRevenue > 0
      ? (operatingProfitBeforeFinancingAndTaxes / monthlyRevenue) * 100
      : null;

  if (
    operatingMarginPercent !== null &&
    !Number.isFinite(operatingMarginPercent)
  ) {
    return null;
  }

  const breakEven = breakEvenFor(
    rateIsTotal,
    monthlyFixedCosts,
    variableCostRate,
  );

  if (breakEven === null) {
    return null;
  }

  return {
    scenario,
    monthlyRevenue,
    variableCostRatePercent,
    monthlyFixedCosts,
    variableCosts,
    contribution,
    operatingProfitBeforeFinancingAndTaxes,
    operatingMarginPercent,
    breakEvenRevenue: breakEven.breakEvenRevenue,
    breakEvenStatus: breakEven.breakEvenStatus,
    assumptions: {
      revenueMultiplier,
      fixedCostMultiplier,
      variableCostRateUnchanged: true,
      interpretation: "arithmetic-shock-not-a-forecast",
    },
  };
}

function breakEvenFor(
  rateIsTotal: boolean,
  monthlyFixedCosts: number,
  variableCostRate: number,
): {
  breakEvenRevenue: number | null;
  breakEvenStatus: OperatingOutlookBreakEvenStatus;
} | null {
  if (rateIsTotal) {
    if (monthlyFixedCosts === 0) {
      return {
        breakEvenRevenue: null,
        breakEvenStatus: "zero-profit-at-all-revenue",
      };
    }

    return {
      breakEvenRevenue: null,
      breakEvenStatus: "no-finite-threshold",
    };
  }

  const contributionRatio = 1 - variableCostRate;
  const breakEvenRevenue = monthlyFixedCosts / contributionRatio;

  if (!Number.isFinite(breakEvenRevenue)) {
    return null;
  }

  return {
    breakEvenRevenue,
    breakEvenStatus: "unique-threshold",
  };
}
