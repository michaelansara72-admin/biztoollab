import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  calculateOperatingOutlook,
  type OperatingOutlookInput,
  type OperatingOutlookRejectionCode,
} from "../src/lib/finance/calculateOperatingOutlook";
import {
  calculateOperatingResilience,
  type OperatingResilienceResult,
  type OperatingResilienceScenario,
} from "../src/lib/finance/calculateOperatingResilience";

const example: OperatingOutlookInput = {
  monthlyRevenue: 10000,
  variableCostRatePercent: 30,
  monthlyFixedCosts: 5000,
};

function resultFor(input: OperatingOutlookInput): OperatingResilienceResult {
  const calculation = calculateOperatingResilience(input);

  if (!calculation.ok) {
    assert.fail(calculation.code);
  }

  return calculation.result;
}

function assertNear(actual: number, expected: number) {
  const tolerance = 1e-9 * Math.max(1, Math.abs(expected));

  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `${actual} is not within tolerance of ${expected}`,
  );
}

function assertFiniteTree(value: unknown) {
  if (typeof value === "number") {
    assert.equal(Number.isFinite(value), true);
    return;
  }

  if (value === null || typeof value !== "object") {
    return;
  }

  for (const child of Object.values(value)) {
    assertFiniteTree(child);
  }
}

function assertUsesEngineScenario(
  actual: OperatingResilienceScenario,
  input: OperatingOutlookInput,
  scenario: "base" | "downside",
) {
  const outlook = calculateOperatingOutlook(input);

  if (!outlook.ok) {
    assert.fail(outlook.code);
  }

  const engineScenario = outlook.result[scenario];

  assert.equal(
    actual.operatingProfitBeforeFinancingAndTaxes,
    engineScenario.operatingProfitBeforeFinancingAndTaxes,
  );
  assert.equal(actual.operatingMarginPercent, engineScenario.operatingMarginPercent);
  assert.equal(actual.breakEvenRevenue, engineScenario.breakEvenRevenue);
  assert.equal(actual.breakEvenStatus, engineScenario.breakEvenStatus);
  assert.equal(actual.monthlyRevenue, engineScenario.monthlyRevenue);
  assert.equal(actual.variableCosts, engineScenario.variableCosts);
  assert.equal(actual.contribution, engineScenario.contribution);
  assert.equal(actual.monthlyFixedCosts, engineScenario.monthlyFixedCosts);
}

test("a standard profitable month derives the authorized resilience figures", () => {
  const resilience = resultFor(example);
  const breakEvenRevenue = 5000 / 0.7;
  const marginOfSafety = 10000 - breakEvenRevenue;
  const marginOfSafetyRatio = marginOfSafety / 10000;

  assert.equal(resilience.contributionMarginRatio, 1 - 30 / 100);
  assertNear(resilience.contributionMarginRatio, 0.7);
  assert.equal(resilience.base.operatingProfitBeforeFinancingAndTaxes, 2000);
  assert.equal(resilience.base.operatingMarginPercent, 20);
  assert.equal(resilience.base.operatingMarginRatio, 0.2);
  assert.equal(resilience.base.profitStatus, "positive");
  assert.equal(resilience.base.breakEvenRevenue, breakEvenRevenue);
  assertNear(resilience.base.breakEvenRevenue ?? 0, 7142.857142857143);
  assert.equal(resilience.base.marginOfSafety.status, "defined");

  assert.equal(resilience.base.marginOfSafety.amount, marginOfSafety);
  assert.equal(resilience.base.marginOfSafety.ratio, marginOfSafetyRatio);
  assertNear(resilience.base.marginOfSafety.amount, 2857.142857142857);
  assertNear(resilience.base.marginOfSafety.ratio, 0.2857142857142857);
  assert.equal(resilience.downside.operatingProfitBeforeFinancingAndTaxes, 450);
  assert.equal(resilience.downside.profitStatus, "positive");
  assertUsesEngineScenario(resilience.base, example, "base");
  assertUsesEngineScenario(resilience.downside, example, "downside");
  assertFiniteTree(resilience);
});

