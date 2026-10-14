import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  BASE_FIXED_COST_MULTIPLIER,
  BASE_REVENUE_MULTIPLIER,
  DOWNSIDE_FIXED_COST_MULTIPLIER,
  DOWNSIDE_REVENUE_MULTIPLIER,
  OPERATING_OUTLOOK_ASSUMPTIONS,
  UPSIDE_FIXED_COST_MULTIPLIER,
  UPSIDE_REVENUE_MULTIPLIER,
  calculateOperatingOutlook,
  type OperatingOutlookInput,
  type OperatingOutlookResult,
  type OperatingOutlookScenario,
} from "../src/lib/finance/calculateOperatingOutlook";

const example: OperatingOutlookInput = {
  monthlyRevenue: 10000,
  variableCostRatePercent: 30,
  monthlyFixedCosts: 5000,
};

function resultFor(input: OperatingOutlookInput): OperatingOutlookResult {
  const calculation = calculateOperatingOutlook(input);

  if (!calculation.ok) {
    assert.fail(calculation.code);
  }

  return calculation.result;
}

function expectedScenario(
  input: OperatingOutlookInput,
  revenueMultiplier: number,
  fixedCostMultiplier: number,
): {
  monthlyRevenue: number;
  monthlyFixedCosts: number;
  variableCosts: number;
  contribution: number;
  operatingProfitBeforeFinancingAndTaxes: number;
  operatingMarginPercent: number | null;
  breakEvenRevenue: number;
} {
  const monthlyRevenue = input.monthlyRevenue * revenueMultiplier;
  const monthlyFixedCosts = input.monthlyFixedCosts * fixedCostMultiplier;
  const variableCostRate = input.variableCostRatePercent / 100;
  const variableCosts = monthlyRevenue * variableCostRate;
  const contribution = monthlyRevenue - variableCosts;
  const operatingProfitBeforeFinancingAndTaxes =
    contribution - monthlyFixedCosts;

  return {
    monthlyRevenue,
    monthlyFixedCosts,
    variableCosts,
    contribution,
    operatingProfitBeforeFinancingAndTaxes,
    operatingMarginPercent:
      monthlyRevenue > 0
        ? (operatingProfitBeforeFinancingAndTaxes / monthlyRevenue) * 100
        : null,
    breakEvenRevenue: monthlyFixedCosts / (1 - variableCostRate),
  };
}

function assertScenarioMath(
  actual: OperatingOutlookScenario,
  expected: ReturnType<typeof expectedScenario>,
) {
  assert.equal(actual.monthlyRevenue, expected.monthlyRevenue);
  assert.equal(actual.monthlyFixedCosts, expected.monthlyFixedCosts);
  assert.equal(actual.variableCosts, expected.variableCosts);
  assert.equal(actual.contribution, expected.contribution);
  assert.equal(
    actual.operatingProfitBeforeFinancingAndTaxes,
    expected.operatingProfitBeforeFinancingAndTaxes,
  );
  assert.equal(actual.operatingMarginPercent, expected.operatingMarginPercent);
  assert.equal(actual.breakEvenRevenue, expected.breakEvenRevenue);
  assert.equal(actual.breakEvenStatus, "unique-threshold");
}

test("a standard profitable month keeps unrounded operating results", () => {
  const outlook = resultFor(example);
  const expected = expectedScenario(
    example,
    BASE_REVENUE_MULTIPLIER,
    BASE_FIXED_COST_MULTIPLIER,
  );

  assertScenarioMath(outlook.base, expected);
  assert.ok(outlook.base.operatingProfitBeforeFinancingAndTaxes > 0);
  assert.equal(outlook.base.operatingMarginPercent, 20);
  assert.equal(outlook.base.variableCosts, 3000);
  assert.equal(outlook.base.contribution, 7000);
  assert.equal(outlook.base.operatingProfitBeforeFinancingAndTaxes, 2000);
});

