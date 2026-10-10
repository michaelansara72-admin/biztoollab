import test from "node:test";
import assert from "node:assert/strict";

import {
  calculateBreakEven,
  formatContributionMargin,
} from "../src/app/calculators/break-even-calculator/calculateBreakEven";

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
