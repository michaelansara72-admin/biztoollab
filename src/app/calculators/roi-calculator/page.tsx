"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type NumberFieldProps = {
  label: string;
  value: number;
  onChange: (value: number) => void;
  prefix?: string;
  suffix?: string;
  step?: string;
  helper?: string;
};

function NumberField({
  label,
  value,
  onChange,
  prefix,
  suffix,
  step = "0.01",
  helper,
}: NumberFieldProps) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-slate-700">
        {label}
      </span>

      <div className="flex overflow-hidden rounded-xl border border-slate-300 bg-white focus-within:border-slate-500">
        {prefix && (
          <span className="flex items-center border-r border-slate-200 bg-slate-50 px-4 text-slate-500">
            {prefix}
          </span>
        )}

        <input
          type="number"
          min="0"
          step={step}
          defaultValue={value}
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
          className="w-full px-4 py-3 text-slate-900 outline-none"
        />

        {suffix && (
          <span className="flex items-center border-l border-slate-200 bg-slate-50 px-4 text-slate-500">
            {suffix}
          </span>
        )}
      </div>

      {helper && (
        <span className="mt-2 block text-xs leading-5 text-slate-500">
          {helper}
        </span>
      )}
    </label>
  );
}

function ResultRow({
  label,
  value,
  emphasized = false,
}: {
  label: string;
  value: string;
  emphasized?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-4 border-b border-slate-700 py-4 last:border-b-0 ${
        emphasized ? "text-white" : "text-slate-200"
      }`}
    >
      <span className={emphasized ? "font-semibold" : ""}>{label}</span>
      <span
        className={`text-right ${
          emphasized ? "text-xl font-bold" : "font-semibold"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

export default function RoiCalculatorPage() {
  const [initialInvestment, setInitialInvestment] = useState(50000);
  const [totalReturn, setTotalReturn] = useState(65000);
  const [holdingPeriodYears, setHoldingPeriodYears] = useState(3);

  const results = useMemo(() => {
    const netProfit = totalReturn - initialInvestment;

    const roi =
      initialInvestment > 0
        ? (netProfit / initialInvestment) * 100
        : 0;

    const returnMultiple =
      initialInvestment > 0
        ? totalReturn / initialInvestment
        : 0;

    const annualizedReturn =
      initialInvestment > 0 &&
      totalReturn > 0 &&
      holdingPeriodYears > 0
        ? (Math.pow(totalReturn / initialInvestment, 1 / holdingPeriodYears) -
            1) *
          100
        : 0;

    return {
      netProfit,
      roi,
      returnMultiple,
      annualizedReturn,
    };
  }, [initialInvestment, totalReturn, holdingPeriodYears]);

  const currency = (value: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(value);

  const percent = (value: number) =>
    `${value.toFixed(1)}%`;

  const multiple = (value: number) =>
    `${value.toFixed(2)}x`;

  const isValid =
    initialInvestment > 0 &&
    totalReturn >= 0 &&
    holdingPeriodYears > 0;

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link href="/" className="text-xl font-bold tracking-tight">
            BizToolLab
          </Link>

          <Link
            href="/"
            className="text-sm font-semibold text-slate-600 transition hover:text-slate-900"
          >
            Back to calculators
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-12">
        <div className="max-w-3xl">
          <p className="mb-3 text-sm font-bold uppercase tracking-[0.18em] text-slate-500">
            Business Calculator
          </p>

          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            ROI Calculator
          </h1>

          <p className="mt-5 text-lg leading-8 text-slate-600">
            Estimate your return on investment, net profit, return multiple,
            and annualized return based on the amount invested and the total
            value received.
          </p>
        </div>

        <div className="mt-10 grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-8">
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <h2 className="text-2xl font-bold">
                Investment Details
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Enter the original investment, the total value returned,
                and how long the investment was held.
              </p>

              <div className="mt-8 grid gap-6">
                <NumberField
                  label="Initial investment"
                  value={initialInvestment}
                  onChange={setInitialInvestment}
                  prefix="$"
                  helper="The total amount originally invested."
                />

                <NumberField
                  label="Total return"
                  value={totalReturn}
                  onChange={setTotalReturn}
                  prefix="$"
                  helper="The total value received or current value of the investment."
                />

                <NumberField
                  label="Holding period"
                  value={holdingPeriodYears}
                  onChange={setHoldingPeriodYears}
                  suffix="years"
                  step="0.1"
                  helper="How long the investment has been held."
                />
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <h2 className="text-xl font-bold">
                What These Results Mean
              </h2>

              <div className="mt-5 space-y-4 text-sm leading-7 text-slate-600">
                <p>
                  <strong className="text-slate-900">Net profit</strong>{" "}
                  is the amount gained or lost after subtracting the original
                  investment from the total return.
                </p>

                <p>
                  <strong className="text-slate-900">ROI</strong>{" "}
                  shows the percentage gain or loss relative to the amount
                  originally invested.
                </p>

                <p>
                  <strong className="text-slate-900">
                    Return multiple
                  </strong>{" "}
                  compares the total return directly with the original investment.
                </p>

                <p>
                  <strong className="text-slate-900">
                    Annualized return
                  </strong>{" "}
                  estimates the average yearly compounded return over the
                  holding period.
                </p>
              </div>
            </section>

            <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-400">
              Advertisement space
            </section>
          </div>

          <aside>
            <section className="sticky top-6 rounded-2xl bg-slate-900 p-6 text-white shadow-lg sm:p-8">
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-400">
                Estimated Results
              </p>

              {!isValid ? (
                <div className="mt-6 rounded-xl border border-amber-500/30 bg-amber-500/10 p-5 text-amber-200">
                  <p className="font-bold">
                    ROI cannot be calculated.
                  </p>
                  <p className="mt-2 text-sm leading-6">
                    Initial investment and holding period must be greater than zero.
                  </p>
                </div>
              ) : (
                <div className="mt-5">
                  <ResultRow
                    label="Net Profit"
                    value={currency(results.netProfit)}
                  />

                  <ResultRow
                    label="ROI"
                    value={percent(results.roi)}
                    emphasized
                  />

                  <ResultRow
                    label="Return Multiple"
                    value={multiple(results.returnMultiple)}
                  />

                  <ResultRow
                    label="Annualized Return"
                    value={percent(results.annualizedReturn)}
                  />
                </div>
              )}
            </section>
          </aside>
        </div>

        <section className="mt-10 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-2xl font-bold">
            ROI Formula
          </h2>

          <div className="mt-5 space-y-4 text-sm leading-7 text-slate-600">
            <p>
              Net Profit = Total Return − Initial Investment
            </p>

            <p>
              ROI = Net Profit ÷ Initial Investment × 100
            </p>

            <p>
              Return Multiple = Total Return ÷ Initial Investment
            </p>

            <p>
              Annualized Return accounts for the length of time the investment
              is held and expresses the return as an average yearly compounded rate.
            </p>
          </div>
        </section>
        {/* HOW TO USE */}

        <section className="mt-10 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-2xl font-bold text-slate-900">
            How to Use the ROI Calculator
          </h2>

          <div className="mt-5 space-y-4 text-sm leading-7 text-slate-600">
            <p>
              Start by entering the amount originally invested in the business,
              project, asset, or opportunity you want to evaluate.
            </p>

            <p>
              Next, enter the total amount returned from the investment. This
              should represent the value received or expected at the end of the
              period being analyzed.
            </p>

            <p>
              Then enter the number of years the investment is held. This allows
              the calculator to estimate an annualized return in addition to
              total ROI.
            </p>

            <p>
              The calculator will estimate net profit, total return on
              investment, return multiple, and annualized return.
            </p>

            <p>
              You can adjust the investment amount, total return, and holding
              period to compare different scenarios.
            </p>
          </div>
        </section>


        {/* EXAMPLE CALCULATION */}

        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-2xl font-bold text-slate-900">
            ROI Example
          </h2>

          <p className="mt-4 text-sm leading-7 text-slate-600">
            Suppose you invest $50,000 in a business or project and receive a
            total return of $65,000 after three years.
          </p>

          <p className="mt-4 text-sm leading-7 text-slate-600">
            The net profit would be $15,000 because the total return exceeds
            the original investment by that amount.
          </p>

          <p className="mt-4 text-sm leading-7 text-slate-600">
            Dividing the $15,000 profit by the $50,000 investment produces an
            ROI of 30%. The total return is also equal to 1.30 times the
            original investment.
          </p>

          <p className="mt-4 text-sm leading-7 text-slate-600">
            Because the investment was held for three years, the calculator
            also converts the total return into an estimated annualized return,
            which is approximately 9.1% per year in this example.
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
                What does ROI mean?
              </h3>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                ROI stands for return on investment. It measures the gain or
                loss from an investment relative to the amount originally
                invested.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-slate-900">
                How is ROI calculated?
              </h3>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                ROI is calculated by subtracting the original investment from
                the total return, dividing the result by the original
                investment, and multiplying by 100.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-slate-900">
                What is a return multiple?
              </h3>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                Return multiple compares the total return directly with the
                original investment. For example, a return multiple of 1.5x
                means the total return is one and a half times the amount
                originally invested.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-slate-900">
                What is annualized return?
              </h3>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                Annualized return estimates the compounded yearly rate that
                would produce the same total return over the holding period.
                This can make it easier to compare investments held for
                different lengths of time.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-slate-900">
                Can ROI be negative?
              </h3>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                Yes. If the total return is less than the original investment,
                the investment has lost value and the calculated ROI will be
                negative.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-slate-900">
                Does ROI include taxes, financing, or cash flow timing?
              </h3>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                Not automatically. This calculator uses the investment amount,
                total return, and holding period you enter. Taxes, financing
                costs, fees, interim cash flows, and other factors may need to
                be considered separately for a more detailed analysis.
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
            costs, profit margins, break-even requirements, and business
            performance.
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
                Estimate the capital needed to launch a business.
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
              href="/calculators/break-even-calculator"
              className="rounded-xl border border-slate-200 bg-white p-4 transition hover:border-slate-400"
            >
              <div className="font-semibold text-slate-900">
                Break-Even Calculator
              </div>
              <div className="mt-1 text-sm text-slate-500">
                Estimate the sales needed to cover fixed and variable costs.
              </div>
            </a>

            <a
              href="/calculators/vending-machine-profit-calculator"
              className="rounded-xl border border-slate-200 bg-white p-4 transition hover:border-slate-400"
            >
              <div className="font-semibold text-slate-900">
                Vending Machine Profit Calculator
              </div>
              <div className="mt-1 text-sm text-slate-500">
                Estimate vending route revenue, expenses, profit, and payback.
              </div>
            </a>
          </div>
        </section>
        <section className="mt-8 rounded-2xl border border-slate-200 bg-slate-100 p-6 text-sm leading-6 text-slate-500">
          This calculator is provided for general informational and planning
          purposes only. Actual investment or business results may vary based on
          taxes, fees, financing costs, cash flows, timing, and other factors not
          included here.
        </section>
      </section>
    </main>
  );
}