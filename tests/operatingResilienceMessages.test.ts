import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import type { OperatingOutlookInput } from "../src/lib/finance/calculateOperatingOutlook";
import {
  calculateOperatingResilience,
  type OperatingResilienceResult,
} from "../src/lib/finance/calculateOperatingResilience";
import {
  OPERATING_RESILIENCE_CURRENCY_FRACTION_DIGITS,
  interpretOperatingResilience,
  operatingResilienceCentsDisplay,
  type OperatingResilienceFinding,
} from "../src/lib/finance/operatingResilienceMessages";

const example: OperatingOutlookInput = {
  monthlyRevenue: 10000,
  variableCostRatePercent: 30,
  monthlyFixedCosts: 5000,
};

const bannedPhrases = [
  /financially healthy/i,
  /business is safe/i,
  /safe business/i,
  /survive a downturn/i,
  /guaranteed/i,
  /high risk/i,
  /low risk/i,
];

function resilienceFor(input: OperatingOutlookInput): OperatingResilienceResult {
  const calculation = calculateOperatingResilience(input);

  if (!calculation.ok) {
    assert.fail(calculation.code);
  }

  return calculation.result;
}

function findingsFor(input: OperatingOutlookInput): OperatingResilienceFinding[] {
  return interpretOperatingResilience(resilienceFor(input));
}

function ids(findings: readonly OperatingResilienceFinding[]): string[] {
  return findings.map((finding) => finding.id);
}

function byId(
  findings: readonly OperatingResilienceFinding[],
  id: string,
): OperatingResilienceFinding {
  const finding = findings.find((item) => item.id === id);

  if (!finding) {
    assert.fail(`missing finding ${id}`);
  }

  return finding;
}

function assertEducational(findings: readonly OperatingResilienceFinding[]) {
  for (const finding of findings) {
    const text = [
      finding.headline,
      finding.explanation,
      finding.nextStep,
      finding.caveat ?? "",
    ].join(" ");

    assert.match(finding.headline, /[A-Za-z]/);
    assert.match(finding.explanation, /[A-Za-z]/);
    assert.match(finding.nextStep, /[A-Za-z]/);
    assert.equal(typeof finding.caveat, "string");

    for (const phrase of bannedPhrases) {
      assert.doesNotMatch(text, phrase);
    }
  }
}

const limitationIds = [
  "entered-assumptions",
  "not-cash-flow-or-net-income",
  "scenarios-are-illustrations",
  "outside-this-assessment",
];

test("cent display distinguishes exact zero from a sub-cent remainder", () => {
  assert.equal(OPERATING_RESILIENCE_CURRENCY_FRACTION_DIGITS, 2);
  assert.equal(operatingResilienceCentsDisplay(0), "exact-zero");
  assert.equal(operatingResilienceCentsDisplay(-0), "exact-zero");
  assert.equal(operatingResilienceCentsDisplay(0.004), "nonzero-rounds-to-zero-cents");
  assert.equal(operatingResilienceCentsDisplay(-0.004), "nonzero-rounds-to-zero-cents");
  assert.equal(operatingResilienceCentsDisplay(1e-10), "nonzero-rounds-to-zero-cents");
  assert.equal(operatingResilienceCentsDisplay(-1e-10), "nonzero-rounds-to-zero-cents");
  assert.equal(operatingResilienceCentsDisplay(0.005), "visible-at-cents");
  assert.equal(operatingResilienceCentsDisplay(-0.005), "visible-at-cents");
  assert.equal(operatingResilienceCentsDisplay(2000), "visible-at-cents");
});

