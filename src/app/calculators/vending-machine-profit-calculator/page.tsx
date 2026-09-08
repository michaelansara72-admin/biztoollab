"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

export default function VendingMachineProfitCalculator() {
  const [machineCount, setMachineCount] = useState(10);
  const [salesPerMachine, setSalesPerMachine] = useState(650);
  const [productCostPercent, setProductCostPercent] = useState(45);
  const [locationCommissionPercent, setLocationCommissionPercent] =
    useState(10);
  const [cardSalesPercent, setCardSalesPercent] = useState(70);
  const [cardProcessingPercent, setCardProcessingPercent] = useState(3);
  const [restockingCost, setRestockingCost] = useState(500);
  const [maintenanceCost, setMaintenanceCost] = useState(250);
  const [insuranceCost, setInsuranceCost] = useState(100);
  const [otherExpenses, setOtherExpenses] = useState(200);
  const [machineInvestment, setMachineInvestment] = useState(30000);
  const [monthlyLoanPayment, setMonthlyLoanPayment] = useState(0);

  const results = useMemo(() => {
    const monthlyRevenue = machineCount * salesPerMachine;

    const productCost =
      monthlyRevenue * (Math.max(productCostPercent, 0) / 100);

    const locationCommission =
      monthlyRevenue * (Math.max(locationCommissionPercent, 0) / 100);

    const cardRevenue =
      monthlyRevenue * (Math.max(cardSalesPercent, 0) / 100);

    const processingFees =
      cardRevenue * (Math.max(cardProcessingPercent, 0) / 100);

    const totalExpenses =
      productCost +
      locationCommission +
      processingFees +
      restockingCost +
      maintenanceCost +
      insuranceCost +
      otherExpenses +
      monthlyLoanPayment;

    const monthlyProfit = monthlyRevenue - totalExpenses;
    const annualProfit = monthlyProfit * 12;

    const profitMargin =
      monthlyRevenue > 0 ? (monthlyProfit / monthlyRevenue) * 100 : 0;

    const annualROI =
      machineInvestment > 0 ? (annualProfit / machineInvestment) * 100 : 0;

    const paybackMonths =
      monthlyProfit > 0 && machineInvestment > 0
        ? machineInvestment / monthlyProfit
        : null;

    const revenuePerMachine =
      machineCount > 0 ? monthlyRevenue / machineCount : 0;

    const profitPerMachine =
      machineCount > 0 ? monthlyProfit / machineCount : 0;

    return {
      monthlyRevenue,
      productCost,
      locationCommission,
      cardRevenue,
      processingFees,
      totalExpenses,
      monthlyProfit,
      annualProfit,
      profitMargin,
      annualROI,
      paybackMonths,
      revenuePerMachine,
      profitPerMachine,
    };
  }, [
    machineCount,
    salesPerMachine,
    productCostPercent,
    locationCommissionPercent,
    cardSalesPercent,
    cardProcessingPercent,
    restockingCost,
    maintenanceCost,
    insuranceCost,
    otherExpenses,
    machineInvestment,
    monthlyLoanPayment,
  ]);

  const currency = (value: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(value);

  const percent = (value: number) =>
    `${value.toLocaleString("en-US", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    })}%`;

  const NumberField = ({
    label,
    value,
    onChange,
    prefix,
    suffix,
    step = "1",
  }: {
    label: string;
    value: number;
    onChange: (value: number) => void;
    prefix?: string;
    suffix?: string;
    step?: string;
  }) => (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-700">
        {label}
      </span>

      <div className="flex overflow-hidden rounded-xl border border-slate-300 bg-white focus-within:border-slate-500">
        {prefix && (
          <span className="flex items-center border-r border-slate-200 bg-slate-50 px-3 text-slate-500">
            {prefix}
          </span>
        )}

       <input
  type="number"
  defaultValue={value}
  step={step}
  min="0"
  onBlur={(event) => {
    const newValue = Math.max(
      0,
      Number(event.target.value) || 0
    );

    onChange(newValue);
    event.target.value = String(newValue);
  }}
  onKeyDown={(event) => {
    if (event.key === "Enter") {
      event.currentTarget.blur();
    }
  }}
  className="w-full px-4 py-3 outline-none"
/>

        {suffix && (
          <span className="flex items-center border-l border-slate-200 bg-slate-50 px-3 text-slate-500">
            {suffix}
          </span>
        )}
      </div>
    </label>
  );

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <Link href="/" className="text-xl font-bold tracking-tight">
              BizToolLab
            </Link>
            <p className="text-xs text-slate-500">
              Smart tools for smarter business decisions
            </p>
          </div>

          <Link
            href="/"
            className="text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            ← Back to tools
          </Link>
        </div>
      </header>

      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-12">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-slate-500">
            Industry Calculator
          </p>

          <h1 className="max-w-4xl text-4xl font-bold tracking-tight sm:text-5xl">
            Vending Machine Profit Calculator
          </h1>

          <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-600">
            Estimate vending machine revenue, product costs, commissions,
            processing fees, monthly profit, annual profit, ROI, and investment
            payback time.
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-6 py-10 lg:grid-cols-[1.35fr_0.85fr]">
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold">Machine Revenue</h2>
            <p className="mt-1 text-sm text-slate-500">
              Enter the size and average monthly sales of your vending route.
            </p>

            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <NumberField
                label="Number of vending machines"
                value={machineCount}
                onChange={setMachineCount}
              />

              <NumberField
                label="Average monthly sales per machine"
                value={salesPerMachine}
                onChange={setSalesPerMachine}
                prefix="$"
                step="10"
              />

              <NumberField
                label="Product cost"
                value={productCostPercent}
                onChange={setProductCostPercent}
                suffix="%"
                step="0.1"
              />

              <NumberField
                label="Location commission"
                value={locationCommissionPercent}
                onChange={setLocationCommissionPercent}
                suffix="%"
                step="0.1"
              />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold">Payment Processing</h2>
            <p className="mt-1 text-sm text-slate-500">
              Estimate the portion of sales paid by card and your processing
              rate.
            </p>

            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <NumberField
                label="Sales paid by card"
                value={cardSalesPercent}
                onChange={setCardSalesPercent}
                suffix="%"
                step="0.1"
              />

              <NumberField
                label="Card processing rate"
                value={cardProcessingPercent}
                onChange={setCardProcessingPercent}
                suffix="%"
                step="0.1"
              />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold">Monthly Operating Expenses</h2>
            <p className="mt-1 text-sm text-slate-500">
              Add the ongoing costs required to operate and service your route.
            </p>

            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <NumberField
                label="Restocking / transportation"
                value={restockingCost}
                onChange={setRestockingCost}
                prefix="$"
                step="10"
              />

              <NumberField
                label="Maintenance and repairs"
                value={maintenanceCost}
                onChange={setMaintenanceCost}
                prefix="$"
                step="10"
              />

              <NumberField
                label="Insurance"
                value={insuranceCost}
                onChange={setInsuranceCost}
                prefix="$"
                step="10"
              />

              <NumberField
                label="Other monthly expenses"
                value={otherExpenses}
                onChange={setOtherExpenses}
                prefix="$"
                step="10"
              />

              <NumberField
                label="Monthly loan payment"
                value={monthlyLoanPayment}
                onChange={setMonthlyLoanPayment}
                prefix="$"
                step="10"
              />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold">Investment</h2>
            <p className="mt-1 text-sm text-slate-500">
              Include your approximate investment in machines and startup
              equipment.
            </p>

            <div className="mt-6 max-w-md">
              <NumberField
                label="Total vending machine investment"
                value={machineInvestment}
                onChange={setMachineInvestment}
                prefix="$"
                step="100"
              />
            </div>
          </div>

          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
            <p className="text-sm font-medium text-slate-500">
              Advertisement
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Future advertising space
            </p>
          </div>
        </div>

        <aside>
          <div className="sticky top-6 overflow-hidden rounded-2xl bg-slate-950 text-white shadow-xl">
            <div className="border-b border-slate-800 p-6">
              <p className="text-sm font-semibold uppercase tracking-widest text-slate-400">
                Estimated Results
              </p>

              <div className="mt-5">
                <p className="text-sm text-slate-400">Monthly Profit</p>
                <p className="mt-1 text-4xl font-bold">
                  {currency(results.monthlyProfit)}
                </p>
              </div>

              <div className="mt-5">
                <p className="text-sm text-slate-400">Annual Profit</p>
                <p className="mt-1 text-2xl font-semibold">
                  {currency(results.annualProfit)}
                </p>
              </div>
            </div>

            <div className="space-y-4 p-6">
              <ResultRow
                label="Monthly Revenue"
                value={currency(results.monthlyRevenue)}
              />

              <ResultRow
                label="Product Cost"
                value={currency(results.productCost)}
              />

              <ResultRow
                label="Location Commissions"
                value={currency(results.locationCommission)}
              />

              <ResultRow
                label="Card Processing Fees"
                value={currency(results.processingFees)}
              />

              <div className="border-t border-slate-800 pt-4">
                <ResultRow
                  label="Total Monthly Expenses"
                  value={currency(results.totalExpenses)}
                />
              </div>

              <ResultRow
                label="Profit Margin"
                value={percent(results.profitMargin)}
              />

              <ResultRow
                label="Annual ROI"
                value={percent(results.annualROI)}
              />

              <ResultRow
                label="Revenue per Machine"
                value={currency(results.revenuePerMachine)}
              />

              <ResultRow
                label="Profit per Machine"
                value={currency(results.profitPerMachine)}
              />

              <ResultRow
                label="Investment Payback"
                value={
                  results.paybackMonths !== null
                    ? `${results.paybackMonths.toFixed(1)} months`
                    : "Not reached"
                }
              />

              {results.paybackMonths !== null && (
                <ResultRow
                  label="Approx. Payback"
                  value={`${(results.paybackMonths / 12).toFixed(1)} years`}
                />
              )}
            </div>

            <div className="border-t border-slate-800 bg-slate-900 p-6">
              <p className="text-sm font-semibold">Quick interpretation</p>

              <p className="mt-2 text-sm leading-6 text-slate-300">
                {results.monthlyProfit > 0
                  ? `At these assumptions, the route generates an estimated ${currency(
                      results.monthlyProfit
                    )} in monthly profit before taxes and owner compensation.`
                  : "At these assumptions, operating expenses exceed estimated vending revenue."}
              </p>
            </div>
          </div>
        </aside>
      </section>

      <section className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-4xl px-6 py-14">
          <h2 className="text-2xl font-bold">
            How the Vending Machine Profit Calculator Works
          </h2>

          <div className="mt-6 space-y-5 leading-7 text-slate-600">
            <p>
              The calculator estimates gross vending revenue by multiplying
              your number of machines by average monthly sales per machine.
            </p>

            <p>
              Product inventory cost and location commissions are calculated
              as percentages of gross revenue. Card processing fees are
              estimated only on the portion of sales entered as card
              transactions.
            </p>

            <p>
              Monthly operating costs such as transportation, restocking,
              maintenance, insurance, loan payments, and miscellaneous
              expenses are then deducted to estimate monthly and annual profit.
            </p>

            <p>
              ROI compares estimated annual profit with your vending machine
              investment. Payback period estimates how long it could take for
              cumulative operating profit to recover that investment.
            </p>
          </div>

          <div className="mt-10 rounded-2xl bg-slate-100 p-6">
            <h3 className="font-semibold">Important</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              This calculator provides estimates for educational and planning
              purposes only. Actual vending machine profitability varies based
              on location traffic, product pricing, spoilage, theft, machine
              downtime, product mix, commissions, fuel costs, payment
              processing fees, financing, taxes, labor, and other operating
              conditions.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

function ResultRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm text-slate-400">{label}</span>
      <span className="text-right font-semibold text-white">{value}</span>
    </div>
  );
}