test("the downside margin of safety uses the downside threshold", () => {
  const resilience = resultFor(example);
  const downsideBreakEven = 5500 / 0.7;
  const downsideMarginOfSafety = 8500 - downsideBreakEven;

  assert.equal(resilience.downside.monthlyRevenue, 8500);
  assert.equal(resilience.downside.monthlyFixedCosts, 5500);
  assert.equal(resilience.downside.breakEvenRevenue, downsideBreakEven);
  assert.notEqual(
    resilience.downside.breakEvenRevenue,
    resilience.base.breakEvenRevenue,
  );
  assert.equal(resilience.downside.marginOfSafety.status, "defined");

  assert.equal(
    resilience.downside.marginOfSafety.amount,
    downsideMarginOfSafety,
  );
  assert.equal(
    resilience.downside.marginOfSafety.ratio,
    downsideMarginOfSafety / 8500,
  );
  assert.ok(resilience.downside.marginOfSafety.amount > 0);
});

test("a base operating loss keeps a negative margin of safety and a downside loss", () => {
  const input: OperatingOutlookInput = {
    monthlyRevenue: 10000,
    variableCostRatePercent: 80,
    monthlyFixedCosts: 5000,
  };
  const resilience = resultFor(input);
  const breakEvenRevenue = 5000 / (1 - 80 / 100);

  assert.equal(resilience.base.operatingProfitBeforeFinancingAndTaxes, -3000);
  assert.equal(resilience.base.operatingMarginPercent, -30);
  assert.equal(resilience.base.operatingMarginRatio, -0.3);
  assert.equal(resilience.base.profitStatus, "negative");
  assert.equal(resilience.base.breakEvenRevenue, breakEvenRevenue);
  assert.equal(resilience.base.marginOfSafety.status, "defined");

  assert.equal(
    resilience.base.marginOfSafety.amount,
    10000 - breakEvenRevenue,
  );
  assert.ok(resilience.base.marginOfSafety.amount < 0);
  assert.equal(
    resilience.base.marginOfSafety.ratio,
    resilience.base.marginOfSafety.amount / 10000,
  );
  assert.ok(resilience.base.marginOfSafety.ratio < 0);
  assert.ok(resilience.downside.operatingProfitBeforeFinancingAndTaxes < 0);
  assert.equal(resilience.downside.profitStatus, "negative");
  assertUsesEngineScenario(resilience.base, input, "base");
  assertUsesEngineScenario(resilience.downside, input, "downside");
});

test("an exact break-even month has zero profit and zero margin of safety", () => {
  const input: OperatingOutlookInput = {
    monthlyRevenue: 10000,
    variableCostRatePercent: 50,
    monthlyFixedCosts: 5000,
  };
  const resilience = resultFor(input);

  assert.equal(resilience.base.operatingProfitBeforeFinancingAndTaxes, 0);
  assert.equal(resilience.base.operatingMarginRatio, 0);
  assert.equal(resilience.base.profitStatus, "zero");
  assert.equal(resilience.base.breakEvenRevenue, 10000);
  assert.equal(resilience.base.marginOfSafety.status, "defined");

  assert.equal(resilience.base.marginOfSafety.amount, 0);
  assert.equal(resilience.base.marginOfSafety.ratio, 0);
  assert.equal(resilience.downside.operatingProfitBeforeFinancingAndTaxes, -1250);
  assert.equal(resilience.downside.profitStatus, "negative");
});

test("zero revenue keeps a dollar margin of safety and leaves the percentage unavailable", () => {
  const input: OperatingOutlookInput = {
    monthlyRevenue: 0,
    variableCostRatePercent: 30,
    monthlyFixedCosts: 5000,
  };
  const resilience = resultFor(input);

  assert.equal(resilience.base.operatingProfitBeforeFinancingAndTaxes, -5000);
  assert.equal(resilience.base.operatingMarginPercent, null);
  assert.equal(resilience.base.operatingMarginRatio, null);
  assert.equal(resilience.base.profitStatus, "negative");
  assert.equal(resilience.base.breakEvenRevenue, 5000 / 0.7);
  assert.equal(
    resilience.base.marginOfSafety.status,
    "amount-defined-percent-unavailable",
  );

  assert.equal(resilience.base.marginOfSafety.amount, 0 - 5000 / 0.7);
  assert.ok(resilience.base.marginOfSafety.amount < 0);
  assert.equal(resilience.base.marginOfSafety.ratio, null);
  assert.equal(resilience.contributionMarginRatio, 1 - 30 / 100);
  assert.equal(
    resilience.downside.marginOfSafety.status,
    "amount-defined-percent-unavailable",
  );
});