test("a profitable month reports positive profit, a positive gap, and a positive downside", () => {
  const result = resilienceFor(example);
  const findings = interpretOperatingResilience(result);

  assert.deepEqual(ids(findings), [
    "base-operating-profit-positive",
    "margin-of-safety-positive",
    "downside-operating-profit-positive",
    ...limitationIds,
  ]);
  assert.equal(findings[0]?.category, "profitability");
  assert.equal(findings[1]?.category, "break-even");
  assert.equal(findings[2]?.category, "downside");
  assert.equal(byId(findings, "base-operating-profit-positive").precision?.classification, "positive");
  assert.equal(byId(findings, "base-operating-profit-positive").precision?.centsDisplay, "visible-at-cents");
  assert.equal(byId(findings, "margin-of-safety-positive").precision?.centsDisplay, "visible-at-cents");
  assert.match(byId(findings, "downside-operating-profit-positive").explanation, /0\.85/);
  assert.match(byId(findings, "downside-operating-profit-positive").explanation, /1\.1/);
  assert.match(byId(findings, "scenarios-are-illustrations").headline, /not a forecast/);
  assert.equal(ids(findings).includes("base-profitable-downside-unprofitable"), false);
  assert.equal(ids(findings).includes("base-and-downside-unprofitable"), false);
  assertEducational(findings);
  assert.equal(result.base.operatingProfitBeforeFinancingAndTaxes, 2000);
});

test("an operating loss keeps a negative gap and a negative downside", () => {
  const findings = findingsFor({
    monthlyRevenue: 10000,
    variableCostRatePercent: 80,
    monthlyFixedCosts: 5000,
  });

  assert.deepEqual(ids(findings), [
    "base-operating-profit-negative",
    "margin-of-safety-negative",
    "downside-operating-profit-negative",
    "base-and-downside-unprofitable",
    ...limitationIds,
  ]);
  assert.match(byId(findings, "margin-of-safety-negative").headline, /below break-even/);
  assert.equal(byId(findings, "margin-of-safety-negative").headline.includes("exactly zero"), false);
  assertEducational(findings);
});

test("exact break-even uses the zero classification and does not call the month unprofitable", () => {
  const findings = findingsFor({
    monthlyRevenue: 10000,
    variableCostRatePercent: 50,
    monthlyFixedCosts: 5000,
  });

  assert.equal(byId(findings, "base-operating-profit-zero").precision?.centsDisplay, "exact-zero");
  assert.match(byId(findings, "base-operating-profit-zero").headline, /exactly zero/);
  assert.match(byId(findings, "margin-of-safety-zero").headline, /exactly zero/);
  assert.equal(byId(findings, "downside-operating-profit-negative").category, "downside");
  assert.equal(ids(findings).includes("base-and-downside-unprofitable"), false);
  assert.equal(ids(findings).includes("base-profitable-downside-unprofitable"), false);
  assertEducational(findings);
});

test("zero revenue leaves the percentage unavailable without calling it zero percent", () => {
  const findings = findingsFor({
    monthlyRevenue: 0,
    variableCostRatePercent: 30,
    monthlyFixedCosts: 5000,
  });
  const gap = byId(findings, "margin-of-safety-percent-unavailable");

  assert.equal(gap.category, "break-even");
  assert.equal(gap.precision?.classification, "negative");
  assert.equal(gap.precision?.centsDisplay, "visible-at-cents");
  assert.match(gap.headline, /percentage is unavailable/);
  assert.match(gap.caveat ?? "", /not zero percent/);
  assert.equal(gap.headline.includes("exactly zero"), false);
  assert.equal(ids(findings).includes("base-and-downside-unprofitable"), true);
  assertEducational(findings);
});

test("zero fixed costs describe a positive gap equal to the engine classification", () => {
  const result = resilienceFor({
    monthlyRevenue: 10000,
    variableCostRatePercent: 30,
    monthlyFixedCosts: 0,
  });
  const findings = interpretOperatingResilience(result);
  const gap = byId(findings, "margin-of-safety-positive");

  assert.equal(result.base.marginOfSafety.status, "defined");
  assert.equal(gap.precision?.classification, "positive");
  assert.equal(gap.precision?.centsDisplay, "visible-at-cents");
  assert.equal(ids(findings).includes("base-and-downside-unprofitable"), false);
  assertEducational(findings);
});

test("zero revenue and zero fixed costs have an exact zero gap and no percentage", () => {
  const findings = findingsFor({
    monthlyRevenue: 0,
    variableCostRatePercent: 30,
    monthlyFixedCosts: 0,
  });
  const gap = byId(findings, "margin-of-safety-percent-unavailable");

  assert.equal(byId(findings, "base-operating-profit-zero").precision?.classification, "zero");
  assert.equal(gap.precision?.classification, "zero");
  assert.equal(gap.precision?.centsDisplay, "exact-zero");
  assert.match(gap.headline, /exactly zero/);
  assert.match(gap.headline, /percentage is unavailable/);
  assertEducational(findings);
});

