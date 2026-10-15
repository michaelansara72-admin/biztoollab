import type {
  OperatingResilienceProfitStatus,
  OperatingResilienceResult,
  OperatingResilienceScenario,
} from "./calculateOperatingResilience";

/**
 * USD cents, matching the two-decimal currency display used by the
 * operating outlook calculator. This module does not format currency.
 */
export const OPERATING_RESILIENCE_CURRENCY_FRACTION_DIGITS = 2;

export type OperatingResilienceFindingCategory =
  | "profitability"
  | "break-even"
  | "downside"
  | "limitation";

/**
 * How an unrounded amount relates to a two-decimal dollar display.
 * `nonzero-rounds-to-zero-cents` means the display would show $0.00
 * while the classified amount is not exactly zero.
 */
export type OperatingResilienceCentsDisplay =
  | "exact-zero"
  | "nonzero-rounds-to-zero-cents"
  | "visible-at-cents"
  | "not-applicable";

export type OperatingResilienceFindingPrecision = {
  classification: OperatingResilienceProfitStatus | "unavailable";
  centsDisplay: OperatingResilienceCentsDisplay;
};

export type OperatingResilienceFinding = {
  id: string;
  category: OperatingResilienceFindingCategory;
  headline: string;
  explanation: string;
  nextStep: string;
  caveat?: string;
  precision?: OperatingResilienceFindingPrecision;
};

const LIMITATION_IDS = [
  "entered-assumptions",
  "not-cash-flow-or-net-income",
  "scenarios-are-illustrations",
  "outside-this-assessment",
] as const;

/**
 * Describes whether a dollar amount would display as $0.00 at cent precision.
 * Exact classification stays with the calculation result. This check does not
 * change that classification.
 */
export function operatingResilienceCentsDisplay(
  amount: number,
): Exclude<OperatingResilienceCentsDisplay, "not-applicable"> {
  if (amount === 0) {
    return "exact-zero";
  }

  const scale = 10 ** OPERATING_RESILIENCE_CURRENCY_FRACTION_DIGITS;
  const scaled = amount * scale;
  // Half away from zero. Math.round alone maps -0.5 to 0, which would
  // describe a half-cent loss as a $0.00 display.
  const magnitude = scaled < 0 ? -scaled : scaled;

  if (Math.round(magnitude) === 0) {
    return "nonzero-rounds-to-zero-cents";
  }

  return "visible-at-cents";
}

/**
 * Plain-language findings for one successful operating-resilience result.
 * Profit, break-even, and margin of safety are read from that result.
 */
export function interpretOperatingResilience(
  result: OperatingResilienceResult,
): OperatingResilienceFinding[] {
  const transition = transitionFinding(result);

  return [
    profitabilityFinding(result.base),
    breakEvenFinding(result.base),
    downsideProfitFinding(result.downside),
    ...(transition === null ? [] : [transition]),
    ...limitationFindings(result),
  ];
}

function profitabilityFinding(
  scenario: OperatingResilienceScenario,
): OperatingResilienceFinding {
  const centsDisplay = operatingResilienceCentsDisplay(
    scenario.operatingProfitBeforeFinancingAndTaxes,
  );
  const copy = signedAmountCopy({
    status: scenario.profitStatus,
    centsDisplay,
    visible: {
      positive: "This month's operating profit is above zero.",
      negative: "This month's operating profit is below zero.",
    },
    subCent: {
      positive: "This month's operating profit is above zero by less than one cent.",
      negative: "This month's operating profit is below zero by less than one cent.",
    },
    exactZero: "This month's operating profit is exactly zero.",
    visibleExplanation: {
      positive:
        "The entered revenue covers variable costs and fixed operating costs, with operating profit left over.",
      negative:
        "The entered revenue does not cover variable costs and fixed operating costs.",
      zero:
        "The entered revenue covers variable costs and fixed operating costs with nothing left over and no shortfall.",
    },
  });

  return {
    id: `base-operating-profit-${scenario.profitStatus}`,
    category: "profitability",
    headline: copy.headline,
    explanation: copy.explanation,
    nextStep:
      scenario.profitStatus === "negative"
        ? "Look at the variable-cost rate and the fixed operating costs that create the shortfall."
        : "Check whether the variable-cost rate and fixed operating costs match this month's bills.",
    caveat: "Operating profit here is before financing and taxes.",
    precision: {
      classification: scenario.profitStatus,
      centsDisplay,
    },
  };
}