test("zero fixed costs break even at zero revenue and the margin of safety equals revenue", () => {
  const resilience = resultFor({
    monthlyRevenue: 10000,
    variableCostRatePercent: 30,
    monthlyFixedCosts: 0,
  });

  assert.equal(resilience.base.operatingProfitBeforeFinancingAndTaxes, 7000);
  assert.equal(resilience.base.breakEvenRevenue, 0);
  assert.equal(resilience.base.profitStatus, "positive");
  assert.equal(resilience.base.marginOfSafety.status, "defined");

  assert.equal(resilience.base.marginOfSafety.amount, 10000);
  assert.equal(resilience.base.marginOfSafety.ratio, 1);
  assert.equal(resilience.downside.breakEvenRevenue, 0);
  assert.equal(resilience.downside.marginOfSafety.status, "defined");
});

test("zero revenue and zero fixed costs have a zero dollar gap and no percentage", () => {
  const resilience = resultFor({
    monthlyRevenue: 0,
    variableCostRatePercent: 30,
    monthlyFixedCosts: 0,
  });

  assert.equal(resilience.base.operatingProfitBeforeFinancingAndTaxes, 0);
  assert.equal(resilience.base.profitStatus, "zero");
  assert.equal(resilience.base.breakEvenRevenue, 0);
  assert.equal(
    resilience.base.marginOfSafety.status,
    "amount-defined-percent-unavailable",
  );

  assert.equal(resilience.base.marginOfSafety.amount, 0);
  assert.equal(resilience.base.marginOfSafety.ratio, null);
});

test("a 100 percent variable-cost rate has no finite margin of safety when fixed costs remain", () => {
  const resilience = resultFor({
    monthlyRevenue: 10000,
    variableCostRatePercent: 100,
    monthlyFixedCosts: 500,
  });

  assert.equal(resilience.contributionMarginRatio, 0);
  assert.equal(resilience.base.operatingProfitBeforeFinancingAndTaxes, -500);
  assert.equal(resilience.base.profitStatus, "negative");
  assert.equal(resilience.base.breakEvenRevenue, null);
  assert.equal(resilience.base.breakEvenStatus, "no-finite-threshold");
  assert.deepEqual(resilience.base.marginOfSafety, {
    status: "unavailable-no-finite-threshold",
    amount: null,
    ratio: null,
  });
  assert.deepEqual(resilience.downside.marginOfSafety, {
    status: "unavailable-no-finite-threshold",
    amount: null,
    ratio: null,
  });
  assert.equal(resilience.downside.breakEvenRevenue, null);
});

test("a 100 percent variable-cost rate and zero fixed costs have no unique threshold", () => {
  const resilience = resultFor({
    monthlyRevenue: 10000,
    variableCostRatePercent: 100,
    monthlyFixedCosts: 0,
  });

  assert.equal(resilience.base.operatingProfitBeforeFinancingAndTaxes, 0);
  assert.equal(resilience.base.profitStatus, "zero");
  assert.equal(resilience.base.breakEvenStatus, "zero-profit-at-all-revenue");
  assert.deepEqual(resilience.base.marginOfSafety, {
    status: "unavailable-no-unique-threshold",
    amount: null,
    ratio: null,
  });
  assert.equal(resilience.downside.operatingProfitBeforeFinancingAndTaxes, 0);
  assert.equal(resilience.downside.profitStatus, "zero");
  assert.deepEqual(resilience.downside.marginOfSafety, {
    status: "unavailable-no-unique-threshold",
    amount: null,
    ratio: null,
  });
});

