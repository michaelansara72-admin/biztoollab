"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

export default function BreakEvenCalculator() {
  const [fixedCosts, setFixedCosts] = useState(10000);
  const [sellingPrice, setSellingPrice] = useState(50);
  const [variableCost, setVariableCost] = useState(20);
  const [targetProfit, setTargetProfit] = useState(5000);

  const results = useMemo(() => {
    const contributionMarginPerUnit = sellingPrice - variableCost;

    const contributionMarginRatio =
      sellingPrice > 0 ? contributionMarginPerUnit / sellingPrice : 0;

    const breakEvenUnits =
      contributionMarginPerUnit > 0
        ? fixedCosts / contributionMarginPerUnit
        : null;

    const breakEvenRevenue =
      contributionMarginRatio > 0
        ? fixedCosts / contributionMarginRatio
        : null;

    const targetProfitUnits =
      contributionMarginPerUnit > 0
        ? (fixedCosts + targetProfit) / contributionMarginPerUnit
        : null;

    const targetProfitRevenue =
      contributionMarginRatio > 0
        ? (fixedCosts + targetProfit) / contributionMarginRatio
        : null;

    return {
      contributionMarginPerUnit,
      contributionMarginRatio,
      breakEvenUnits,
      breakEvenRevenue,
      targetProfitUnits,
      targetProfitRevenue,
    };
  }, [fixedCosts, sellingPrice, variableCost, targetProfit]);

  const currency = (value: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(value);

  const percent = (value: number) =>
    `${(value * 100).toLocaleString("en-US", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    })}%`;

  const wholeNumber = (value: number) =>
    Math.ceil(value).toLocaleString("en-US");

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
  min="0"
  step={step}
  defaultValue={value}
  onBlur={(event) => {
    const newValue = Math.max(0, Number(event.target.value) || 0);
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
          <span className="flex items-center border-l border-slate-200 bg-slate-50 px-3 text-slate-500">
            {suffix}
          </span>
        )}
      </div>
    </label>
  );

  const isValid = results.contributionMarginPerUnit > 0;

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
            Business Calculator
          </p>

          <h1 className="max-w-4xl text-4xl font-bold tracking-tight sm:text-5xl">
            Break-Even Calculator
          </h1>

          <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-600">
            Calculate how many units you need to sell, or how much revenue you
            need to generate, to cover fixed and variable costs. You can also
            estimate the sales required to reach a target profit.
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-6 py-10 lg:grid-cols-[1.35fr_0.85fr]">
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold">Business Costs and Pricing</h2>
            <p className="mt-1 text-sm text-slate-500">
              Enter your fixed costs, selling price, and variable cost per unit.
            </p>

            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <NumberField
                label="Total fixed costs"
                value={fixedCosts}
                onChange={setFixedCosts}
                prefix="$"
                step="100"
              />

              <NumberField
                label="Selling price per unit"
                value={sellingPrice}
                onChange={setSellingPrice}
                prefix="$"
                step="1"
              />

              <NumberField
                label="Variable cost per unit"
                value={variableCost}
                onChange={setVariableCost}
                prefix="$"
                step="1"
              />

              <NumberField
                label="Target profit"
                value={targetProfit}
                onChange={setTargetProfit}
                prefix="$"
                step="100"
              />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold">What These Inputs Mean</h2>

            <div className="mt-5 space-y-4 text-sm leading-6 text-slate-600">
              <p>
                <strong className="text-slate-900">Fixed costs</strong> are
                expenses that generally stay the same regardless of sales
                volume, such as rent, salaries, insurance, and certain software
                costs.
              </p>

              <p>
                <strong className="text-slate-900">
                  Variable cost per unit
                </strong>{" "}
                is the cost that changes with each unit sold, such as materials,
                packaging, transaction fees, or direct production costs.
              </p>

              <p>
                <strong className="text-slate-900">
                  Contribution margin
                </strong>{" "}
                is the amount left from each sale after variable costs. That
                amount contributes toward paying fixed costs and then profit.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
            <p className="text-sm font-medium text-slate-500">Advertisement</p>
            <p className="mt-1 text-xs text-slate-400">
              Future advertising space
            </p>
          </div>
        </div>

        <aside>
          <div className="sticky top-6 overflow-hidden rounded-2xl bg-slate-950 text-white shadow-xl">
            <div className="border-b border-slate-800 p-6">
              <p className="text-sm font-semibold uppercase tracking-widest text-slate-400">
                Break-Even Results
              </p>

              {isValid ? (
                <>
                  <div className="mt-5">
                    <p className="text-sm text-slate-400">Break-Even Units</p>
                    <p className="mt-1 text-4xl font-bold">
                      {results.breakEvenUnits !== null
                        ? wholeNumber(results.breakEvenUnits)
                        : "—"}
                    </p>
                  </div>

                  <div className="mt-5">
                    <p className="text-sm text-slate-400">
                      Break-Even Revenue
                    </p>
                    <p className="mt-1 text-2xl font-semibold">
                      {results.breakEvenRevenue !== null
                        ? currency(results.breakEvenRevenue)
                        : "—"}
                    </p>
                  </div>
                </>
              ) : (
                <div className="mt-5 rounded-xl border border-amber-700 bg-amber-950/40 p-4">
                  <p className="font-semibold text-amber-200">
                    Break-even cannot be calculated.
                  </p>
                  <p className="mt-2 text-sm leading-6 text-amber-100/80">
                    Your selling price must be greater than your variable cost
                    per unit.
                  </p>
                </div>
              )}
            </div>

            {isValid && (
              <>
                <div className="space-y-4 p-6">
                  <ResultRow
                    label="Contribution Margin / Unit"
                    value={currency(results.contributionMarginPerUnit)}
                  />

                  <ResultRow
                    label="Contribution Margin Ratio"
                    value={percent(results.contributionMarginRatio)}
                  />

                  <div className="border-t border-slate-800 pt-4">
                    <ResultRow
                      label="Break-Even Units"
                      value={
                        results.breakEvenUnits !== null
                          ? wholeNumber(results.breakEvenUnits)
                          : "—"
                      }
                    />
                  </div>

                  <ResultRow
                    label="Break-Even Revenue"
                    value={
                      results.breakEvenRevenue !== null
                        ? currency(results.breakEvenRevenue)
                        : "—"
                    }
                  />

                  <div className="border-t border-slate-800 pt-4">
                    <ResultRow
                      label={`Units for ${currency(targetProfit)} Profit`}
                      value={
                        results.targetProfitUnits !== null
                          ? wholeNumber(results.targetProfitUnits)
                          : "—"
                      }
                    />
                  </div>

                  <ResultRow
                    label={`Revenue for ${currency(targetProfit)} Profit`}
                    value={
                      results.targetProfitRevenue !== null
                        ? currency(results.targetProfitRevenue)
                        : "—"
                    }
                  />
                </div>

                <div className="border-t border-slate-800 bg-slate-900 p-6">
                  <p className="text-sm font-semibold">Quick interpretation</p>

                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    At these assumptions, you need to sell approximately{" "}
                    {results.breakEvenUnits !== null
                      ? wholeNumber(results.breakEvenUnits)
                      : "0"}{" "}
                    units to cover your estimated fixed and variable costs.
                  </p>
                </div>
              </>
            )}
          </div>
        </aside>
      </section>

      <section className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-4xl px-6 py-14">
          <h2 className="text-2xl font-bold">
            How the Break-Even Calculator Works
          </h2>

          <div className="mt-6 space-y-5 leading-7 text-slate-600">
            <p>
              Contribution margin per unit is calculated by subtracting
              variable cost per unit from selling price per unit.
            </p>

            <p>
              Break-even units are calculated by dividing total fixed costs by
              contribution margin per unit.
            </p>

            <p>
              Break-even revenue uses the contribution margin ratio to estimate
              the total sales dollars required to cover fixed costs.
            </p>

            <p>
              The target-profit calculation adds your desired profit to fixed
              costs before calculating the required unit sales and revenue.
            </p>
          </div>
          {/* HOW TO USE */}

          <section className="mt-10 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <h2 className="text-2xl font-bold text-slate-900">
              How to Use the Break-Even Calculator
            </h2>

            <div className="mt-5 space-y-4 text-sm leading-7 text-slate-600">
              <p>
                Start by entering your total fixed costs. These are expenses
                that generally stay the same regardless of how many units you
                sell, such as rent, insurance, software, administrative
                salaries, and other overhead.
              </p>

              <p>
                Next, enter the selling price for one unit of your product or
                service and the variable cost associated with producing or
                delivering one unit.
              </p>

              <p>
                The difference between selling price and variable cost is your
                contribution margin per unit. This is the amount each sale
                contributes toward covering fixed costs and eventually
                producing profit.
              </p>

              <p>
                You can also enter a target profit amount. The calculator will
                estimate how many units you need to sell and how much revenue
                you need to generate to reach that profit goal.
              </p>

              <p>
                Use the results to compare different pricing, cost, and sales
                scenarios before making business decisions.
              </p>
            </div>
          </section>


          {/* EXAMPLE CALCULATION */}

          <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <h2 className="text-2xl font-bold text-slate-900">
              Break-Even Example
            </h2>

            <p className="mt-4 text-sm leading-7 text-slate-600">
              Suppose a business has $10,000 in fixed costs, sells a product
              for $50, and has a variable cost of $20 per unit.
            </p>

            <p className="mt-4 text-sm leading-7 text-slate-600">
              The contribution margin is $30 per unit. Dividing $10,000 in
              fixed costs by the $30 contribution margin means the business
              needs to sell approximately 334 units to break even.
            </p>

            <p className="mt-4 text-sm leading-7 text-slate-600">
              At a $50 selling price, break-even revenue would be about
              $16,667. If the business wants to earn a $5,000 target profit,
              it would need to sell approximately 500 units, producing about
              $25,000 in revenue.
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
                  What is the break-even point?
                </h3>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  The break-even point is the level of sales where total
                  revenue equals total costs. At that point, the business is
                  neither making a profit nor operating at a loss.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-slate-900">
                  What are fixed costs?
                </h3>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  Fixed costs are expenses that generally do not change
                  directly with sales volume, such as rent, insurance,
                  software subscriptions, administrative salaries, and certain
                  other overhead expenses.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-slate-900">
                  What are variable costs?
                </h3>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  Variable costs change with the number of units sold or
                  produced. Examples may include product materials, packaging,
                  sales commissions, shipping, and transaction costs.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-slate-900">
                  What is contribution margin?
                </h3>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  Contribution margin is the selling price per unit minus the
                  variable cost per unit. It represents the amount from each
                  sale that is available to cover fixed costs and profit.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-slate-900">
                  Why does the selling price need to be higher than variable cost?
                </h3>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  If the variable cost of each unit equals or exceeds the
                  selling price, each additional sale does not contribute
                  toward covering fixed costs. A positive contribution margin
                  is required to calculate a practical break-even point.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-slate-900">
                  Can I use break-even analysis for a service business?
                </h3>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  Yes. A service business can treat one appointment, project,
                  billable hour, subscription, or other service unit as the
                  unit being sold. The same fixed-cost and variable-cost
                  principles can then be applied.
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
              costs, margins, business profitability, and investment returns.
            </p>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <a
                href="/calculators/profit-margin-calculator"
                className="rounded-xl border border-slate-200 bg-white p-4 transition hover:border-slate-400"
              >
                <div className="font-semibold text-slate-900">
                  Profit Margin Calculator
                </div>
                <div className="mt-1 text-sm text-slate-500">
                  Calculate gross profit and net profit margins.
                </div>
              </a>

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

              <a
                href="/calculators/laundromat-profit-calculator"
                className="rounded-xl border border-slate-200 bg-white p-4 transition hover:border-slate-400"
              >
                <div className="font-semibold text-slate-900">
                  Laundromat Profit Calculator
                </div>
                <div className="mt-1 text-sm text-slate-500">
                  Model laundromat revenue, expenses, profit, and payback.
                </div>
              </a>
            </div>
          </section>
          <div className="mt-10 rounded-2xl bg-slate-100 p-6">
            <h3 className="font-semibold">Important</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              This calculator provides estimates for educational and planning
              purposes only. Actual break-even performance can vary based on
              pricing changes, discounts, product mix, taxes, financing,
              capacity limits, labor, overhead allocation, returns, and other
              business conditions.
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