test("a 100 percent rate with fixed costs has no finite threshold", () => {
  const findings = findingsFor({
    monthlyRevenue: 10000,
    variableCostRatePercent: 100,
    monthlyFixedCosts: 500,
  });
  const threshold = byId(findings, "break-even-no-finite-threshold");

  assert.equal(threshold.precision?.classification, "unavailable");
  assert.equal(threshold.precision?.centsDisplay, "not-applicable");
  assert.match(threshold.explanation, /Margin of safety is not calculated/);
  assert.equal(threshold.headline.includes("$0"), false);
  assert.equal(ids(findings)[0], "base-operating-profit-negative");
  assert.equal(ids(findings).includes("base-and-downside-unprofitable"), true);
  assertEducational(findings);
});

test("a 100 percent rate and zero fixed costs have no unique threshold", () => {
  const findings = findingsFor({
    monthlyRevenue: 10000,
    variableCostRatePercent: 100,
    monthlyFixedCosts: 0,
  });
  const threshold = byId(findings, "break-even-no-unique-threshold");

  assert.equal(ids(findings)[0], "base-operating-profit-zero");
  assert.equal(ids(findings)[2], "downside-operating-profit-zero");
  assert.match(threshold.explanation, /every revenue level/);
  assert.equal(threshold.headline.includes("$0"), false);
  assert.equal(ids(findings).includes("base-and-downside-unprofitable"), false);
  assert.equal(ids(findings).includes("base-profitable-downside-unprofitable"), false);
  assertEducational(findings);
});

test("the downside illustration can be exactly zero while the base month stays positive", () => {
  const findings = findingsFor({
    monthlyRevenue: 66,
    variableCostRatePercent: 0,
    monthlyFixedCosts: 51,
  });
  const downside = byId(findings, "downside-operating-profit-zero");

  assert.equal(downside.precision?.classification, "zero");
  assert.equal(downside.precision?.centsDisplay, "exact-zero");
  assert.match(downside.headline, /exactly zero/);
  assert.match(downside.caveat ?? "", /not a forecast/);
  assert.equal(ids(findings).includes("base-operating-profit-positive"), true);
  assert.equal(ids(findings).includes("base-profitable-downside-unprofitable"), false);
  assertEducational(findings);
});

test("a positive base month can become negative in the downside illustration", () => {
  const findings = findingsFor({
    monthlyRevenue: 8100,
    variableCostRatePercent: 30,
    monthlyFixedCosts: 5600,
  });

  assert.equal(ids(findings).includes("base-operating-profit-positive"), true);
  assert.equal(ids(findings).includes("downside-operating-profit-negative"), true);
  assert.equal(ids(findings).includes("base-profitable-downside-unprofitable"), true);
  assert.equal(ids(findings).includes("base-and-downside-unprofitable"), false);
  assert.match(
    byId(findings, "base-profitable-downside-unprofitable").headline,
    /above zero/,
  );
  assert.match(
    byId(findings, "base-profitable-downside-unprofitable").headline,
    /below zero/,
  );
  assertEducational(findings);
});

test("tiny positive and negative amounts stay nonzero in the wording", () => {
  const positive = findingsFor({
    monthlyRevenue: 1 + 1e-10,
    variableCostRatePercent: 0,
    monthlyFixedCosts: 1,
  });
  const negative = findingsFor({
    monthlyRevenue: 1 - 1e-10,
    variableCostRatePercent: 0,
    monthlyFixedCosts: 1,
  });
  const positiveProfit = byId(positive, "base-operating-profit-positive");
  const positiveGap = byId(positive, "margin-of-safety-positive");
  const negativeProfit = byId(negative, "base-operating-profit-negative");
  const negativeGap = byId(negative, "margin-of-safety-negative");

  for (const finding of [positiveProfit, positiveGap, negativeProfit, negativeGap]) {
    assert.equal(finding.precision?.centsDisplay, "nonzero-rounds-to-zero-cents");
    assert.match(finding.headline, /less than one cent/);
    assert.equal(finding.headline.includes("exactly zero"), false);
    assert.match(finding.explanation, /\$0\.00/);
    assert.match(finding.explanation, /not an exact zero/);
  }

  assert.equal(positiveProfit.precision?.classification, "positive");
  assert.equal(negativeProfit.precision?.classification, "negative");
  assert.equal(ids(positive).includes("base-profitable-downside-unprofitable"), true);
  assert.equal(ids(negative).includes("base-and-downside-unprofitable"), true);
  assertEducational(positive);
  assertEducational(negative);
});

