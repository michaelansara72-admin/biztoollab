import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
  calculateBreakEven,
  formatContributionMargin,
} from "../src/app/calculators/break-even-calculator/calculateBreakEven";
import BreakEvenCalculator from "../src/app/calculators/break-even-calculator/page";
import { metadata } from "../src/app/calculators/break-even-calculator/layout";

function assertNear(actual: number | null, expected: number) {
  assert.ok(actual !== null);
  assert.ok(
    Math.abs(actual - expected) < 1e-9,
    `${actual} is not within 0.000000001 of ${expected}`,
  );
}

test("fractional break-even units round up separately from theoretical revenue", () => {
  const results = calculateBreakEven({
    fixedCosts: 1000,
    sellingPrice: 30,
    variableCost: 11,
    targetProfit: 0,
  });

  assert.equal(results.contributionMarginPerUnit, 19);
  assertNear(results.breakEvenUnits, 52.63157894736842);
  assert.equal(results.breakEvenUnitsRoundedUp, 53);
  assertNear(results.breakEvenRevenue, 1578.9473684210527);
  assert.equal(53 * 30, 1590);
  assert.notEqual(results.breakEvenRevenue, 1590);
});

test("the worked example rounds units up and keeps theoretical revenue", () => {
  const results = calculateBreakEven({
    fixedCosts: 10000,
    sellingPrice: 50,
    variableCost: 20,
    targetProfit: 0,
  });

  assert.equal(results.contributionMarginPerUnit, 30);
  assertNear(results.breakEvenUnits, 333.3333333333333);
  assert.equal(results.breakEvenUnitsRoundedUp, 334);
  assertNear(results.breakEvenRevenue, 16666.666666666668);
  assert.equal(334 * 50, 16700);
  assert.notEqual(results.breakEvenRevenue, 16700);
});

test("an exact target-profit unit count matches its theoretical revenue", () => {
  const results = calculateBreakEven({
    fixedCosts: 10000,
    sellingPrice: 50,
    variableCost: 20,
    targetProfit: 5000,
  });

  assert.equal(results.targetProfitUnits, 500);
  assert.equal(results.targetProfitUnitsRoundedUp, 500);
  assert.equal(results.targetProfitRevenue, 25000);
});

test("a non-positive contribution margin has no break-even result", () => {
  const equalPrice = calculateBreakEven({
    fixedCosts: 1000,
    sellingPrice: 20,
    variableCost: 20,
    targetProfit: 5000,
  });

  assert.equal(equalPrice.contributionMarginPerUnit, 0);
  assert.equal(equalPrice.breakEvenUnits, null);
  assert.equal(equalPrice.breakEvenUnitsRoundedUp, null);
  assert.equal(equalPrice.breakEvenRevenue, null);
  assert.equal(equalPrice.targetProfitUnits, null);
  assert.equal(equalPrice.targetProfitRevenue, null);

  const higherCost = calculateBreakEven({
    fixedCosts: 1000,
    sellingPrice: 10,
    variableCost: 20,
    targetProfit: 5000,
  });

  assert.equal(higherCost.contributionMarginPerUnit, -10);
  assert.equal(higherCost.breakEvenUnits, null);
  assert.equal(higherCost.breakEvenRevenue, null);
  assert.equal(higherCost.targetProfitUnits, null);
  assert.equal(higherCost.targetProfitRevenue, null);
});

test("zero fixed costs with a positive margin break even at zero", () => {
  const results = calculateBreakEven({
    fixedCosts: 0,
    sellingPrice: 30,
    variableCost: 11,
    targetProfit: 0,
  });

  assert.equal(results.contributionMarginPerUnit, 19);
  assert.equal(results.breakEvenUnits, 0);
  assert.equal(results.breakEvenUnitsRoundedUp, 0);
  assert.equal(results.breakEvenRevenue, 0);
});

test("a fractional contribution margin keeps its cents", () => {
  assert.equal(formatContributionMargin(0.4), "$0.40");
});

test("a whole-dollar contribution margin stays in dollars", () => {
  assert.equal(formatContributionMargin(19), "$19");
});

test("exact, near-integer, fractional, and invalid unit counts stay distinct", () => {
  const exact = calculateBreakEven({
    fixedCosts: 100,
    sellingPrice: 2,
    variableCost: 1,
    targetProfit: 0,
  });
  assert.equal(exact.breakEvenUnits, 100);
  assert.equal(exact.breakEvenUnitsRoundedUp, 100);

  const nearInteger = calculateBreakEven({
    fixedCosts: 2,
    sellingPrice: 0.03,
    variableCost: 0.01,
    targetProfit: 0,
  });
  assert.ok(nearInteger.breakEvenUnits !== null);
  assert.ok(nearInteger.breakEvenUnits > 100);
  assert.equal(nearInteger.breakEvenUnitsRoundedUp, 100);
  assert.equal(nearInteger.targetProfitUnitsRoundedUp, 100);

  const genuineFraction = calculateBreakEven({
    fixedCosts: 100.1,
    sellingPrice: 1,
    variableCost: 0,
    targetProfit: 0,
  });
  assert.equal(genuineFraction.breakEvenUnitsRoundedUp, 101);

  const oneThird = calculateBreakEven({
    fixedCosts: 10000,
    sellingPrice: 50,
    variableCost: 20,
    targetProfit: 0,
  });
  assert.equal(oneThird.breakEvenUnitsRoundedUp, 334);

  const repeating = calculateBreakEven({
    fixedCosts: 1000,
    sellingPrice: 30,
    variableCost: 11,
    targetProfit: 0,
  });
  assert.equal(repeating.breakEvenUnitsRoundedUp, 53);

  const invalid = calculateBreakEven({
    fixedCosts: 2,
    sellingPrice: 0.03,
    variableCost: 0.03,
    targetProfit: 0,
  });
  assert.equal(invalid.breakEvenUnits, null);
  assert.equal(invalid.breakEvenUnitsRoundedUp, null);
  assert.equal(invalid.breakEvenRevenue, null);
});

test("the default break-even results show theoretical revenue and revenue at 334 units", () => {
  const html = renderToStaticMarkup(createElement(BreakEvenCalculator));

  assert.match(html, /Minimum Whole Units/);
  assert.match(html, />334</);
  assert.match(html, /Theoretical Break-Even Revenue/);
  assert.match(html, /\$16,666\.67/);
  assert.match(html, /Revenue at 334 Units/);
  assert.match(html, /produce \$16,700\.00\. The exact break-even sales amount is \$16,666\.67\./);
  assert.match(html, /same time period/);
  assert.match(html, /operating profit margins/);
  assert.doesNotMatch(html, /net profit margins/);
  assert.match(
    html,
    /href="\/blog\/how-to-calculate-business-break-even-point"/,
  );
  assert.equal(
    metadata.alternates?.canonical,
    "https://biztoollab.com/calculators/break-even-calculator",
  );
});
