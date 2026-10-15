import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  BASE_FIXED_COST_MULTIPLIER,
  BASE_REVENUE_MULTIPLIER,
  DOWNSIDE_FIXED_COST_MULTIPLIER,
  DOWNSIDE_REVENUE_MULTIPLIER,
  UPSIDE_FIXED_COST_MULTIPLIER,
  UPSIDE_REVENUE_MULTIPLIER,
  type OperatingOutlookBreakEvenStatus,
  type OperatingOutlookRejectionCode,
} from "../src/lib/finance/calculateOperatingOutlook";
import {
  OPERATING_OUTLOOK_BREAK_EVEN_MESSAGES,
  OPERATING_OUTLOOK_REJECTION_MESSAGES,
  OPERATING_OUTLOOK_SCENARIO_EXPLANATION,
  UNDEFINED_OPERATING_MARGIN_MESSAGE,
  operatingOutlookBreakEvenMessage,
  operatingOutlookInputMessage,
  operatingOutlookRejectionField,
  operatingOutlookRejectionMessage,
  parseOperatingOutlookNumber,
  undefinedOperatingMarginMessage,
} from "../src/lib/finance/operatingOutlookMessages";

const rejectionCodes: OperatingOutlookRejectionCode[] = [
  "non-finite-monthly-revenue",
  "negative-monthly-revenue",
  "non-finite-variable-cost-rate",
  "variable-cost-rate-below-zero",
  "variable-cost-rate-above-100",
  "non-finite-monthly-fixed-costs",
  "negative-monthly-fixed-costs",
  "non-finite-result",
];

const breakEvenStatuses: OperatingOutlookBreakEvenStatus[] = [
  "unique-threshold",
  "no-finite-threshold",
  "zero-profit-at-all-revenue",
];

test("every engine rejection code has one stable plain-language message", () => {
  assert.deepEqual(
    Object.keys(OPERATING_OUTLOOK_REJECTION_MESSAGES).sort(),
    [...rejectionCodes].sort(),
  );

  for (const code of rejectionCodes) {
    const message = operatingOutlookRejectionMessage(code);

    assert.equal(message, OPERATING_OUTLOOK_REJECTION_MESSAGES[code]);
    assert.match(message, /[A-Za-z]/);
    assert.equal(message.includes("NaN"), false);
    assert.equal(message.includes("undefined"), false);
  }

  assert.equal(
    operatingOutlookRejectionMessage("negative-monthly-revenue"),
    "Monthly revenue cannot be negative.",
  );
  assert.equal(
    operatingOutlookRejectionMessage("variable-cost-rate-above-100"),
    "The variable-cost percentage cannot be above 100%.",
  );
  assert.equal(
    operatingOutlookRejectionMessage("non-finite-result"),
    "These amounts are too large to produce a finite operating result.",
  );
  assert.equal(
    operatingOutlookRejectionField("negative-monthly-revenue"),
    "monthlyRevenue",
  );
  assert.equal(
    operatingOutlookRejectionField("variable-cost-rate-above-100"),
    "variableCostRatePercent",
  );
  assert.equal(operatingOutlookRejectionField("non-finite-result"), null);
});

test("all three break-even statuses explain the engine outcome", () => {
  assert.deepEqual(
    Object.keys(OPERATING_OUTLOOK_BREAK_EVEN_MESSAGES).sort(),
    [...breakEvenStatuses].sort(),
  );

  assert.match(
    operatingOutlookBreakEvenMessage("unique-threshold"),
    /before financing and taxes/,
  );
  assert.equal(
    operatingOutlookBreakEvenMessage("no-finite-threshold"),
    "A 100% variable-cost rate with positive fixed costs has no finite break-even revenue.",
  );
  assert.equal(
    operatingOutlookBreakEvenMessage("zero-profit-at-all-revenue"),
    "A 100% variable-cost rate with zero fixed costs produces zero operating profit at all revenue levels.",
  );

  for (const status of breakEvenStatuses) {
    if (status === "unique-threshold") {
      continue;
    }

    const message = operatingOutlookBreakEvenMessage(status);
    assert.equal(message.includes("$0"), false);
    assert.doesNotMatch(message, /(?:^|\s)0%/);
  }
});