test("a standard operating loss stays negative", () => {
  const input: OperatingOutlookInput = {
    monthlyRevenue: 10000,
    variableCostRatePercent: 80,
    monthlyFixedCosts: 5000,
  };
  const outlook = resultFor(input);

  assert.equal(outlook.base.variableCosts, 8000);
  assert.equal(outlook.base.contribution, 2000);
  assert.equal(outlook.base.operatingProfitBeforeFinancingAndTaxes, -3000);
  assert.equal(outlook.base.operatingMarginPercent, -30);
  assert.equal(outlook.base.breakEvenRevenue, 5000 / (1 - 80 / 100));
  assert.equal(outlook.base.breakEvenStatus, "unique-threshold");
});

test("an exact break-even month has zero operating profit", () => {
  const input: OperatingOutlookInput = {
    monthlyRevenue: 10000,
    variableCostRatePercent: 50,
    monthlyFixedCosts: 5000,
  };
  const outlook = resultFor(input);

  assert.equal(outlook.base.contribution, 5000);
  assert.equal(outlook.base.operatingProfitBeforeFinancingAndTaxes, 0);
  assert.equal(outlook.base.operatingMarginPercent, 0);
  assert.equal(outlook.base.breakEvenRevenue, 10000);
  assert.equal(outlook.base.breakEvenStatus, "unique-threshold");
});

test("zero revenue leaves margin undefined and keeps the break-even threshold", () => {
  const input: OperatingOutlookInput = {
    monthlyRevenue: 0,
    variableCostRatePercent: 30,
    monthlyFixedCosts: 5000,
  };
  const outlook = resultFor(input);

  assert.equal(outlook.base.variableCosts, 0);
  assert.equal(outlook.base.contribution, 0);
  assert.equal(outlook.base.operatingProfitBeforeFinancingAndTaxes, -5000);
  assert.equal(outlook.base.operatingMarginPercent, null);
  assert.equal(outlook.base.breakEvenRevenue, 5000 / 0.7);
  assert.equal(outlook.base.breakEvenStatus, "unique-threshold");
});

test("zero fixed costs break even at zero revenue", () => {
  const input: OperatingOutlookInput = {
    monthlyRevenue: 10000,
    variableCostRatePercent: 30,
    monthlyFixedCosts: 0,
  };
  const outlook = resultFor(input);

  assert.equal(outlook.base.operatingProfitBeforeFinancingAndTaxes, 7000);
  assert.equal(outlook.base.breakEvenRevenue, 0);
  assert.equal(outlook.base.breakEvenStatus, "unique-threshold");
  assert.equal(outlook.downside.monthlyFixedCosts, 0);
  assert.equal(outlook.downside.breakEvenRevenue, 0);
});

test("a zero variable-cost rate treats all revenue as contribution", () => {
  const input: OperatingOutlookInput = {
    monthlyRevenue: 10000,
    variableCostRatePercent: 0,
    monthlyFixedCosts: 4000,
  };
  const outlook = resultFor(input);

  assert.equal(outlook.base.variableCosts, 0);
  assert.equal(outlook.base.contribution, 10000);
  assert.equal(outlook.base.operatingProfitBeforeFinancingAndTaxes, 6000);
  assert.equal(outlook.base.operatingMarginPercent, 60);
  assert.equal(outlook.base.breakEvenRevenue, 4000);
  assert.equal(outlook.base.variableCostRatePercent, 0);
});

test("a 100 percent variable-cost rate has no finite break-even when fixed costs remain", () => {
  const input: OperatingOutlookInput = {
    monthlyRevenue: 10000,
    variableCostRatePercent: 100,
    monthlyFixedCosts: 500,
  };
  const outlook = resultFor(input);

  assert.equal(outlook.base.variableCosts, 10000);
  assert.equal(outlook.base.contribution, 0);
  assert.equal(outlook.base.operatingProfitBeforeFinancingAndTaxes, -500);
  assert.equal(outlook.base.operatingMarginPercent, -5);
  assert.equal(outlook.base.breakEvenRevenue, null);
  assert.equal(outlook.base.breakEvenStatus, "no-finite-threshold");
  assert.equal(outlook.downside.breakEvenStatus, "no-finite-threshold");
  assert.equal(outlook.upside.breakEvenRevenue, null);
});

