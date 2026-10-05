import test from "node:test";
import assert from "node:assert/strict";

import {
  calculateCarWashProfitRoi,
  carWashProfitRoiDefaultInputs,
  type CarWashProfitRoiInputs,
} from "../src/app/calculators/car-wash-profit-roi-calculator/calculateCarWashProfitRoi";

function calculate(
  overrides: Partial<CarWashProfitRoiInputs> = {}
) {
  return calculateCarWashProfitRoi({
    ...carWashProfitRoiDefaultInputs,
    ...overrides,
  });
}

function assertNear(actual: number, expected: number) {
  assert.ok(
    Math.abs(actual - expected) < 1e-6,
    `${actual} is not within 0.000001 of ${expected}`
  );
}

test("published defaults match the current car wash formulas", () => {
  const results = calculate();

  assert.equal(results.totalRevenue, 43750);
  assert.equal(results.totalMonthlyExpenses, 23962.5);
  assert.equal(results.monthlyProfit, 19787.5);
  assert.ok(
    Math.abs(results.profitMargin - 45.22857142857143) <
      1e-12
  );
  assert.ok(Math.abs(results.profitMargin - 45.2286) < 0.0001);
  assert.equal(results.annualROI, 59.3625);
  assert.equal(results.paybackMonths, 400000 / 19787.5);
  assert.ok(
    results.paybackMonths !== null &&
      Math.abs(results.paybackMonths - 20.215) < 0.001
  );
  assert.equal(results.totalInvestment, 400000);
  assert.equal(
    results.scenarios[1]?.label,
    "Expected"
  );
  assert.equal(results.scenarios[1]?.monthlyRevenue, 43750);
  assert.equal(results.scenarios[1]?.monthlyProfit, 19787.5);
});

test("a loan payment reduces profit and leaves the investment base unchanged", () => {
  const loanPayment = 1000;
  const baseline = calculate();
  const results = calculate({ loanPayment });

  assert.equal(
    results.totalInvestment,
    baseline.totalInvestment
  );
  assert.equal(results.totalInvestment, 400000);
  assert.equal(
    results.totalMonthlyExpenses,
    baseline.totalMonthlyExpenses + loanPayment
  );
  assert.equal(
    results.monthlyProfit,
    baseline.monthlyProfit - loanPayment
  );
  assert.equal(results.monthlyProfit, 18787.5);
  assert.equal(
    results.annualROI,
    ((18787.5 * 12) / 400000) * 100
  );
  assert.equal(results.paybackMonths, 400000 / 18787.5);
});

test("zero monthly profit has no positive payback", () => {
  const results = calculate({
    retailCarsPerDay: 0,
    members: 0,
    upsellRevenue: 1000,
    otherRevenue: 0,
    waterCostPerWash: 0,
    chemicalCostPerWash: 0,
    otherVariableCostPerWash: 0,
    cardProcessingRate: 0,
    labor: 1000,
    rentProperty: 0,
    electricityGas: 0,
    maintenance: 0,
    insurance: 0,
    marketing: 0,
    loanPayment: 0,
    otherExpenses: 0,
    startupInvestment: 100000,
    renovationInvestment: 0,
  });

  assert.equal(results.totalRevenue, 1000);
  assert.equal(results.totalMonthlyExpenses, 1000);
  assert.equal(results.monthlyProfit, 0);
  assert.equal(results.paybackMonths, null);
  assert.equal(results.paybackYears, null);
  assert.equal(results.annualROI, 0);
});

test("break-even retail volume is zero when membership revenue already covers costs", () => {
  const results = calculate({
    retailCarsPerDay: 40,
    operatingDays: 30,
    averageWashPrice: 10,
    members: 100,
    membershipPrice: 50,
    memberWashesPerMonth: 0,
    upsellRevenue: 0,
    otherRevenue: 0,
    waterCostPerWash: 0,
    chemicalCostPerWash: 0,
    otherVariableCostPerWash: 0,
    cardProcessingRate: 0,
    labor: 1000,
    rentProperty: 0,
    electricityGas: 0,
    maintenance: 0,
    insurance: 0,
    marketing: 0,
    loanPayment: 0,
    otherExpenses: 0,
  });

  assert.equal(results.membershipRevenue, 5000);
  assert.ok(results.membershipRevenue > results.fixedMonthlyExpenses);
  assert.equal(results.breakEvenRetailCarsPerDay, 0);
  assert.equal(results.trafficCushionCarsPerDay, 40);
});