test("zero revenue explains an undefined margin and zero profit does not", () => {
  assert.equal(
    undefinedOperatingMarginMessage(null),
    UNDEFINED_OPERATING_MARGIN_MESSAGE,
  );
  assert.match(
    UNDEFINED_OPERATING_MARGIN_MESSAGE,
    /undefined because monthly revenue is zero/,
  );
  assert.equal(undefinedOperatingMarginMessage(0), null);
  assert.equal(undefinedOperatingMarginMessage(20), null);
  assert.equal(undefinedOperatingMarginMessage(-30), null);
});

test("scenario copy names the engine shocks without calling them forecasts", () => {
  assert.equal(DOWNSIDE_REVENUE_MULTIPLIER, 0.85);
  assert.equal(DOWNSIDE_FIXED_COST_MULTIPLIER, 1.1);
  assert.equal(BASE_REVENUE_MULTIPLIER, 1);
  assert.equal(BASE_FIXED_COST_MULTIPLIER, 1);
  assert.equal(UPSIDE_REVENUE_MULTIPLIER, 1.15);
  assert.equal(UPSIDE_FIXED_COST_MULTIPLIER, 1);

  assert.match(OPERATING_OUTLOOK_SCENARIO_EXPLANATION, /decreases 15%/);
  assert.match(OPERATING_OUTLOOK_SCENARIO_EXPLANATION, /increase 10%/);
  assert.match(OPERATING_OUTLOOK_SCENARIO_EXPLANATION, /increases 15%/);
  assert.match(OPERATING_OUTLOOK_SCENARIO_EXPLANATION, /stay unchanged/);
  assert.match(
    OPERATING_OUTLOOK_SCENARIO_EXPLANATION,
    /variable-cost rate stays unchanged/,
  );
  assert.match(
    OPERATING_OUTLOOK_SCENARIO_EXPLANATION,
    /arithmetic illustrations, not forecasts/,
  );
  assert.match(
    OPERATING_OUTLOOK_SCENARIO_EXPLANATION,
    /before financing and taxes/,
  );
});

test("blank and nonnumeric text stay at the input boundary", () => {
  assert.deepEqual(parseOperatingOutlookNumber(""), {
    ok: false,
    reason: "blank",
  });
  assert.deepEqual(parseOperatingOutlookNumber("   "), {
    ok: false,
    reason: "blank",
  });
  assert.equal(
    operatingOutlookInputMessage("monthlyRevenue", "blank"),
    "Enter monthly revenue.",
  );
  assert.deepEqual(parseOperatingOutlookNumber("abc"), {
    ok: false,
    reason: "invalid",
  });
  assert.deepEqual(parseOperatingOutlookNumber("NaN"), {
    ok: false,
    reason: "invalid",
  });
  assert.deepEqual(parseOperatingOutlookNumber("Infinity"), {
    ok: false,
    reason: "invalid",
  });
  assert.deepEqual(parseOperatingOutlookNumber("1e309"), {
    ok: false,
    reason: "infinite",
  });

  const negative = parseOperatingOutlookNumber("-1");
  const aboveRange = parseOperatingOutlookNumber("100.01");
  const zero = parseOperatingOutlookNumber("0");

  assert.deepEqual(negative, { ok: true, value: -1 });
  assert.deepEqual(aboveRange, { ok: true, value: 100.01 });
  assert.deepEqual(zero, { ok: true, value: 0 });
});

test("the message helper does not recalculate operating results", () => {
  const source = fs.readFileSync(
    path.join(process.cwd(), "src/lib/finance/operatingOutlookMessages.ts"),
    "utf8",
  );

  assert.equal(source.includes("calculateOperatingOutlook("), false);
  assert.equal(source.includes("Math."), false);
  assert.doesNotMatch(
    source,
    /(?:variableCosts|contribution|operatingProfit|breakEvenRevenue)\s*=/,
  );
});