test("the downside case can be exactly at break-even", () => {
  const resilience = resultFor({
    monthlyRevenue: 66,
    variableCostRatePercent: 0,
    monthlyFixedCosts: 51,
  });

  assert.equal(resilience.contributionMarginRatio, 1);
  assert.equal(resilience.base.profitStatus, "positive");
  assert.equal(resilience.downside.operatingProfitBeforeFinancingAndTaxes, 0);
  assert.equal(resilience.downside.profitStatus, "zero");
  assert.equal(resilience.downside.marginOfSafety.status, "defined");

  assert.equal(resilience.downside.marginOfSafety.amount, 0);
  assert.equal(resilience.downside.marginOfSafety.ratio, 0);
});

test("tiny positive and negative results stay nonzero without an epsilon cutoff", () => {
  const tinyPositive = resultFor({
    monthlyRevenue: 1 + 1e-10,
    variableCostRatePercent: 0,
    monthlyFixedCosts: 1,
  });
  const tinyNegative = resultFor({
    monthlyRevenue: 1 - 1e-10,
    variableCostRatePercent: 0,
    monthlyFixedCosts: 1,
  });

  assert.equal(tinyPositive.base.profitStatus, "positive");
  assert.ok(tinyPositive.base.operatingProfitBeforeFinancingAndTaxes > 0);
  assert.ok(tinyPositive.base.operatingProfitBeforeFinancingAndTaxes < 0.005);
  assert.equal(tinyPositive.base.marginOfSafety.status, "defined");

  assert.ok(tinyPositive.base.marginOfSafety.amount > 0);
  assert.ok(tinyPositive.base.marginOfSafety.amount < 0.005);
  assert.equal(
    Math.round(tinyPositive.base.operatingProfitBeforeFinancingAndTaxes * 100) /
      100,
    0,
  );

  assert.equal(tinyNegative.base.profitStatus, "negative");
  assert.ok(tinyNegative.base.operatingProfitBeforeFinancingAndTaxes < 0);
  assert.ok(tinyNegative.base.operatingProfitBeforeFinancingAndTaxes > -0.005);
  assert.equal(tinyNegative.base.marginOfSafety.status, "defined");

  assert.ok(tinyNegative.base.marginOfSafety.amount < 0);
  assert.ok(tinyNegative.base.marginOfSafety.amount > -0.005);
  assert.equal(tinyNegative.downside.profitStatus, "negative");
});

test("a sub-cent operating profit is not classified as zero", () => {
  const slightlyAbove = resultFor({
    monthlyRevenue: 1000.004,
    variableCostRatePercent: 0,
    monthlyFixedCosts: 1000,
  });
  const slightlyBelow = resultFor({
    monthlyRevenue: 999.996,
    variableCostRatePercent: 0,
    monthlyFixedCosts: 1000,
  });

  assert.notEqual(slightlyAbove.base.operatingProfitBeforeFinancingAndTaxes, 0);
  assert.equal(slightlyAbove.base.profitStatus, "positive");
  assert.equal(slightlyAbove.base.marginOfSafety.status, "defined");

  assert.ok(slightlyAbove.base.marginOfSafety.amount > 0);
  assert.equal(
    Math.round(slightlyAbove.base.marginOfSafety.amount * 100) / 100,
    0,
  );

  assert.notEqual(slightlyBelow.base.operatingProfitBeforeFinancingAndTaxes, 0);
  assert.equal(slightlyBelow.base.profitStatus, "negative");
  assert.equal(slightlyBelow.base.marginOfSafety.status, "defined");
  assert.ok(slightlyBelow.base.marginOfSafety.amount < 0);
  assert.equal(
    Math.abs(Math.round(slightlyBelow.base.marginOfSafety.amount * 100)),
    0,
  );
});