const rankedInputs: CarWashProfitRoiInputs = {
  retailCarsPerDay: 100,
  operatingDays: 10,
  averageWashPrice: 10,
  members: 10,
  membershipPrice: 20,
  memberWashesPerMonth: 2,
  upsellRevenue: 0,
  otherRevenue: 0,
  waterCostPerWash: 2,
  chemicalCostPerWash: 0,
  otherVariableCostPerWash: 0,
  cardProcessingRate: 0,
  labor: 1000,
  rentProperty: 400,
  electricityGas: 0,
  maintenance: 0,
  insurance: 0,
  marketing: 0,
  loanPayment: 0,
  otherExpenses: 0,
  startupInvestment: 12000,
  renovationInvestment: 0,
  customRetailCarsPerDay: 50,
  customAverageWashPrice: 8,
  customMembers: 4,
  customLabor: 200,
  customRentProperty: 100,
};

test("ten percent driver changes move only that driver's monthly profit", () => {
  const results = calculateCarWashProfitRoi(rankedInputs);

  assert.equal(results.monthlyProfit, 6760);
  assertNear(
    results.sensitivity.retailTraffic.minus10Percent.monthlyProfit,
    5960
  );
  assertNear(
    results.sensitivity.retailTraffic.plus10Percent.monthlyProfit,
    7560
  );
  assertNear(
    results.sensitivity.washPrice.minus10Percent.monthlyProfit,
    5760
  );
  assertNear(
    results.sensitivity.washPrice.plus10Percent.monthlyProfit,
    7760
  );
  assertNear(
    results.sensitivity.membership.minus10Percent.monthlyProfit,
    6744
  );
  assertNear(
    results.sensitivity.membership.plus10Percent.monthlyProfit,
    6776
  );
  assertNear(
    results.sensitivity.labor.minus10Percent.monthlyProfit,
    6860
  );
  assertNear(
    results.sensitivity.labor.plus10Percent.monthlyProfit,
    6660
  );
  assertNear(
    results.sensitivity.propertyCost.minus10Percent.monthlyProfit,
    6800
  );
  assertNear(
    results.sensitivity.propertyCost.plus10Percent.monthlyProfit,
    6720
  );
});

test("sensitivity ranking follows total monthly-profit movement", () => {
  const results = calculateCarWashProfitRoi(rankedInputs);

  assert.deepEqual(
    results.sensitivityRanking.map((entry) => ({
      key: entry.key,
      label: entry.label,
    })),
    [
      { key: "washPrice", label: "Wash Price" },
      { key: "retailTraffic", label: "Retail Traffic" },
      { key: "labor", label: "Labor Cost" },
      { key: "propertyCost", label: "Property Cost" },
      { key: "membership", label: "Membership Count" },
    ]
  );
  assertNear(results.sensitivityRanking[0]?.profitImpact ?? 0, 2000);
  assertNear(results.sensitivityRanking[1]?.profitImpact ?? 0, 1600);
  assertNear(results.sensitivityRanking[2]?.profitImpact ?? 0, 200);
  assertNear(results.sensitivityRanking[3]?.profitImpact ?? 0, 80);
  assertNear(results.sensitivityRanking[4]?.profitImpact ?? 0, 32);
});

test("traffic scenarios scale retail volume by 75, 100, and 125 percent", () => {
  const results = calculateCarWashProfitRoi(rankedInputs);

  assert.deepEqual(
    results.scenarios.map((scenario) => ({
      label: scenario.label,
      retailCarsPerDay: scenario.retailCarsPerDay,
      monthlyProfit: scenario.monthlyProfit,
    })),
    [
      {
        label: "Conservative",
        retailCarsPerDay: 75,
        monthlyProfit: 4760,
      },
      {
        label: "Expected",
        retailCarsPerDay: 100,
        monthlyProfit: 6760,
      },
      {
        label: "Strong",
        retailCarsPerDay: 125,
        monthlyProfit: 8760,
      },
    ]
  );
});

test("combined and custom scenarios use their own driver sets", () => {
  const results = calculateCarWashProfitRoi(rankedInputs);

  assert.equal(
    results.combinedDownsideScenario.monthlyProfit,
    4010
  );
  assert.equal(
    results.combinedUpsideScenario.monthlyProfit,
    10010
  );
  assert.equal(results.customScenario.monthlyProfit, 2764);
  assert.equal(results.customScenario.monthlyRevenue, 4080);
  assert.equal(results.customScenario.annualROI, 276.4);
});

test("other revenue increases monthly revenue and profit", () => {
  const baseline = calculateCarWashProfitRoi(rankedInputs);
  const results = calculateCarWashProfitRoi({
    ...rankedInputs,
    otherRevenue: 250,
  });

  assert.equal(results.retailRevenue, baseline.retailRevenue);
  assert.equal(results.totalRevenue, 10450);
  assert.equal(results.monthlyProfit, 7010);
  assert.equal(
    results.monthlyProfit,
    baseline.monthlyProfit + 250
  );
});

