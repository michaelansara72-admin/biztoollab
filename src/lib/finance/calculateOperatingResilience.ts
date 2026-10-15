import {
  calculateOperatingOutlook,
  type OperatingOutlookBreakEvenStatus,
  type OperatingOutlookInput,
  type OperatingOutlookRejectionCode,
  type OperatingOutlookScenario,
  type OperatingOutlookScenarioAssumptions,
  type OperatingOutlookScenarioId,
} from "./calculateOperatingOutlook";

export type OperatingResilienceProfitStatus = "positive" | "zero" | "negative";

/**
 * Margin of safety availability.
 *
 * `defined` includes a signed dollar gap and a signed revenue fraction.
 * `amount-defined-percent-unavailable` is a unique threshold at zero revenue:
 * the dollar gap exists and the fraction does not, because there is no
 * revenue to divide by.
 * The two unavailable statuses follow the engine break-even status and carry
 * no numeric margin of safety.
 */
export type OperatingResilienceMarginOfSafety =
  | {
      status: "defined";
      amount: number;
      ratio: number;
    }
  | {
      status: "amount-defined-percent-unavailable";
      amount: number;
      ratio: null;
    }
  | {
      status: "unavailable-no-finite-threshold";
      amount: null;
      ratio: null;
    }
  | {
      status: "unavailable-no-unique-threshold";
      amount: null;
      ratio: null;
    };

export type OperatingResilienceScenario = {
  scenario: OperatingOutlookScenarioId;
  monthlyRevenue: number;
  variableCostRatePercent: number;
  monthlyFixedCosts: number;
  variableCosts: number;
  contribution: number;
  operatingProfitBeforeFinancingAndTaxes: number;
  /** Engine percent points. 20 means 20 percent. Null when revenue is zero. */
  operatingMarginPercent: number | null;
  /**
   * Engine operating margin divided by 100. 0.2 means the same margin as 20
   * percent points. Null when revenue is zero.
   */
  operatingMarginRatio: number | null;
  breakEvenRevenue: number | null;
  breakEvenStatus: OperatingOutlookBreakEvenStatus;
  profitStatus: OperatingResilienceProfitStatus;
  /**
   * Dollar `amount` is scenario revenue minus the engine break-even revenue.
   * `ratio` is that amount divided by scenario revenue.
   * About 0.2857 means 28.57 percent of revenue. It is not stored in percent points.
   */
  marginOfSafety: OperatingResilienceMarginOfSafety;
  assumptions: OperatingOutlookScenarioAssumptions;
};

export type OperatingResilienceResult = {
  input: OperatingOutlookInput;
  /**
   * Structural contribution margin ratio, `1 - variableCostRatePercent / 100`.
   * It does not depend on the revenue amount.
   */
  contributionMarginRatio: number;
  base: OperatingResilienceScenario;
  downside: OperatingResilienceScenario;
};

export type OperatingResilienceCalculation =
  | { ok: true; result: OperatingResilienceResult }
  | { ok: false; code: OperatingOutlookRejectionCode };

/**
 * Operating resilience from the existing operating-outlook engine.
 *
 * Profit, margin, scenarios, and break-even status come from that engine.
 * This function adds the contribution-margin ratio, a signed margin of safety,
 * and an exact profit classification. It does not round, clamp, or score
 * financial health.
 */
export function calculateOperatingResilience(
  input: OperatingOutlookInput,
): OperatingResilienceCalculation {
  const calculation = calculateOperatingOutlook(input);

  if (!calculation.ok) {
    return { ok: false, code: calculation.code };
  }

  const contributionMarginRatio =
    1 - calculation.result.input.variableCostRatePercent / 100;

  if (!Number.isFinite(contributionMarginRatio)) {
    return rejectNonFinite();
  }

  const base = deriveScenario(calculation.result.base);
  const downside = deriveScenario(calculation.result.downside);

  if (base === null || downside === null) {
    return rejectNonFinite();
  }

  return {
    ok: true,
    result: {
      input: {
        monthlyRevenue: calculation.result.input.monthlyRevenue,
        variableCostRatePercent:
          calculation.result.input.variableCostRatePercent,
        monthlyFixedCosts: calculation.result.input.monthlyFixedCosts,
      },
      contributionMarginRatio,
      base,
      downside,
    },
  };
}

