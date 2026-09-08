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