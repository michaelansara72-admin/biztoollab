import test from "node:test";
import assert from "node:assert/strict";

import { calculateRoi } from "../src/app/calculators/roi-calculator/calculateRoi";

function assertNear(actual: number, expected: number) {
  assert.ok(
    Math.abs(actual - expected) < 1e-9,
    `${actual} is not within 0.000000001 of ${expected}`
  );
}

test("a total loss over three years annualizes to -100 percent", () => {
  const results = calculateRoi({
    initialInvestment: 50000,
    finalValue: 0,
    holdingPeriodYears: 3,
  });

  assert.ok(results);
  assert.equal(results.netProfit, -50000);
  assert.equal(results.roiPercent, -100);
  assert.equal(results.returnMultiple, 0);
  assert.equal(results.annualizedReturnPercent, -100);
});

test("a one-year gain matches simple ROI", () => {
  const results = calculateRoi({
    initialInvestment: 50000,
    finalValue: 65000,
    holdingPeriodYears: 1,
  });

  assert.ok(results);
  assert.equal(results.netProfit, 15000);
  assert.equal(results.roiPercent, 30);
  assert.equal(results.returnMultiple, 1.3);
  assertNear(results.annualizedReturnPercent, 30);
});

test("a multi-year gain compounds the annualized return", () => {
  const results = calculateRoi({
    initialInvestment: 50000,
    finalValue: 65000,
    holdingPeriodYears: 3,
  });

  assert.ok(results);
  assert.equal(results.netProfit, 15000);
  assert.equal(results.roiPercent, 30);
  assert.equal(results.returnMultiple, 1.3);
  assertNear(results.annualizedReturnPercent, 9.139288306110593);
});

test("a partial loss over two years stays negative", () => {
  const results = calculateRoi({
    initialInvestment: 50000,
    finalValue: 25000,
    holdingPeriodYears: 2,
  });

  assert.ok(results);
  assert.equal(results.netProfit, -25000);
  assert.equal(results.roiPercent, -50);
  assert.equal(results.returnMultiple, 0.5);
  assertNear(results.annualizedReturnPercent, -29.28932188134524);
});

test("an unchanged investment has zero profit and zero annualized return", () => {
  const results = calculateRoi({
    initialInvestment: 50000,
    finalValue: 50000,
    holdingPeriodYears: 3,
  });

  assert.ok(results);
  assert.equal(results.netProfit, 0);
  assert.equal(results.roiPercent, 0);
  assert.equal(results.returnMultiple, 1);
  assert.equal(results.annualizedReturnPercent, 0);
});

test("a very small ending value stays near a total loss", () => {
  const results = calculateRoi({
    initialInvestment: 50000,
    finalValue: 0.01,
    holdingPeriodYears: 3,
  });

  assert.ok(results);
  assertNear(results.netProfit, -49999.99);
  assertNear(results.roiPercent, -99.99998);
  assertNear(results.returnMultiple, 0.0000002);
  assertNear(results.annualizedReturnPercent, -99.41519645235742);
  assert.notEqual(results.annualizedReturnPercent, 0);
});

test("a zero initial investment is outside the calculation domain", () => {
  assert.equal(
    calculateRoi({
      initialInvestment: 0,
      finalValue: 100,
      holdingPeriodYears: 3,
    }),
    null
  );
});

test("a zero holding period is outside the calculation domain", () => {
  assert.equal(
    calculateRoi({
      initialInvestment: 50000,
      finalValue: 65000,
      holdingPeriodYears: 0,
    }),
    null
  );
});

test("a negative initial investment is outside the calculation domain", () => {
  assert.equal(
    calculateRoi({
      initialInvestment: -50000,
      finalValue: 0,
      holdingPeriodYears: 3,
    }),
    null
  );
});

test("a negative final value is outside the calculation domain", () => {
  assert.equal(
    calculateRoi({
      initialInvestment: 50000,
      finalValue: -1,
      holdingPeriodYears: 3,
    }),
    null
  );
});

test("NaN and Infinity inputs are outside the calculation domain", () => {
  assert.equal(
    calculateRoi({
      initialInvestment: Number.NaN,
      finalValue: 65000,
      holdingPeriodYears: 3,
    }),
    null
  );
  assert.equal(
    calculateRoi({
      initialInvestment: 50000,
      finalValue: Number.POSITIVE_INFINITY,
      holdingPeriodYears: 3,
    }),
    null
  );
  assert.equal(
    calculateRoi({
      initialInvestment: Number.NEGATIVE_INFINITY,
      finalValue: 0,
      holdingPeriodYears: 1,
    }),
    null
  );
});