function breakEvenFinding(
  scenario: OperatingResilienceScenario,
): OperatingResilienceFinding {
  const margin = scenario.marginOfSafety;

  if (margin.status === "unavailable-no-finite-threshold") {
    return {
      id: "break-even-no-finite-threshold",
      category: "break-even",
      headline: "No finite break-even revenue exists for these costs.",
      explanation:
        "A 100% variable-cost rate with fixed costs above zero leaves no revenue level that covers those fixed costs. Margin of safety is not calculated.",
      nextStep: "Check whether the variable-cost rate should be below 100%.",
      caveat:
        "Operating profit is still reported. A missing threshold is not a break-even of $0.",
      precision: {
        classification: "unavailable",
        centsDisplay: "not-applicable",
      },
    };
  }

  if (margin.status === "unavailable-no-unique-threshold") {
    return {
      id: "break-even-no-unique-threshold",
      category: "break-even",
      headline: "No single break-even revenue exists for these costs.",
      explanation:
        "A 100% variable-cost rate with zero fixed costs produces zero operating profit at every revenue level. Margin of safety is not calculated.",
      nextStep:
        "Check whether variable costs really consume the entire revenue dollar.",
      caveat:
        "Zero operating profit at every revenue level is not a break-even of $0.",
      precision: {
        classification: "unavailable",
        centsDisplay: "not-applicable",
      },
    };
  }

  const status = amountStatus(margin.amount);
  const centsDisplay = operatingResilienceCentsDisplay(margin.amount);
  const percentageSentence =
    margin.status === "amount-defined-percent-unavailable"
      ? " A margin-of-safety percentage is unavailable because monthly revenue is zero."
      : "";
  const copy = signedAmountCopy({
    status,
    centsDisplay,
    visible: {
      positive: "Monthly revenue is above break-even.",
      negative: "Monthly revenue is below break-even.",
    },
    subCent: {
      positive: "Monthly revenue is above break-even by less than one cent.",
      negative: "Monthly revenue is below break-even by less than one cent.",
    },
    exactZero: "The dollar gap between revenue and break-even is exactly zero.",
    visibleExplanation: {
      positive:
        "The signed gap is this scenario's revenue minus its break-even revenue. At the same variable-cost rate and fixed costs, it is how far revenue can fall before operating profit reaches zero.",
      negative:
        "The signed gap is below zero, so entered revenue is short of the unique break-even revenue.",
      zero:
        "Entered revenue and break-even revenue are equal. The unrounded margin of safety is zero.",
    },
  });

  return {
    id:
      margin.status === "amount-defined-percent-unavailable"
        ? "margin-of-safety-percent-unavailable"
        : `margin-of-safety-${status}`,
    category: "break-even",
    headline: `${copy.headline}${percentageSentence}`,
    explanation: `${copy.explanation}${percentageSentence}`,
    nextStep:
      margin.status === "amount-defined-percent-unavailable"
        ? "Enter this month's revenue if zero was a placeholder rather than the month you want to assess."
        : status === "negative"
          ? "Compare entered revenue with break-even revenue at this variable-cost rate."
          : "Check whether this revenue level is the month you mean to assess.",
    caveat:
      margin.status === "amount-defined-percent-unavailable"
        ? "A missing percentage is not zero percent. The dollar gap is not cash on hand."
        : "The gap is not cash on hand and does not measure how long the business can continue.",
    precision: {
      classification: status,
      centsDisplay,
    },
  };
}

function downsideProfitFinding(
  scenario: OperatingResilienceScenario,
): OperatingResilienceFinding {
  const centsDisplay = operatingResilienceCentsDisplay(
    scenario.operatingProfitBeforeFinancingAndTaxes,
  );
  const shock = shockSentence(scenario);
  const copy = signedAmountCopy({
    status: scenario.profitStatus,
    centsDisplay,
    visible: {
      positive: "The downside illustration still has operating profit above zero.",
      negative: "The downside illustration has operating profit below zero.",
    },
    subCent: {
      positive:
        "The downside illustration has operating profit above zero by less than one cent.",
      negative:
        "The downside illustration has operating profit below zero by less than one cent.",
    },
    exactZero:
      "The downside illustration has operating profit of exactly zero.",
    visibleExplanation: {
      positive: `${shock} Operating profit is still above zero under those stated changes.`,
      negative: `${shock} Operating profit is below zero under those stated changes.`,
      zero: `${shock} The unrounded operating profit is zero under those stated changes.`,
    },
  });

  return {
    id: `downside-operating-profit-${scenario.profitStatus}`,
    category: "downside",
    headline: copy.headline,
    explanation: copy.explanation,
    nextStep:
      "Ask which fixed costs could rise by more than the stated fixed-cost change, and which revenue decline you actually want to inspect.",
    caveat: "This is an arithmetic illustration, not a forecast.",
    precision: {
      classification: scenario.profitStatus,
      centsDisplay,
    },
  };
}

