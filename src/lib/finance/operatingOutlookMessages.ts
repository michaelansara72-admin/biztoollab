import type {
  OperatingOutlookBreakEvenStatus,
  OperatingOutlookRejectionCode,
} from "./calculateOperatingOutlook";

export type OperatingOutlookField =
  | "monthlyRevenue"
  | "variableCostRatePercent"
  | "monthlyFixedCosts";

export type OperatingOutlookInputBoundaryReason = "blank" | "invalid" | "infinite";

export type ParsedOperatingOutlookNumber =
  | { ok: true; value: number }
  | { ok: false; reason: OperatingOutlookInputBoundaryReason };

export const OPERATING_OUTLOOK_REJECTION_MESSAGES: Record<
  OperatingOutlookRejectionCode,
  string
> = {
  "non-finite-monthly-revenue": "Enter a real monthly revenue amount.",
  "negative-monthly-revenue": "Monthly revenue cannot be negative.",
  "non-finite-variable-cost-rate": "Enter a real variable-cost percentage.",
  "variable-cost-rate-below-zero":
    "The variable-cost percentage cannot be negative.",
  "variable-cost-rate-above-100":
    "The variable-cost percentage cannot be above 100%.",
  "non-finite-monthly-fixed-costs": "Enter a real monthly fixed-cost amount.",
  "negative-monthly-fixed-costs": "Monthly fixed costs cannot be negative.",
  "non-finite-result":
    "These amounts are too large to produce a finite operating result.",
};

export const OPERATING_OUTLOOK_REJECTION_FIELDS: Record<
  OperatingOutlookRejectionCode,
  OperatingOutlookField | null
> = {
  "non-finite-monthly-revenue": "monthlyRevenue",
  "negative-monthly-revenue": "monthlyRevenue",
  "non-finite-variable-cost-rate": "variableCostRatePercent",
  "variable-cost-rate-below-zero": "variableCostRatePercent",
  "variable-cost-rate-above-100": "variableCostRatePercent",
  "non-finite-monthly-fixed-costs": "monthlyFixedCosts",
  "negative-monthly-fixed-costs": "monthlyFixedCosts",
  "non-finite-result": null,
};

export const OPERATING_OUTLOOK_BREAK_EVEN_MESSAGES: Record<
  OperatingOutlookBreakEvenStatus,
  string
> = {
  "unique-threshold":
    "This is the monthly revenue where operating profit is zero, before financing and taxes.",
  "no-finite-threshold":
    "A 100% variable-cost rate with positive fixed costs has no finite break-even revenue.",
  "zero-profit-at-all-revenue":
    "A 100% variable-cost rate with zero fixed costs produces zero operating profit at all revenue levels.",
};

export const UNDEFINED_OPERATING_MARGIN_MESSAGE =
  "Operating margin is undefined because monthly revenue is zero.";

export const OPERATING_OUTLOOK_SCENARIO_EXPLANATION =
  "Downside revenue decreases 15% and fixed costs increase 10%. Upside revenue increases 15% and fixed costs stay unchanged. The variable-cost rate stays unchanged. These are arithmetic illustrations, not forecasts. Operating profit is before financing and taxes.";

const INPUT_BOUNDARY_MESSAGES: Record<
  OperatingOutlookField,
  Record<OperatingOutlookInputBoundaryReason, string>
> = {
  monthlyRevenue: {
    blank: "Enter monthly revenue.",
    invalid: "Enter monthly revenue as a number.",
    infinite: "Enter a finite monthly revenue amount.",
  },
  variableCostRatePercent: {
    blank: "Enter the variable-cost percentage.",
    invalid: "Enter the variable-cost percentage as a number.",
    infinite: "Enter a finite variable-cost percentage.",
  },
  monthlyFixedCosts: {
    blank: "Enter monthly fixed costs.",
    invalid: "Enter monthly fixed costs as a number.",
    infinite: "Enter a finite monthly fixed-cost amount.",
  },
};

const NUMERIC_TEXT = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/;

export function operatingOutlookRejectionMessage(
  code: OperatingOutlookRejectionCode,
): string {
  return OPERATING_OUTLOOK_REJECTION_MESSAGES[code];
}

export function operatingOutlookRejectionField(
  code: OperatingOutlookRejectionCode,
): OperatingOutlookField | null {
  return OPERATING_OUTLOOK_REJECTION_FIELDS[code];
}

export function operatingOutlookBreakEvenMessage(
  status: OperatingOutlookBreakEvenStatus,
): string {
  return OPERATING_OUTLOOK_BREAK_EVEN_MESSAGES[status];
}

export function undefinedOperatingMarginMessage(
  operatingMarginPercent: number | null,
): string | null {
  if (operatingMarginPercent === null) {
    return UNDEFINED_OPERATING_MARGIN_MESSAGE;
  }

  return null;
}

export function operatingOutlookInputMessage(
  field: OperatingOutlookField,
  reason: OperatingOutlookInputBoundaryReason,
): string {
  return INPUT_BOUNDARY_MESSAGES[field][reason];
}

export function parseOperatingOutlookNumber(
  text: string,
): ParsedOperatingOutlookNumber {
  const trimmed = text.trim();

  if (trimmed === "") {
    return { ok: false, reason: "blank" };
  }

  if (!NUMERIC_TEXT.test(trimmed)) {
    return { ok: false, reason: "invalid" };
  }

  const value = Number(trimmed);

  if (Number.isNaN(value)) {
    return { ok: false, reason: "invalid" };
  }

  if (!Number.isFinite(value)) {
    return { ok: false, reason: "infinite" };
  }

  return { ok: true, value };
}
