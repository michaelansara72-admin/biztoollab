import test from "node:test";
import assert from "node:assert/strict";

import {
  calculateLiquidity,
  LIQUIDITY_MAX_MONETARY_AMOUNT,
  LIQUIDITY_MONETARY_FIELDS,
  type LiquidityCalculation,
  type LiquidityInput,
  type LiquidityMonetaryField,
  type LiquidityResult,
} from "../src/lib/finance/calculateLiquidity";

/**
 * Hand totals for the standard example:
 * assets 20,000 + 10,000 + 5,000 + 15,000 + 30,000 + 2,000 + 3,000 = 85,000
 * quick assets 20,000 + 5,000 + 15,000 = 40,000
 * 85,000 / 40,000 = 2.125
 * 40,000 / 40,000 = 1
 * 20,000 / 40,000 = 0.5
 * 85,000 - 40,000 = 45,000
 */
const standardExample: LiquidityInput = {
  unrestrictedCashAndEquivalents: 20_000,
  currentRestrictedCash: 10_000,
  eligibleShortTermInvestments: 5_000,
  netCollectibleCurrentReceivables: 15_000,
  inventory: 30_000,
  prepaidExpenses: 2_000,
  otherCurrentAssets: 3_000,
  currentLiabilities: 40_000,
};

function zeros(): LiquidityInput {
  return {
    unrestrictedCashAndEquivalents: 0,
    currentRestrictedCash: 0,
    eligibleShortTermInvestments: 0,
    netCollectibleCurrentReceivables: 0,
    inventory: 0,
    prepaidExpenses: 0,
    otherCurrentAssets: 0,
    currentLiabilities: 0,
  };
}

function resultFor(input: LiquidityInput): LiquidityResult {
  const calculation = calculateLiquidity(input);

  if (!calculation.ok) {
    assert.fail(calculation.code);
  }

  return calculation.result;
}

function definedRatio(
  calculation: LiquidityResult,
  name: "currentRatio" | "quickRatio" | "cashRatio",
) {
  const ratio = calculation[name];

  if (ratio.status !== "defined") {
    assert.fail(`expected a defined ratio, received ${ratio.status}`);
  }

  return ratio.value;
}

test("standard positive amounts produce the hand-calculated ratios", () => {
  const result = resultFor(standardExample);

  assert.equal(result.totalCurrentAssets, 85_000);
  assert.equal(result.quickAssets, 40_000);
  assert.equal(result.currentLiabilities, 40_000);
  assert.equal(definedRatio(result, "currentRatio"), 2.125);
  assert.equal(definedRatio(result, "quickRatio"), 1);
  assert.equal(definedRatio(result, "cashRatio"), 0.5);
  assert.equal(result.netWorkingCapital, 45_000);
});

test("all-zero inputs keep a zero working-capital gap and undefined ratios", () => {
  const result = resultFor(zeros());

  assert.equal(result.totalCurrentAssets, 0);
  assert.equal(result.quickAssets, 0);
  assert.equal(result.currentLiabilities, 0);
  assert.equal(result.netWorkingCapital, 0);
  assert.deepEqual(result.currentRatio, {
    status: "unavailable-zero-liabilities",
  });
  assert.deepEqual(result.quickRatio, {
    status: "unavailable-zero-liabilities",
  });
  assert.deepEqual(result.cashRatio, {
    status: "unavailable-zero-liabilities",
  });
  assert.equal(Object.is(result.netWorkingCapital, -0), false);
});

test("zero liabilities with positive assets leave the ratios unavailable", () => {
  const result = resultFor({
    ...zeros(),
    unrestrictedCashAndEquivalents: 25_000,
    inventory: 15_000,
  });

  assert.equal(result.totalCurrentAssets, 40_000);
  assert.equal(result.quickAssets, 25_000);
  assert.equal(result.netWorkingCapital, 40_000);
  assert.equal(result.currentRatio.status, "unavailable-zero-liabilities");
  assert.equal(result.quickRatio.status, "unavailable-zero-liabilities");
  assert.equal(result.cashRatio.status, "unavailable-zero-liabilities");
  assert.equal(JSON.stringify(result).includes("Infinity"), false);
  assert.equal(JSON.stringify(result).includes("NaN"), false);
});

test("current assets below current liabilities produce a ratio below one", () => {
  const result = resultFor({
    ...zeros(),
    unrestrictedCashAndEquivalents: 1_000,
    currentLiabilities: 4_000,
  });

  assert.equal(result.totalCurrentAssets, 1_000);
  assert.equal(result.currentLiabilities, 4_000);
  assert.equal(definedRatio(result, "currentRatio"), 0.25);
  assert.equal(definedRatio(result, "quickRatio"), 0.25);
  assert.equal(definedRatio(result, "cashRatio"), 0.25);
});

