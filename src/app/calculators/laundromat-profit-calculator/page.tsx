"use client";

import { useMemo, useState } from "react";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export default function LaundromatProfitCalculator() {
  const [washers, setWashers] = useState(30);
  const [dryers, setDryers] = useState(24);

  const [washPrice, setWashPrice] = useState(3.5);
  const [dryPrice, setDryPrice] = useState(2.25);

  const [washerTurns, setWasherTurns] = useState(4);
  const [dryerTurns, setDryerTurns] = useState(4);

  const [daysOpen, setDaysOpen] = useState(30);

  const [washFoldRevenue, setWashFoldRevenue] = useState(0);
  const [vendingRevenue, setVendingRevenue] = useState(0);
  const [otherRevenue, setOtherRevenue] = useState(0);

  const [rent, setRent] = useState(5000);
  const [utilities, setUtilities] = useState(4200);
  const [labor, setLabor] = useState(2500);
  const [maintenance, setMaintenance] = useState(1000);
  const [insurance, setInsurance] = useState(400);
  const [otherExpenses, setOtherExpenses] = useState(500);

  const [processingRate, setProcessingRate] = useState(3);
  const [monthlyLoanPayment, setMonthlyLoanPayment] = useState(0);

  const [startupInvestment, setStartupInvestment] = useState(300000);

  const results = useMemo(() => {
    const washerRevenue =
      washers * washerTurns * washPrice * daysOpen;

    const dryerRevenue =
      dryers * dryerTurns * dryPrice * daysOpen;

    const machineRevenue =
      washerRevenue + dryerRevenue;

    const ancillaryRevenue =
      washFoldRevenue +
      vendingRevenue +
      otherRevenue;

    const monthlyRevenue =
      machineRevenue + ancillaryRevenue;

    const processingFees =
      monthlyRevenue * (processingRate / 100);

    const monthlyExpenses =
      rent +
      utilities +
      labor +
      maintenance +
      insurance +
      otherExpenses +
      processingFees +
      monthlyLoanPayment;

    const monthlyProfit =
      monthlyRevenue - monthlyExpenses;

    const annualProfit =
      monthlyProfit * 12;

    const profitMargin =
      monthlyRevenue > 0
        ? (monthlyProfit / monthlyRevenue) * 100
        : 0;

    const annualROI =
      startupInvestment > 0
        ? (annualProfit / startupInvestment) * 100
        : 0;

    const breakEvenMonths =
      monthlyProfit > 0
        ? startupInvestment / monthlyProfit
        : null;

    const breakEvenYears =
      breakEvenMonths !== null
        ? breakEvenMonths / 12
        : null;

    return {
      washerRevenue,
      dryerRevenue,
      machineRevenue,
      ancillaryRevenue,
      monthlyRevenue,
      processingFees,
      monthlyExpenses,
      monthlyProfit,
      annualProfit,
      profitMargin,
      annualROI,
      breakEvenMonths,
      breakEvenYears,
    };
  }, [
    washers,
    dryers,
    washPrice,
    dryPrice,
    washerTurns,
    dryerTurns,
    daysOpen,
    washFoldRevenue,
    vendingRevenue,
    otherRevenue,
    rent,
    utilities,
    labor,
    maintenance,
    insurance,
    otherExpenses,
    processingRate,
    monthlyLoanPayment,
    startupInvestment,
  ]);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <a
              href="/"
              className="text-2xl font-bold tracking-tight"
            >
              BizToolLab
            </a>

            <div className="text-sm text-slate-500">
              Smart tools for smarter business decisions
            </div>
          </div>

          <nav className="hidden gap-8 text-sm font-medium md:flex">
            <a
              href="/"
              className="hover:text-slate-950"
            >
              Home
            </a>

            <a
              href="/#tools"
              className="hover:text-slate-950"
            >
              Tools
            </a>
          </nav>
        </div>
      </header>

      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-6 py-14">
          <p className="text-sm font-semibold uppercase tracking-wider text-slate-500">
            Industry Calculator
          </p>

          <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
            Laundromat Profit Calculator
          </h1>

          <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-600">
            Estimate laundromat revenue, expenses, profit,
            return on investment, and break-even time using
            machine activity, additional services, operating
            costs, and financing.
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-6 py-10 lg:grid-cols-[1.1fr_0.9fr]">

        {/* LEFT SIDE */}

        <div className="space-y-8">

          {/* MACHINES */}

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-semibold">
              Machines and pricing
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Enter your machine count, average cycle pricing,
              estimated usage, and operating days.
            </p>

            <div className="mt-6 grid gap-5 sm:grid-cols-2">

              <Input
                label="Number of washers"
                value={washers}
                onChange={setWashers}
              />

              <Input
                label="Number of dryers"
                value={dryers}
                onChange={setDryers}
              />

              <Input
                label="Average wash price"
                value={washPrice}
                onChange={setWashPrice}
                step="0.25"
                prefix="$"
              />

              <Input
                label="Average dry price"
                value={dryPrice}
                onChange={setDryPrice}
                step="0.25"
                prefix="$"
              />

              <Input
                label="Washer turns per day"
                value={washerTurns}
                onChange={setWasherTurns}
                step="0.1"
              />

              <Input
                label="Dryer turns per day"
                value={dryerTurns}
                onChange={setDryerTurns}
                step="0.1"
              />

              <Input
                label="Days open per month"
                value={daysOpen}
                onChange={setDaysOpen}
              />

            </div>
          </div>

          {/* ADDITIONAL REVENUE */}

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-semibold">
              Additional monthly revenue
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Include income earned beyond self-service washer
              and dryer activity.
            </p>

            <div className="mt-6 grid gap-5 sm:grid-cols-2">

              <Input
                label="Wash-dry-fold revenue"
                value={washFoldRevenue}
                onChange={setWashFoldRevenue}
                prefix="$"
              />

              <Input
                label="Vending revenue"
                value={vendingRevenue}
                onChange={setVendingRevenue}
                prefix="$"
              />

              <Input
                label="Other revenue"
                value={otherRevenue}
                onChange={setOtherRevenue}
                prefix="$"
              />

            </div>
          </div>

          {/* EXPENSES */}

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-semibold">
              Monthly operating expenses
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Enter the recurring monthly costs required to
              operate the laundromat.
            </p>

            <div className="mt-6 grid gap-5 sm:grid-cols-2">

              <Input
                label="Rent"
                value={rent}
                onChange={setRent}
                prefix="$"
              />

              <Input
                label="Utilities"
                value={utilities}
                onChange={setUtilities}
                prefix="$"
              />

              <Input
                label="Labor"
                value={labor}
                onChange={setLabor}
                prefix="$"
              />

              <Input
                label="Maintenance"
                value={maintenance}
                onChange={setMaintenance}
                prefix="$"
              />

              <Input
                label="Insurance"
                value={insurance}
                onChange={setInsurance}
                prefix="$"
              />

              <Input
                label="Other expenses"
                value={otherExpenses}
                onChange={setOtherExpenses}
                prefix="$"
              />

              <Input
                label="Card/payment processing rate"
                value={processingRate}
                onChange={setProcessingRate}
                step="0.1"
                suffix="%"
              />

              <Input
                label="Monthly loan payment"
                value={monthlyLoanPayment}
                onChange={setMonthlyLoanPayment}
                prefix="$"
              />

            </div>
          </div>

          {/* INVESTMENT */}

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-semibold">
              Initial investment
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Enter the estimated amount invested to purchase,
              build, renovate, or launch the laundromat.
            </p>

            <div className="mt-6 max-w-sm">
              <Input
                label="Estimated startup investment"
                value={startupInvestment}
                onChange={setStartupInvestment}
                prefix="$"
              />
            </div>
          </div>

        </div>

        {/* RIGHT SIDE */}

        <aside className="lg:sticky lg:top-6 lg:self-start">

          <div className="rounded-2xl bg-slate-950 p-6 text-white shadow-lg">

            <p className="text-sm font-semibold uppercase tracking-wider text-slate-400">
              Estimated results
            </p>

            <div className="mt-6 grid gap-4">

              <Result
                label="Washer revenue"
                value={formatCurrency(
                  results.washerRevenue
                )}
              />

              <Result
                label="Dryer revenue"
                value={formatCurrency(
                  results.dryerRevenue
                )}
              />

              <Result
                label="Total machine revenue"
                value={formatCurrency(
                  results.machineRevenue
                )}
              />

              <Result
                label="Additional revenue"
                value={formatCurrency(
                  results.ancillaryRevenue
                )}
              />

              <Result
                label="Total monthly revenue"
                value={formatCurrency(
                  results.monthlyRevenue
                )}
              />

              <Result
                label="Processing fees"
                value={formatCurrency(
                  results.processingFees
                )}
              />

              <Result
                label="Total monthly expenses"
                value={formatCurrency(
                  results.monthlyExpenses
                )}
              />

              <Result
                label="Monthly profit"
                value={formatCurrency(
                  results.monthlyProfit
                )}
                large
              />

              <Result
                label="Annual profit"
                value={formatCurrency(
                  results.annualProfit
                )}
              />

              <Result
                label="Profit margin"
                value={`${results.profitMargin.toFixed(
                  1
                )}%`}
              />

              <Result
                label="Estimated annual ROI"
                value={`${results.annualROI.toFixed(1)}%`}
              />

              <Result
                label="Estimated break-even"
                value={
                  results.breakEvenMonths !== null
                    ? `${results.breakEvenMonths.toFixed(
                        1
                      )} months`
                    : "Not profitable"
                }
              />

              <Result
                label="Estimated payback period"
                value={
                  results.breakEvenYears !== null
                    ? `${results.breakEvenYears.toFixed(
                        1
                      )} years`
                    : "Not profitable"
                }
              />

            </div>
          </div>

          {/* SUMMARY */}

          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

            <h3 className="text-lg font-semibold">
              Business snapshot
            </h3>

            <div className="mt-4 space-y-3 text-sm leading-6 text-slate-600">

              <p>
                Estimated monthly revenue:
                <strong className="ml-1 text-slate-900">
                  {formatCurrency(
                    results.monthlyRevenue
                  )}
                </strong>
              </p>

              <p>
                Estimated monthly profit:
                <strong className="ml-1 text-slate-900">
                  {formatCurrency(
                    results.monthlyProfit
                  )}
                </strong>
              </p>

              <p>
                Estimated profit margin:
                <strong className="ml-1 text-slate-900">
                  {results.profitMargin.toFixed(1)}%
                </strong>
              </p>

              <p>
                Estimated annual return:
                <strong className="ml-1 text-slate-900">
                  {results.annualROI.toFixed(1)}%
                </strong>
              </p>

              <p>
                Estimated payback period:
                <strong className="ml-1 text-slate-900">
                  {results.breakEvenYears !== null
                    ? `${results.breakEvenYears.toFixed(
                        1
                      )} years`
                    : "Not currently profitable"}
                </strong>
              </p>

            </div>
          </div>

          {/* FUTURE AD */}

          <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center">

            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              Future ad space
            </p>

            <p className="mt-2 text-sm text-slate-500">
              Reserved for future Google AdSense placement.
            </p>

          </div>

        </aside>
      </section>

      {/* INFORMATION */}

      <section className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-6 py-16">

          <h2 className="text-3xl font-bold">
            How this laundromat profit calculator works
          </h2>

          <div className="mt-6 space-y-5 text-slate-600 leading-8">

            <p>
              Washer revenue is estimated by multiplying the
              number of washers by the average number of daily
              turns, average price per wash, and operating days
              per month.
            </p>

            <p>
              Dryer revenue is calculated using the same method
              with dryer count, dryer turns, average dryer
              price, and operating days.
            </p>

            <p>
              Additional revenue can include services such as
              wash-dry-fold, vending, detergent sales, pickup
              and delivery, or other income generated by the
              business.
            </p>

            <p>
              Estimated payment-processing fees are calculated
              as a percentage of total monthly revenue.
            </p>

            <p>
              Monthly profit is calculated by subtracting
              operating expenses, processing costs, and any
              monthly loan payment from estimated monthly
              revenue.
            </p>

            <p>
              Annual return on investment compares estimated
              annual profit with the startup investment entered
              above.
            </p>

            <p>
              The estimated payback period shows approximately
              how long it could take for cumulative profits to
              recover the initial investment if the entered
              assumptions remain consistent.
            </p>

          </div>
          {/* HOW TO USE */}

          <section className="mt-12 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">

            <h2 className="text-2xl font-bold text-slate-900">
              How to Use the Laundromat Profit Calculator
            </h2>

            <div className="mt-5 space-y-4 text-sm leading-7 text-slate-600">

              <p>
                Start by entering the number of washers and dryers in the
                laundromat, along with the average price customers pay for
                each wash and dry cycle.
              </p>

              <p>
                Next, estimate the average number of turns each machine
                completes per day and the number of days the laundromat is
                open each month. These values are used to estimate monthly
                machine revenue.
              </p>

              <p>
                Add any additional revenue from services such as
                wash-dry-fold, vending machines, detergent sales, or other
                sources of income.
              </p>

              <p>
                Enter your monthly operating expenses, including rent,
                utilities, labor, maintenance, insurance, payment processing,
                loan payments, and other recurring costs.
              </p>

              <p>
                Finally, enter your estimated startup investment. The
                calculator will use these assumptions to estimate monthly
                profit, annual profit, profit margin, return on investment,
                and investment payback time.
              </p>

            </div>

          </section>


          {/* EXAMPLE CALCULATION */}

          <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">

            <h2 className="text-2xl font-bold text-slate-900">
              Laundromat Profit Example
            </h2>

            <p className="mt-4 text-sm leading-7 text-slate-600">
              Consider a laundromat with 20 washers and 20 dryers. Assume an
              average wash price of $4.00, an average dry price of $3.00,
              approximately 4.5 machine turns per day, and 30 operating days
              per month.
            </p>

            <p className="mt-4 text-sm leading-7 text-slate-600">
              If the business also earns revenue from wash-dry-fold services
              and vending, total monthly revenue may be significantly higher
              than machine revenue alone. After subtracting rent, utilities,
              labor, maintenance, insurance, processing fees, and financing
              costs, the remaining amount represents estimated monthly profit.
            </p>

            <p className="mt-4 text-sm leading-7 text-slate-600">
              The calculator then compares that profit with the original
              startup investment to estimate annual ROI and how long it may
              take to recover the initial investment.
            </p>

          </section>


          {/* FAQ */}

          <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">

            <h2 className="text-2xl font-bold text-slate-900">
              Frequently Asked Questions
            </h2>

            <div className="mt-6 space-y-7">

              <div>
                <h3 className="font-semibold text-slate-900">
                  What is a machine turn in a laundromat?
                </h3>

                <p className="mt-2 text-sm leading-7 text-slate-600">
                  A turn represents one completed paid use of a washer or
                  dryer. For example, if a washer is used five times during
                  the day, that machine completed five turns.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-slate-900">
                  How do I estimate laundromat monthly revenue?
                </h3>

                <p className="mt-2 text-sm leading-7 text-slate-600">
                  Machine revenue can be estimated using the number of
                  machines, average price per cycle, average daily turns, and
                  operating days. Additional services such as wash-dry-fold
                  and vending should be added separately.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-slate-900">
                  What expenses should I include?
                </h3>

                <p className="mt-2 text-sm leading-7 text-slate-600">
                  Common expenses include rent, water, sewer, electricity,
                  gas, payroll, repairs, maintenance, insurance, payment
                  processing fees, supplies, financing payments, and other
                  recurring operating costs.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-slate-900">
                  What is a good laundromat profit margin?
                </h3>

                <p className="mt-2 text-sm leading-7 text-slate-600">
                  Profit margins vary widely depending on location, utility
                  costs, rent, machine efficiency, customer volume, staffing,
                  financing, and competition. The calculator is most useful
                  for comparing different operating assumptions rather than
                  relying on a single target percentage.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-slate-900">
                  Does this calculator include loan payments?
                </h3>

                <p className="mt-2 text-sm leading-7 text-slate-600">
                  Yes. You can enter a monthly loan payment so financing costs
                  are included when estimating monthly profit and cash flow.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-slate-900">
                  Can I use this calculator before buying a laundromat?
                </h3>

                <p className="mt-2 text-sm leading-7 text-slate-600">
                  Yes. It can be used to model a potential acquisition or new
                  laundromat by entering estimated revenue, expenses, machine
                  usage, and startup investment. The results should still be
                  verified against actual financial records and operating
                  information before making a purchase decision.
                </p>
              </div>

            </div>

          </section>


          {/* RELATED CALCULATORS */}

          <section className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-6 sm:p-8">

            <h2 className="text-xl font-bold text-slate-900">
              Related Business Calculators
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              Use these additional BizToolLab calculators to evaluate startup
              costs, profitability, break-even requirements, and investment
              returns.
            </p>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">

              <a
                href="/calculators/startup-cost-calculator"
                className="rounded-xl border border-slate-200 bg-white p-4 transition hover:border-slate-400"
              >
                <div className="font-semibold text-slate-900">
                  Startup Cost Calculator
                </div>
                <div className="mt-1 text-sm text-slate-500">
                  Estimate the capital needed to start a business.
                </div>
              </a>

              <a
                href="/calculators/break-even-calculator"
                className="rounded-xl border border-slate-200 bg-white p-4 transition hover:border-slate-400"
              >
                <div className="font-semibold text-slate-900">
                  Break-Even Calculator
                </div>
                <div className="mt-1 text-sm text-slate-500">
                  Estimate the sales needed to cover business costs.
                </div>
              </a>

              <a
                href="/calculators/profit-margin-calculator"
                className="rounded-xl border border-slate-200 bg-white p-4 transition hover:border-slate-400"
              >
                <div className="font-semibold text-slate-900">
                  Profit Margin Calculator
                </div>
                <div className="mt-1 text-sm text-slate-500">
                  Calculate gross and net profit margins.
                </div>
              </a>

              <a
                href="/calculators/roi-calculator"
                className="rounded-xl border border-slate-200 bg-white p-4 transition hover:border-slate-400"
              >
                <div className="font-semibold text-slate-900">
                  ROI Calculator
                </div>
                <div className="mt-1 text-sm text-slate-500">
                  Measure return on investment and annualized return.
                </div>
              </a>

            </div>

          </section>
          {/* IMPORTANT NOTE */}

          <div className="mt-12 rounded-2xl border border-amber-200 bg-amber-50 p-6">

            <h3 className="font-semibold text-amber-950">
              Important
            </h3>

            <p className="mt-2 text-sm leading-6 text-amber-900">
              This calculator provides estimates for planning
              and educational purposes only. Actual laundromat
              performance can vary significantly based on
              location, customer traffic, machine mix, utility
              rates, financing, repairs, taxes, competition,
              labor costs, payment methods, and other business
              conditions.
            </p>

          </div>

        </div>
      </section>
    </main>
  );
}

type InputProps = {
  label: string;
  value: number;
  onChange: (value: number) => void;
  prefix?: string;
  suffix?: string;
  step?: string;
};

function Input({
  label,
  value,
  onChange,
  prefix,
  suffix,
  step = "1",
}: InputProps) {
  return (
    <label className="block">

      <span className="mb-2 block text-sm font-medium text-slate-700">
        {label}
      </span>

      <div className="flex overflow-hidden rounded-xl border border-slate-200 bg-white focus-within:border-slate-400">

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
}

type ResultProps = {
  label: string;
  value: string;
  large?: boolean;
};

function Result({
  label,
  value,
  large,
}: ResultProps) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">

      <div className="text-sm text-slate-400">
        {label}
      </div>

      <div
        className={
          large
            ? "mt-1 text-3xl font-bold"
            : "mt-1 text-xl font-semibold"
        }
      >
        {value}
      </div>

    </div>
  );
}