function transitionFinding(
  result: OperatingResilienceResult,
): OperatingResilienceFinding | null {
  const baseStatus = result.base.profitStatus;
  const downsideStatus = result.downside.profitStatus;

  if (baseStatus === "positive" && downsideStatus === "negative") {
    return {
      id: "base-profitable-downside-unprofitable",
      category: "downside",
      headline:
        "Operating profit is above zero for the entered month and below zero in the downside illustration.",
      explanation:
        "The entered month covers variable and fixed operating costs. The stated downside changes use up that remainder.",
      nextStep: "See which fixed costs are included in the stated downside increase.",
      caveat:
        "A base result above zero can still coincide with a downside result below zero. The illustration is not a prediction.",
    };
  }

  if (baseStatus === "negative" && downsideStatus === "negative") {
    return {
      id: "base-and-downside-unprofitable",
      category: "downside",
      headline:
        "Operating profit is below zero for the entered month and in the downside illustration.",
      explanation:
        "The entered month does not cover variable and fixed operating costs, and the stated downside illustration is also below zero.",
      nextStep:
        "Look at the variable-cost rate and fixed operating costs before treating a higher revenue figure as given.",
      caveat: "The downside illustration is not a forecast of a further decline.",
    };
  }

  return null;
}

function limitationFindings(
  result: OperatingResilienceResult,
): OperatingResilienceFinding[] {
  const shock = shockSentence(result.downside);

  return [
    {
      id: LIMITATION_IDS[0],
      category: "limitation",
      headline: "These findings use the revenue and costs you entered.",
      explanation:
        "Changing monthly revenue, the variable-cost rate, or monthly fixed operating costs changes the result.",
      nextStep:
        "Compare the entries with the sales and bills you are trying to represent.",
      caveat: "The downside illustration keeps the variable-cost rate unchanged.",
    },
    {
      id: LIMITATION_IDS[1],
      category: "limitation",
      headline: "Operating profit is not cash flow or net income.",
      explanation:
        "The figure subtracts variable costs and fixed operating costs from revenue. It is calculated before financing and taxes.",
      nextStep:
        "Keep loan payments, owner pay, and income taxes in a separate review.",
      caveat:
        "A positive operating profit can still coincide with a cash shortfall.",
    },
    {
      id: LIMITATION_IDS[2],
      category: "limitation",
      headline: "The downside case is an illustration, not a forecast.",
      explanation: `${shock} It does not predict what will happen.`,
      nextStep:
        "Use the stated changes as a sensitivity check, then test changes that match your own costs.",
      caveat: "The variable-cost rate does not change in this illustration.",
    },
    {
      id: LIMITATION_IDS[3],
      category: "limitation",
      headline: "Liquidity, debt service, and taxes are outside this assessment.",
      explanation:
        "This operating-resilience assessment describes operating profit, the break-even gap, and one stated downside case.",
      nextStep:
        "Review cash timing, required debt payments, and taxes with the records for those items.",
      caveat:
        "Those items can change whether the entered month meets its obligations.",
    },
  ];
}

function shockSentence(scenario: OperatingResilienceScenario): string {
  const revenueMultiplier = scenario.assumptions.revenueMultiplier;
  const fixedCostMultiplier = scenario.assumptions.fixedCostMultiplier;
  const rateSentence = scenario.assumptions.variableCostRateUnchanged
    ? "The variable-cost rate stays unchanged."
    : "The variable-cost rate changes in this illustration.";

  return `The downside illustration multiplies revenue by ${revenueMultiplier} and fixed costs by ${fixedCostMultiplier}. ${rateSentence}`;
}

function amountStatus(amount: number): OperatingResilienceProfitStatus {
  if (amount > 0) {
    return "positive";
  }

  if (amount < 0) {
    return "negative";
  }

  return "zero";
}

function signedAmountCopy({
  status,
  centsDisplay,
  visible,
  subCent,
  exactZero,
  visibleExplanation,
}: {
  status: OperatingResilienceProfitStatus;
  centsDisplay: Exclude<OperatingResilienceCentsDisplay, "not-applicable">;
  visible: { positive: string; negative: string };
  subCent: { positive: string; negative: string };
  exactZero: string;
  visibleExplanation: { positive: string; negative: string; zero: string };
}): { headline: string; explanation: string } {
  if (status === "zero") {
    return {
      headline: exactZero,
      explanation: visibleExplanation.zero,
    };
  }

  if (centsDisplay === "nonzero-rounds-to-zero-cents") {
    return {
      headline: status === "positive" ? subCent.positive : subCent.negative,
      explanation:
        status === "positive"
          ? "The unrounded result is positive. A dollar display rounded to cents would show $0.00, and that display is not an exact zero."
          : "The unrounded result is negative. A dollar display rounded to cents would show $0.00, and that display is not an exact zero.",
    };
  }

  if (centsDisplay === "exact-zero") {
    return {
      headline:
        status === "positive"
          ? "The classification is positive, while the unrounded amount is exactly zero."
          : "The classification is negative, while the unrounded amount is exactly zero.",
      explanation:
        "The calculation classification and the unrounded amount disagree. This finding does not treat that amount as an exact zero result.",
    };
  }

  return {
    headline: status === "positive" ? visible.positive : visible.negative,
    explanation:
      status === "positive"
        ? visibleExplanation.positive
        : visibleExplanation.negative,
  };
}
