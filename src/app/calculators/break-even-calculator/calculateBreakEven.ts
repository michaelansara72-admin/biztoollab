export type BreakEvenInputs = {
  fixedCosts: number;
  sellingPrice: number;
  variableCost: number;
  targetProfit: number;
};

export type BreakEvenResults = {
  contributionMarginPerUnit: number;
  contributionMarginRatio: number;
  breakEvenUnits: number | null;
  breakEvenUnitsRoundedUp: number | null;
  breakEvenRevenue: number | null;
  targetProfitUnits: number | null;
  targetProfitUnitsRoundedUp: number | null;
  targetProfitRevenue: number | null;
};

/**
 * Unit break-even and target-profit results.
 *
 * Exact units are fixed costs, or fixed costs plus target profit, divided by
 * contribution margin per unit. Revenue is that exact unit count times the
 * selling price. Rounded-up units are a separate whole-unit count.
 *
 * Units and revenue are null when contribution margin is not positive.
 */
export function calculateBreakEven(
  inputs: BreakEvenInputs,
): BreakEvenResults {
  const { fixedCosts, sellingPrice, variableCost, targetProfit } = inputs;

  const contributionMarginPerUnit = sellingPrice - variableCost;

  const contributionMarginRatio =
    sellingPrice > 0 ? contributionMarginPerUnit / sellingPrice : 0;

  const breakEvenUnits =
    contributionMarginPerUnit > 0
      ? fixedCosts / contributionMarginPerUnit
      : null;

  const breakEvenRevenue =
    contributionMarginRatio > 0
      ? fixedCosts / contributionMarginRatio
      : null;

  const targetProfitUnits =
    contributionMarginPerUnit > 0
      ? (fixedCosts + targetProfit) / contributionMarginPerUnit
      : null;

  const targetProfitRevenue =
    contributionMarginRatio > 0
      ? (fixedCosts + targetProfit) / contributionMarginRatio
      : null;

  return {
    contributionMarginPerUnit,
    contributionMarginRatio,
    breakEvenUnits,
    breakEvenUnitsRoundedUp:
      breakEvenUnits === null ? null : Math.ceil(breakEvenUnits),
    breakEvenRevenue,
    targetProfitUnits,
    targetProfitUnitsRoundedUp:
      targetProfitUnits === null ? null : Math.ceil(targetProfitUnits),
    targetProfitRevenue,
  };
}

/**
 * Whole-dollar amounts stay in dollars. Amounts with cents keep two decimal
 * places so a margin such as $0.40 is not shown as $0.
 */
export function formatContributionMargin(value: number): string {
  const needsCents = Math.abs(value - Math.round(value)) >= 0.005;

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: needsCents ? 2 : 0,
    maximumFractionDigits: needsCents ? 2 : 0,
  }).format(value);
}