test("other revenue lowers the break-even retail volume", () => {
  const coveredCosts = {
    retailCarsPerDay: 20,
    operatingDays: 10,
    averageWashPrice: 10,
    members: 0,
    membershipPrice: 0,
    memberWashesPerMonth: 0,
    upsellRevenue: 0,
    otherRevenue: 0,
    waterCostPerWash: 0,
    chemicalCostPerWash: 0,
    otherVariableCostPerWash: 0,
    cardProcessingRate: 0,
    labor: 200,
    rentProperty: 0,
    electricityGas: 0,
    maintenance: 0,
    insurance: 0,
    marketing: 0,
    loanPayment: 0,
    otherExpenses: 0,
    startupInvestment: 0,
    renovationInvestment: 0,
    customRetailCarsPerDay: 0,
    customAverageWashPrice: 0,
    customMembers: 0,
    customLabor: 0,
    customRentProperty: 0,
  } satisfies CarWashProfitRoiInputs;

  const withoutOtherRevenue = calculateCarWashProfitRoi({
    ...coveredCosts,
    otherRevenue: 0,
  });
  const withOtherRevenue = calculateCarWashProfitRoi({
    ...coveredCosts,
    otherRevenue: 500,
  });

  assert.equal(withoutOtherRevenue.breakEvenRetailCarsPerDay, 2);
  assert.equal(withOtherRevenue.breakEvenRetailCarsPerDay, 0);
  assert.equal(withOtherRevenue.trafficCushionCarsPerDay, 20);
});

test("break-even is unavailable when a retail wash does not contribute", () => {
  const noContribution = {
    retailCarsPerDay: 20,
    operatingDays: 10,
    members: 0,
    membershipPrice: 0,
    memberWashesPerMonth: 0,
    upsellRevenue: 0,
    otherRevenue: 0,
    chemicalCostPerWash: 0,
    otherVariableCostPerWash: 0,
    cardProcessingRate: 0,
    labor: 100,
    rentProperty: 0,
    electricityGas: 0,
    maintenance: 0,
    insurance: 0,
    marketing: 0,
    loanPayment: 0,
    otherExpenses: 0,
    startupInvestment: 0,
    renovationInvestment: 0,
    customRetailCarsPerDay: 0,
    customAverageWashPrice: 0,
    customMembers: 0,
    customLabor: 0,
    customRentProperty: 0,
  } satisfies Omit<
    CarWashProfitRoiInputs,
    "averageWashPrice" | "waterCostPerWash"
  >;

  const zeroContribution = calculateCarWashProfitRoi({
    ...noContribution,
    averageWashPrice: 5,
    waterCostPerWash: 5,
  });
  const negativeContribution = calculateCarWashProfitRoi({
    ...noContribution,
    averageWashPrice: 4,
    waterCostPerWash: 5,
  });

  assert.equal(zeroContribution.breakEvenRetailCarsPerDay, null);
  assert.equal(zeroContribution.trafficCushionCarsPerDay, null);
  assert.equal(zeroContribution.trafficCushionPercent, null);
  assert.equal(
    negativeContribution.breakEvenRetailCarsPerDay,
    null
  );
  assert.equal(
    negativeContribution.trafficCushionCarsPerDay,
    null
  );
});

test("zero operating days leaves the daily break-even unset", () => {
  const results = calculateCarWashProfitRoi({
    retailCarsPerDay: 20,
    operatingDays: 0,
    averageWashPrice: 10,
    members: 0,
    membershipPrice: 0,
    memberWashesPerMonth: 0,
    upsellRevenue: 0,
    otherRevenue: 0,
    waterCostPerWash: 0,
    chemicalCostPerWash: 0,
    otherVariableCostPerWash: 0,
    cardProcessingRate: 0,
    labor: 200,
    rentProperty: 0,
    electricityGas: 0,
    maintenance: 0,
    insurance: 0,
    marketing: 0,
    loanPayment: 0,
    otherExpenses: 0,
    startupInvestment: 0,
    renovationInvestment: 0,
    customRetailCarsPerDay: 0,
    customAverageWashPrice: 0,
    customMembers: 0,
    customLabor: 0,
    customRentProperty: 0,
  });

  assert.equal(results.retailWashesPerMonth, 0);
  assert.equal(results.breakEvenRetailCarsPerDay, null);
  assert.equal(results.trafficCushionCarsPerDay, null);
  assert.equal(results.trafficCushionPercent, null);
});
