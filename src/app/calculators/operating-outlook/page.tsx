import type { Metadata } from "next";
import Link from "next/link";
import OperatingOutlookCalculator from "./OperatingOutlookCalculator";

export const metadata: Metadata = {
  title: "Operating Outlook",
  description:
    "Estimate monthly operating profit, operating margin, and break-even revenue under base, downside, and upside assumptions. Results are before financing and taxes and are planning estimates, not forecasts.",
};

export default function OperatingOutlookPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link href="/" className="text-xl font-bold tracking-tight">
            BizToolLab
          </Link>

          <Link
            href="/calculators"
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
            Operating Outlook
          </h1>

          <p className="mt-6 text-lg leading-8 text-slate-600">
            See how monthly operating profit changes when revenue and fixed
            costs move together. Enter revenue, the share of revenue that goes
            to variable costs, and monthly fixed costs.
          </p>

          <p className="mt-4 text-lg leading-8 text-slate-600">
            Operating profit in this calculator is before financing and taxes.
            The base, downside, and upside cases are planning estimates, not
            financial advice or forecasts.
          </p>
        </div>

        <OperatingOutlookCalculator />
      </section>

      <section className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-3xl space-y-10 px-6 py-14">
          <div>
            <h2 className="text-2xl font-bold">Operating profit</h2>
            <p className="mt-4 leading-7 text-slate-600">
              Operating profit is what remains after variable costs and fixed
              operating costs are subtracted from monthly revenue. It does not
              subtract loan payments, owner financing, income taxes, or
              one-time purchases.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-bold">Operating margin</h2>
            <p className="mt-4 leading-7 text-slate-600">
              Operating margin is operating profit divided by monthly revenue.
              A positive margin means the entered month covers both variable
              and fixed costs. A negative margin means it does not. When
              revenue is zero, the margin is undefined because there is no
              revenue to divide by. Profit can still be shown.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-bold">Fixed versus variable costs</h2>
            <p className="mt-4 leading-7 text-slate-600">
              Variable costs change with revenue. A 30% variable-cost rate
              means 30 cents of every revenue dollar goes to those costs.
              Fixed costs are entered as a monthly amount, such as rent or a
              base payroll, and do not change when revenue changes in the base
              case. The downside illustration raises that fixed-cost amount by
              10% while leaving the variable-cost rate unchanged.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-bold">Break-even revenue</h2>
            <p className="mt-4 leading-7 text-slate-600">
              Break-even revenue is the monthly revenue at which operating
              profit is zero. If variable costs consume the entire revenue
              dollar and fixed costs are still above zero, no finite revenue
              level covers those fixed costs. If variable costs consume the
              entire revenue dollar and fixed costs are zero, operating profit
              is zero at every revenue level.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-bold">Scenario analysis</h2>
            <p className="mt-4 leading-7 text-slate-600">
              The downside case reduces revenue by 15% and increases fixed
              costs by 10%. The upside case increases revenue by 15% and
              leaves fixed costs unchanged. Neither case predicts what will
              happen. They show the arithmetic result of those stated changes.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-bold">A worked example</h2>
            <p className="mt-4 leading-7 text-slate-600">
              Suppose monthly revenue is $10,000, variable costs are 30% of
              revenue, and monthly fixed costs are $5,000. Variable costs are
              $3,000, so $7,000 remains toward fixed costs. Base operating
              profit is $2,000, and the base operating margin is 20%. Base
              break-even revenue is approximately $7,142.86. With the same
              entries, the downside illustration produces $450 of operating
              profit, and the upside illustration produces $3,050.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-bold">Important limitations</h2>
            <p className="mt-4 leading-7 text-slate-600">
              These figures are planning estimates. They are not a forecast,
              a valuation, or financial, tax, legal, or lending advice. Actual
              results can differ because of taxes, debt payments, owner pay,
              seasonality, one-time costs, and costs that do not stay at a
              constant percentage of revenue.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