test("a sub-cent operating profit is not described as exactly zero", () => {
  const above = findingsFor({
    monthlyRevenue: 1000.004,
    variableCostRatePercent: 0,
    monthlyFixedCosts: 1000,
  });
  const below = findingsFor({
    monthlyRevenue: 999.996,
    variableCostRatePercent: 0,
    monthlyFixedCosts: 1000,
  });

  assert.equal(
    byId(above, "base-operating-profit-positive").precision?.centsDisplay,
    "nonzero-rounds-to-zero-cents",
  );
  assert.equal(
    byId(below, "base-operating-profit-negative").precision?.centsDisplay,
    "nonzero-rounds-to-zero-cents",
  );
  assert.equal(
    byId(above, "margin-of-safety-positive").headline.includes("exactly zero"),
    false,
  );
  assert.equal(
    byId(below, "margin-of-safety-negative").headline.includes("exactly zero"),
    false,
  );
  assertEducational(above);
  assertEducational(below);
});

test("a zero-revenue percentage can still describe a positive dollar gap", () => {
  const result = resilienceFor({
    monthlyRevenue: 0,
    variableCostRatePercent: 30,
    monthlyFixedCosts: 0,
  });
  const findings = interpretOperatingResilience({
    ...result,
    base: {
      ...result.base,
      marginOfSafety: {
        status: "amount-defined-percent-unavailable",
        amount: 25,
        ratio: null,
      },
    },
  });
  const gap = byId(findings, "margin-of-safety-percent-unavailable");

  assert.equal(gap.precision?.classification, "positive");
  assert.equal(gap.precision?.centsDisplay, "visible-at-cents");
  assert.match(gap.headline, /above break-even/);
  assert.match(gap.headline, /percentage is unavailable/);
  assertEducational(findings);
});

test("the same result returns the same findings and is not mutated", () => {
  const result = resilienceFor(example);
  const snapshot = structuredClone(result);

  Object.freeze(result);
  Object.freeze(result.input);
  Object.freeze(result.base);
  Object.freeze(result.base.marginOfSafety);
  Object.freeze(result.base.assumptions);
  Object.freeze(result.downside);
  Object.freeze(result.downside.marginOfSafety);
  Object.freeze(result.downside.assumptions);

  const first = interpretOperatingResilience(result);
  const second = interpretOperatingResilience(result);

  assert.deepEqual(first, second);
  assert.deepEqual(result, snapshot);
  assert.notEqual(first, second);
});

test("the interpretation module does not recalculate or perform side effects", () => {
  const source = fs.readFileSync(
    path.join(process.cwd(), "src/lib/finance/operatingResilienceMessages.ts"),
    "utf8",
  );

  assert.equal(source.includes("calculateOperatingOutlook("), false);
  assert.equal(source.includes("calculateOperatingResilience("), false);
  assert.equal(source.includes("toFixed"), false);
  assert.equal(source.includes("Intl."), false);
  assert.equal(source.includes("Math.max"), false);
  assert.equal(source.includes("Math.min"), false);
  assert.equal(source.includes("Math.abs"), false);
  assert.match(source, /Math\.round/);
  assert.doesNotMatch(
    source,
    /(?:variableCosts|contribution|operatingProfit|breakEvenRevenue)\s*=/,
  );
  assert.doesNotMatch(source, /\bfetch\s*\(/);
  assert.doesNotMatch(source, /\bconsole\./);
  assert.doesNotMatch(source, /process\.env/);
  assert.doesNotMatch(source, /from ["']react["']/);
  assert.doesNotMatch(source, /from ["']next\//);
  assert.doesNotMatch(source, /from ["']openai["']/);
  assert.doesNotMatch(source, /localStorage|sessionStorage/);

  for (const phrase of bannedPhrases) {
    assert.doesNotMatch(source, phrase);
  }
});