function rejectNonFinite(): OperatingResilienceCalculation {
  return { ok: false, code: "non-finite-result" };
}

function classifyProfit(profit: number): OperatingResilienceProfitStatus {
  if (profit > 0) {
    return "positive";
  }

  if (profit < 0) {
    return "negative";
  }

  return "zero";
}

function deriveScenario(
  scenario: OperatingOutlookScenario,
): OperatingResilienceScenario | null {
  const operatingProfit = scenario.operatingProfitBeforeFinancingAndTaxes;

  if (
    !Number.isFinite(scenario.monthlyRevenue) ||
    !Number.isFinite(scenario.variableCostRatePercent) ||
    !Number.isFinite(scenario.monthlyFixedCosts) ||
    !Number.isFinite(scenario.variableCosts) ||
    !Number.isFinite(scenario.contribution) ||
    !Number.isFinite(operatingProfit) ||
    !Number.isFinite(scenario.assumptions.revenueMultiplier) ||
    !Number.isFinite(scenario.assumptions.fixedCostMultiplier)
  ) {
    return null;
  }

  if (
    scenario.operatingMarginPercent !== null &&
    !Number.isFinite(scenario.operatingMarginPercent)
  ) {
    return null;
  }

  const operatingMarginRatio =
    scenario.operatingMarginPercent === null
      ? null
      : scenario.operatingMarginPercent / 100;

  if (
    operatingMarginRatio !== null &&
    !Number.isFinite(operatingMarginRatio)
  ) {
    return null;
  }

  const marginOfSafety = deriveMarginOfSafety(scenario);

  if (marginOfSafety === null) {
    return null;
  }

  return {
    scenario: scenario.scenario,
    monthlyRevenue: scenario.monthlyRevenue,
    variableCostRatePercent: scenario.variableCostRatePercent,
    monthlyFixedCosts: scenario.monthlyFixedCosts,
    variableCosts: scenario.variableCosts,
    contribution: scenario.contribution,
    operatingProfitBeforeFinancingAndTaxes: operatingProfit,
    operatingMarginPercent: scenario.operatingMarginPercent,
    operatingMarginRatio,
    breakEvenRevenue:
      scenario.breakEvenStatus === "unique-threshold"
        ? scenario.breakEvenRevenue
        : null,
    breakEvenStatus: scenario.breakEvenStatus,
    profitStatus: classifyProfit(operatingProfit),
    marginOfSafety,
    assumptions: {
      revenueMultiplier: scenario.assumptions.revenueMultiplier,
      fixedCostMultiplier: scenario.assumptions.fixedCostMultiplier,
      variableCostRateUnchanged: true,
      interpretation: scenario.assumptions.interpretation,
    },
  };
}

function deriveMarginOfSafety(
  scenario: OperatingOutlookScenario,
): OperatingResilienceMarginOfSafety | null {
  if (scenario.breakEvenStatus === "unique-threshold") {
    const breakEvenRevenue = scenario.breakEvenRevenue;

    if (breakEvenRevenue === null || !Number.isFinite(breakEvenRevenue)) {
      return null;
    }

    const amount = scenario.monthlyRevenue - breakEvenRevenue;

    if (!Number.isFinite(amount)) {
      return null;
    }

    if (!(scenario.monthlyRevenue > 0)) {
      return {
        status: "amount-defined-percent-unavailable",
        amount,
        ratio: null,
      };
    }

    const ratio = amount / scenario.monthlyRevenue;

    if (!Number.isFinite(ratio)) {
      return null;
    }

    return {
      status: "defined",
      amount,
      ratio,
    };
  }

  if (scenario.breakEvenRevenue !== null) {
    return null;
  }

  if (scenario.breakEvenStatus === "no-finite-threshold") {
    return {
      status: "unavailable-no-finite-threshold",
      amount: null,
      ratio: null,
    };
  }

  if (scenario.breakEvenStatus === "zero-profit-at-all-revenue") {
    return {
      status: "unavailable-no-unique-threshold",
      amount: null,
      ratio: null,
    };
  }

  return null;
}
