export type RoiInputs = {
  initialInvestment: number;
  finalValue: number;
  holdingPeriodYears: number;
};

export type RoiResults = {
  netProfit: number;
  roiPercent: number;
  returnMultiple: number;
  annualizedReturnPercent: number;
};

/**
 * Simple ROI and compound annualized return.
 *
 * Annualized return is
 * ((finalValue / initialInvestment) ** (1 / years) - 1) * 100.
 * A final value of zero is a total loss, so the annualized return is -100%.
 *
 * Returns null when the inputs are outside this calculator's domain:
 * non-finite numbers, a non-positive investment, a negative final value,
 * or a non-positive holding period. Those cases are not given a substitute percentage.
 */
export function calculateRoi(inputs: RoiInputs): RoiResults | null {
  const { initialInvestment, finalValue, holdingPeriodYears } = inputs;

  if (
    !Number.isFinite(initialInvestment) ||
    !Number.isFinite(finalValue) ||
    !Number.isFinite(holdingPeriodYears)
  ) {
    return null;
  }

  if (
    initialInvestment <= 0 ||
    finalValue < 0 ||
    holdingPeriodYears <= 0
  ) {
    return null;
  }

  const netProfit = finalValue - initialInvestment;
  const roiPercent = (netProfit / initialInvestment) * 100;
  const returnMultiple = finalValue / initialInvestment;
  const annualizedReturnPercent =
    (Math.pow(finalValue / initialInvestment, 1 / holdingPeriodYears) -
      1) *
    100;

  return {
    netProfit,
    roiPercent,
    returnMultiple,
    annualizedReturnPercent,
  };
}