test("negative net working capital is returned as a signed difference", () => {
  const result = resultFor({
    ...zeros(),
    unrestrictedCashAndEquivalents: 1_000,
    currentLiabilities: 4_000,
  });

  assert.equal(result.netWorkingCapital, -3_000);
  assert.ok(result.netWorkingCapital < 0);
});

test("current restricted cash raises current assets and stays out of the quick and cash ratios", () => {
  const result = resultFor({
    ...zeros(),
    currentRestrictedCash: 100,
    currentLiabilities: 50,
  });

  assert.equal(result.totalCurrentAssets, 100);
  assert.equal(result.quickAssets, 0);
  assert.equal(definedRatio(result, "currentRatio"), 2);
  assert.equal(definedRatio(result, "quickRatio"), 0);
  assert.equal(definedRatio(result, "cashRatio"), 0);
  assert.equal(result.netWorkingCapital, 50);
});

test("inventory is excluded from quick assets and both narrower ratios", () => {
  const result = resultFor({
    ...zeros(),
    inventory: 80,
    currentLiabilities: 40,
  });

  assert.equal(result.totalCurrentAssets, 80);
  assert.equal(result.quickAssets, 0);
  assert.equal(definedRatio(result, "currentRatio"), 2);
  assert.equal(definedRatio(result, "quickRatio"), 0);
  assert.equal(definedRatio(result, "cashRatio"), 0);
});

test("prepaid expenses are excluded from quick assets and both narrower ratios", () => {
  const result = resultFor({
    ...zeros(),
    prepaidExpenses: 80,
    currentLiabilities: 40,
  });

  assert.equal(result.totalCurrentAssets, 80);
  assert.equal(result.quickAssets, 0);
  assert.equal(definedRatio(result, "currentRatio"), 2);
  assert.equal(definedRatio(result, "quickRatio"), 0);
  assert.equal(definedRatio(result, "cashRatio"), 0);
});

test("other current assets are excluded from quick assets and both narrower ratios", () => {
  const result = resultFor({
    ...zeros(),
    otherCurrentAssets: 80,
    currentLiabilities: 40,
  });

  assert.equal(result.totalCurrentAssets, 80);
  assert.equal(result.quickAssets, 0);
  assert.equal(definedRatio(result, "currentRatio"), 2);
  assert.equal(definedRatio(result, "quickRatio"), 0);
  assert.equal(definedRatio(result, "cashRatio"), 0);
});

test("zero unrestricted cash with positive receivables leaves the cash ratio at zero", () => {
  const result = resultFor({
    ...zeros(),
    netCollectibleCurrentReceivables: 30,
    currentLiabilities: 10,
  });

  assert.equal(result.totalCurrentAssets, 30);
  assert.equal(result.quickAssets, 30);
  assert.equal(definedRatio(result, "cashRatio"), 0);
  assert.equal(definedRatio(result, "quickRatio"), 3);
  assert.equal(definedRatio(result, "currentRatio"), 3);
  assert.equal(result.netWorkingCapital, 20);
});

test("a missing required field is rejected and is not treated as zero", () => {
  for (const field of LIQUIDITY_MONETARY_FIELDS) {
    const input = { ...standardExample };
    delete input[field];

    const calculation = calculateLiquidity(input);

    assert.deepEqual(calculation, {
      ok: false,
      code: "missing-field",
      field,
    });
  }
});

test("a non-numeric field is rejected", () => {
  const input = {
    ...standardExample,
    inventory: "80",
  } as unknown as LiquidityInput;

  assert.deepEqual(calculateLiquidity(input), {
    ok: false,
    code: "non-numeric",
    field: "inventory",
  });
});

test("null and a non-object input are rejected", () => {
  assert.deepEqual(
    calculateLiquidity(null as unknown as LiquidityInput),
    { ok: false, code: "incomplete-input" },
  );
  assert.deepEqual(
    calculateLiquidity(undefined as unknown as LiquidityInput),
    { ok: false, code: "incomplete-input" },
  );
});

test("negative monetary inputs are rejected", () => {
  for (const field of LIQUIDITY_MONETARY_FIELDS) {
    const calculation = calculateLiquidity({
      ...zeros(),
      [field]: -1,
    });

    assert.deepEqual(calculation, {
      ok: false,
      code: "negative",
      field,
    });
  }
});