test("a 100 percent variable-cost rate and zero fixed costs are zero profit at every revenue", () => {
  const input: OperatingOutlookInput = {
    monthlyRevenue: 10000,
    variableCostRatePercent: 100,
    monthlyFixedCosts: 0,
  };
  const outlook = resultFor(input);

  for (const scenario of [outlook.base, outlook.downside, outlook.upside]) {
    assert.equal(scenario.contribution, 0);
    assert.equal(scenario.operatingProfitBeforeFinancingAndTaxes, 0);
    assert.equal(scenario.breakEvenRevenue, null);
    assert.equal(scenario.breakEvenStatus, "zero-profit-at-all-revenue");
  }

  assert.equal(outlook.base.operatingMarginPercent, 0);
  assert.equal(outlook.downside.monthlyRevenue, 8500);
  assert.equal(outlook.upside.monthlyRevenue, 11500);
});

test("negative revenue and negative fixed costs are rejected", () => {
  const negativeRevenue = calculateOperatingOutlook({
    ...example,
    monthlyRevenue: -1,
  });
  const negativeFixedCosts = calculateOperatingOutlook({
    ...example,
    monthlyFixedCosts: -1,
  });

  assert.deepEqual(negativeRevenue, {
    ok: false,
    code: "negative-monthly-revenue",
  });
  assert.deepEqual(negativeFixedCosts, {
    ok: false,
    code: "negative-monthly-fixed-costs",
  });
});

test("variable-cost rates outside 0 to 100 percent are rejected", () => {
  const belowZero = calculateOperatingOutlook({
    ...example,
    variableCostRatePercent: -0.01,
  });
  const above100 = calculateOperatingOutlook({
    ...example,
    variableCostRatePercent: 100.01,
  });

  assert.deepEqual(belowZero, {
    ok: false,
    code: "variable-cost-rate-below-zero",
  });
  assert.deepEqual(above100, {
    ok: false,
    code: "variable-cost-rate-above-100",
  });
});

test("NaN and infinite inputs are rejected without replacement", () => {
  const cases: [OperatingOutlookInput, string][] = [
    [{ ...example, monthlyRevenue: Number.NaN }, "non-finite-monthly-revenue"],
    [
      { ...example, monthlyRevenue: Number.POSITIVE_INFINITY },
      "non-finite-monthly-revenue",
    ],
    [
      { ...example, monthlyRevenue: Number.NEGATIVE_INFINITY },
      "non-finite-monthly-revenue",
    ],
    [
      { ...example, variableCostRatePercent: Number.NaN },
      "non-finite-variable-cost-rate",
    ],
    [
      { ...example, variableCostRatePercent: Number.POSITIVE_INFINITY },
      "non-finite-variable-cost-rate",
    ],
    [
      { ...example, variableCostRatePercent: Number.NEGATIVE_INFINITY },
      "non-finite-variable-cost-rate",
    ],
    [
      { ...example, monthlyFixedCosts: Number.NaN },
      "non-finite-monthly-fixed-costs",
    ],
    [
      { ...example, monthlyFixedCosts: Number.POSITIVE_INFINITY },
      "non-finite-monthly-fixed-costs",
    ],
    [
      { ...example, monthlyFixedCosts: Number.NEGATIVE_INFINITY },
      "non-finite-monthly-fixed-costs",
    ],
  ];

  for (const [input, code] of cases) {
    assert.deepEqual(calculateOperatingOutlook(input), { ok: false, code });
  }
});

test("non-finite break-even arithmetic is rejected", () => {
  const overflow = calculateOperatingOutlook({
    monthlyRevenue: 1,
    variableCostRatePercent: 50,
    monthlyFixedCosts: Number.MAX_VALUE,
  });

  assert.deepEqual(overflow, { ok: false, code: "non-finite-result" });

  const tinyContribution = calculateOperatingOutlook({
    monthlyRevenue: 100,
    variableCostRatePercent: (1 - 1e-16) * 100,
    monthlyFixedCosts: Number.MAX_VALUE,
  });

  assert.deepEqual(tinyContribution, { ok: false, code: "non-finite-result" });
});

test("the base scenario uses the original inputs", () => {
  const outlook = resultFor(example);
  const expected = expectedScenario(example, 1, 1);

  assert.equal(outlook.base.scenario, "base");
  assertScenarioMath(outlook.base, expected);
  assert.equal(outlook.base.variableCostRatePercent, 30);
  assert.deepEqual(outlook.base.assumptions, {
    revenueMultiplier: BASE_REVENUE_MULTIPLIER,
    fixedCostMultiplier: BASE_FIXED_COST_MULTIPLIER,
    variableCostRateUnchanged: true,
    interpretation: "arithmetic-shock-not-a-forecast",
  });
});

