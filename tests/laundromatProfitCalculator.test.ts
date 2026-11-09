import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import LaundromatProfitCalculatorPage from "../src/app/calculators/laundromat-profit-calculator/page";
import { metadata } from "../src/app/calculators/laundromat-profit-calculator/layout";
import {
  calculateLaundromatProfit,
  defaultLaundromatProfitInput,
  illustrativeLaundromatExample,
  illustrativeLaundromatLowerTurns,
  revenuePerMachine,
} from "../src/app/calculators/laundromat-profit-calculator/calculateLaundromatProfit";

test("default laundromat inputs keep the existing profit figures", () => {
  const result = calculateLaundromatProfit(defaultLaundromatProfitInput);

  assert.equal(result.washerRevenue, 12600);
  assert.equal(result.dryerRevenue, 6480);
  assert.equal(result.machineRevenue, 19080);
  assert.equal(result.ancillaryRevenue, 0);
  assert.equal(result.monthlyRevenue, 19080);
  assert.equal(result.processingFees, 572.4);
  assert.equal(result.monthlyExpenses, 14172.4);
  assert.equal(result.monthlyProfit, 4907.6);
  assert.equal(result.annualProfit, result.monthlyProfit * 12);
  assert.equal(Math.round(result.annualProfit), 58891);
  assert.equal(result.profitMargin.toFixed(1), "25.7");
  assert.equal(result.annualROI.toFixed(1), "19.6");
  assert.equal(result.breakEvenMonths?.toFixed(1), "61.1");
  assert.equal(result.breakEvenYears?.toFixed(1), "5.1");
  assert.equal(revenuePerMachine(30, result.washerRevenue), 420);
  assert.equal(revenuePerMachine(24, result.dryerRevenue), 270);
});

test("processing applies to total revenue and a loan payment reduces profit", () => {
  const base = calculateLaundromatProfit({
    ...defaultLaundromatProfitInput,
    processingRate: 0,
    monthlyLoanPayment: 0,
  });
  const withProcessing = calculateLaundromatProfit({
    ...defaultLaundromatProfitInput,
    processingRate: 3,
    monthlyLoanPayment: 0,
  });
  const withLoan = calculateLaundromatProfit({
    ...defaultLaundromatProfitInput,
    processingRate: 3,
    monthlyLoanPayment: 1000,
  });

  assert.equal(withProcessing.monthlyRevenue, base.monthlyRevenue);
  assert.equal(withProcessing.processingFees, base.monthlyRevenue * 0.03);
  assert.equal(withProcessing.monthlyProfit, base.monthlyProfit - withProcessing.processingFees);
  assert.equal(withLoan.monthlyRevenue, withProcessing.monthlyRevenue);
  assert.equal(withLoan.monthlyProfit, withProcessing.monthlyProfit - 1000);
});

test("zero machine counts leave revenue per machine unavailable", () => {
  const result = calculateLaundromatProfit({
    ...defaultLaundromatProfitInput,
    washers: 0,
    dryers: 0,
  });

  assert.equal(result.washerRevenue, 0);
  assert.equal(result.dryerRevenue, 0);
  assert.equal(revenuePerMachine(0, result.washerRevenue), null);
  assert.equal(revenuePerMachine(0, result.dryerRevenue), null);
});

test("the illustration and its lower-turn case use the same machine formula", () => {
  assert.equal(illustrativeLaundromatExample.washerRevenue, 10800);
  assert.equal(illustrativeLaundromatExample.dryerRevenue, 8100);
  assert.equal(illustrativeLaundromatExample.machineRevenue, 18900);
  assert.equal(illustrativeLaundromatExample.monthlyExpenses, 0);
  assert.equal(illustrativeLaundromatLowerTurns.washerRevenue, 8400);
  assert.equal(illustrativeLaundromatLowerTurns.dryerRevenue, 6300);
  assert.equal(illustrativeLaundromatLowerTurns.machineRevenue, 14700);
});

test("the laundromat page explains per-machine revenue and keeps its canonical", () => {
  const html = renderToStaticMarkup(createElement(LaundromatProfitCalculatorPage));

  assert.match(html, /\$12,600/);
  assert.match(html, /\$6,480/);
  assert.match(html, /\$19,080/);
  assert.match(html, /\$4,908/);
  assert.match(html, /25\.7%/);
  assert.match(html, /Revenue per washer:/);
  assert.match(html, /\$420/);
  assert.match(html, /Revenue per dryer:/);
  assert.match(html, /\$270/);
  assert.match(html, /20 × 4\.5 × \$4 × 30/);
  assert.match(html, /\$10,800/);
  assert.match(html, /\$8,100/);
  assert.match(html, /\$18,900/);
  assert.match(html, /\$14,700/);
  assert.match(html, /not an industry benchmark/);
  assert.match(html, /entered rate applied to total monthly revenue/);
  assert.match(html, /href="\/blog\/how-much-profit-can-a-laundromat-make"/);
  assert.equal(
    metadata.alternates?.canonical,
    "https://biztoollab.com/calculators/laundromat-profit-calculator"
  );
});