test("NaN and infinite inputs are rejected", () => {
  for (const value of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
    const calculation = calculateLiquidity({
      ...zeros(),
      unrestrictedCashAndEquivalents: value,
    });

    assert.deepEqual(calculation, {
      ok: false,
      code: "non-finite",
      field: "unrestrictedCashAndEquivalents",
    });
  }
});

test("the documented maximum is accepted and one unit past it is rejected", () => {
  const atMaximum = resultFor({
    ...zeros(),
    unrestrictedCashAndEquivalents: LIQUIDITY_MAX_MONETARY_AMOUNT,
    currentRestrictedCash: LIQUIDITY_MAX_MONETARY_AMOUNT,
    eligibleShortTermInvestments: LIQUIDITY_MAX_MONETARY_AMOUNT,
    netCollectibleCurrentReceivables: LIQUIDITY_MAX_MONETARY_AMOUNT,
    inventory: LIQUIDITY_MAX_MONETARY_AMOUNT,
    prepaidExpenses: LIQUIDITY_MAX_MONETARY_AMOUNT,
    otherCurrentAssets: LIQUIDITY_MAX_MONETARY_AMOUNT,
    currentLiabilities: LIQUIDITY_MAX_MONETARY_AMOUNT,
  });

  assert.equal(atMaximum.totalCurrentAssets, 7_000_000_000_000);
  assert.equal(atMaximum.quickAssets, 3_000_000_000_000);
  assert.equal(definedRatio(atMaximum, "currentRatio"), 7);
  assert.equal(atMaximum.netWorkingCapital, 6_000_000_000_000);

  const aboveMaximum = calculateLiquidity({
    ...zeros(),
    inventory: LIQUIDITY_MAX_MONETARY_AMOUNT + 1,
  });

  assert.deepEqual(aboveMaximum, {
    ok: false,
    code: "above-maximum",
    field: "inventory",
  });

  assert.deepEqual(
    calculateLiquidity({
      ...zeros(),
      currentLiabilities: Number.MAX_VALUE,
    }),
    {
      ok: false,
      code: "above-maximum",
      field: "currentLiabilities",
    },
  );
});

test("a positive liability too small for a finite ratio is rejected", () => {
  const calculation = calculateLiquidity({
    ...zeros(),
    unrestrictedCashAndEquivalents: LIQUIDITY_MAX_MONETARY_AMOUNT,
    currentLiabilities: 1e-300,
  });

  assert.deepEqual(calculation, { ok: false, code: "non-finite-result" });
});

test("a fractional currency amount is preserved instead of rounded", () => {
  const result = resultFor({
    ...zeros(),
    unrestrictedCashAndEquivalents: 0.01,
    currentLiabilities: 1,
  });

  assert.equal(definedRatio(result, "cashRatio"), 0.01);
  assert.equal(result.netWorkingCapital, -0.99);
});

test("the input object is not mutated", () => {
  const input: LiquidityInput = { ...standardExample };
  const snapshot: LiquidityInput = { ...input };

  calculateLiquidity(input);

  assert.deepEqual(input, snapshot);
});

test("the same input always produces the same result", () => {
  const first = calculateLiquidity(standardExample);
  const second = calculateLiquidity(standardExample);

  assert.deepEqual(first, second);
});

test("an unknown property does not change the result", () => {
  const withExtra = {
    ...standardExample,
    accountNumber: "should-be-ignored",
  } as LiquidityInput;

  assert.deepEqual(
    calculateLiquidity(withExtra),
    calculateLiquidity(standardExample),
  );
});

test("successful output contains numbers and ratio states rather than advice", () => {
  const calculation: LiquidityCalculation = calculateLiquidity(standardExample);

  assert.equal(calculation.ok, true);

  if (!calculation.ok) {
    return;
  }

  for (const value of [
    calculation.result.totalCurrentAssets,
    calculation.result.quickAssets,
    calculation.result.currentLiabilities,
    calculation.result.netWorkingCapital,
  ]) {
    assert.equal(typeof value, "number");
    assert.equal(Number.isFinite(value), true);
  }

  assert.equal(calculation.result.assumptions.includes("no-health-score-or-threshold"), true);
  assert.equal(JSON.stringify(calculation.result).includes("healthy"), false);
});

test("the first invalid field in canonical order is the one reported", () => {
  const input = {
    ...standardExample,
    unrestrictedCashAndEquivalents: Number.NaN,
    inventory: -5,
  };

  assert.deepEqual(calculateLiquidity(input), {
    ok: false,
    code: "non-finite",
    field: "unrestrictedCashAndEquivalents" satisfies LiquidityMonetaryField,
  });
});