test("the downside scenario reduces revenue by 15 percent and raises fixed costs by 10 percent", () => {
  const outlook = resultFor(example);
  const expected = expectedScenario(
    example,
    DOWNSIDE_REVENUE_MULTIPLIER,
    DOWNSIDE_FIXED_COST_MULTIPLIER,
  );

  assert.equal(DOWNSIDE_REVENUE_MULTIPLIER, 0.85);
  assert.equal(DOWNSIDE_FIXED_COST_MULTIPLIER, 1.1);
  assert.equal(outlook.downside.scenario, "downside");
  assert.equal(outlook.downside.monthlyRevenue, 8500);
  assert.equal(outlook.downside.monthlyFixedCosts, 5500);
  assert.equal(outlook.downside.variableCostRatePercent, 30);
  assertScenarioMath(outlook.downside, expected);
});

test("the upside scenario raises revenue by 15 percent and leaves fixed costs unchanged", () => {
  const outlook = resultFor(example);
  const expected = expectedScenario(
    example,
    UPSIDE_REVENUE_MULTIPLIER,
    UPSIDE_FIXED_COST_MULTIPLIER,
  );

  assert.equal(UPSIDE_REVENUE_MULTIPLIER, 1.15);
  assert.equal(UPSIDE_FIXED_COST_MULTIPLIER, 1);
  assert.equal(outlook.upside.scenario, "upside");
  assert.equal(outlook.upside.monthlyRevenue, 11500);
  assert.equal(outlook.upside.monthlyFixedCosts, 5000);
  assert.equal(outlook.upside.variableCostRatePercent, 30);
  assertScenarioMath(outlook.upside, expected);
});

test("scenario metadata stays on every case and does not describe a forecast", () => {
  const outlook = resultFor(example);

  assert.deepEqual(outlook.assumptions, OPERATING_OUTLOOK_ASSUMPTIONS);
  assert.deepEqual(outlook.input, example);

  for (const scenario of [outlook.downside, outlook.base, outlook.upside]) {
    assert.equal(scenario.variableCostRatePercent, example.variableCostRatePercent);
    assert.equal(scenario.assumptions.variableCostRateUnchanged, true);
    assert.equal(
      scenario.assumptions.interpretation,
      "arithmetic-shock-not-a-forecast",
    );
  }
});

test("results are not rounded to a nearby dollar or percent", () => {
  const outlook = resultFor(example);
  const unroundedBreakEven = 5000 / 0.7;

  assert.equal(outlook.base.breakEvenRevenue, unroundedBreakEven);
  assert.notEqual(outlook.base.breakEvenRevenue, Math.round(unroundedBreakEven));
  assert.equal(outlook.downside.breakEvenRevenue, 5500 / 0.7);
  assert.notEqual(
    outlook.downside.operatingMarginPercent,
    Math.round(outlook.downside.operatingMarginPercent ?? 0),
  );
});

test("the supplied input object is not mutated", () => {
  const input: OperatingOutlookInput = { ...example };
  const snapshot: OperatingOutlookInput = { ...input };

  Object.freeze(input);

  const outlook = resultFor(input);

  assert.deepEqual(input, snapshot);
  assert.notEqual(outlook.input, input);
  assert.deepEqual(outlook.input, snapshot);
});

test("the engine module does not import React, server, or network APIs", () => {
  const source = fs.readFileSync(
    path.join(process.cwd(), "src/lib/finance/calculateOperatingOutlook.ts"),
    "utf8",
  );

  assert.doesNotMatch(source, /^\s*import /m);
  assert.doesNotMatch(source, /\brequire\s*\(/);
  assert.doesNotMatch(source, /\bfetch\s*\(/);
  assert.doesNotMatch(source, /process\.env/);
  assert.doesNotMatch(source, /from ["']react["']/);
  assert.doesNotMatch(source, /from ["']next\//);
  assert.doesNotMatch(source, /from ["']openai["']/);
  assert.doesNotMatch(source, /server-only/);
  assert.equal(typeof calculateOperatingOutlook, "function");
});