test("extreme finite inputs remain finite and engine overflow stays rejected", () => {
  const largeRevenue = Number.MAX_VALUE / 2;
  const large = resultFor({
    monthlyRevenue: largeRevenue,
    variableCostRatePercent: 0,
    monthlyFixedCosts: 1,
  });

  assert.equal(large.base.profitStatus, "positive");
  assert.equal(large.base.marginOfSafety.status, "defined");
  assertFiniteTree(large);

  assert.equal(Number.isFinite(large.base.marginOfSafety.amount), true);
  assert.equal(Number.isFinite(large.base.marginOfSafety.ratio), true);

  const overflow = calculateOperatingResilience({
    monthlyRevenue: 1,
    variableCostRatePercent: 50,
    monthlyFixedCosts: Number.MAX_VALUE,
  });
  const engineOverflow = calculateOperatingOutlook({
    monthlyRevenue: 1,
    variableCostRatePercent: 50,
    monthlyFixedCosts: Number.MAX_VALUE,
  });

  assert.deepEqual(overflow, { ok: false, code: "non-finite-result" });
  assert.deepEqual(engineOverflow, overflow);

  const multiplierOverflow = {
    monthlyRevenue: Number.MAX_VALUE,
    variableCostRatePercent: 0,
    monthlyFixedCosts: 1,
  };

  assert.deepEqual(
    calculateOperatingResilience(multiplierOverflow),
    calculateOperatingOutlook(multiplierOverflow),
  );
});

test("invalid inputs preserve the existing engine rejection codes", () => {
  const cases: [OperatingOutlookInput, OperatingOutlookRejectionCode][] = [
    [{ ...example, monthlyRevenue: -1 }, "negative-monthly-revenue"],
    [{ ...example, monthlyRevenue: Number.NaN }, "non-finite-monthly-revenue"],
    [
      { ...example, monthlyRevenue: Number.POSITIVE_INFINITY },
      "non-finite-monthly-revenue",
    ],
    [
      { ...example, variableCostRatePercent: -0.01 },
      "variable-cost-rate-below-zero",
    ],
    [
      { ...example, variableCostRatePercent: 100.01 },
      "variable-cost-rate-above-100",
    ],
    [
      { ...example, variableCostRatePercent: Number.NaN },
      "non-finite-variable-cost-rate",
    ],
    [{ ...example, monthlyFixedCosts: -1 }, "negative-monthly-fixed-costs"],
    [
      { ...example, monthlyFixedCosts: Number.POSITIVE_INFINITY },
      "non-finite-monthly-fixed-costs",
    ],
  ];

  for (const [input, code] of cases) {
    assert.deepEqual(calculateOperatingResilience(input), { ok: false, code });
    assert.deepEqual(calculateOperatingOutlook(input), { ok: false, code });
  }
});

test("the supplied input object is not mutated", () => {
  const input: OperatingOutlookInput = { ...example };
  const snapshot: OperatingOutlookInput = { ...input };

  Object.freeze(input);

  const resilience = resultFor(input);

  assert.deepEqual(input, snapshot);
  assert.notEqual(resilience.input, input);
  assert.deepEqual(resilience.input, snapshot);
});

test("the derivation module does not recalculate outlook shocks or perform side effects", () => {
  const source = fs.readFileSync(
    path.join(process.cwd(), "src/lib/finance/calculateOperatingResilience.ts"),
    "utf8",
  );

  assert.match(source, /calculateOperatingOutlook\(/);
  assert.equal(source.includes("0.85"), false);
  assert.equal(source.includes("1.1"), false);
  assert.equal(source.includes("1.15"), false);
  assert.equal(source.includes("toFixed"), false);
  assert.equal(source.includes("Math.round"), false);
  assert.equal(source.includes("Math.max"), false);
  assert.equal(source.includes("Math.min"), false);
  assert.doesNotMatch(source, /\bfetch\s*\(/);
  assert.doesNotMatch(source, /\bconsole\./);
  assert.doesNotMatch(source, /process\.env/);
  assert.doesNotMatch(source, /from ["']react["']/);
  assert.doesNotMatch(source, /from ["']next\//);
  assert.doesNotMatch(source, /from ["']openai["']/);
  assert.doesNotMatch(source, /localStorage|sessionStorage/);
});
