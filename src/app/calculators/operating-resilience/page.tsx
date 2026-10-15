import type { Metadata } from "next";
import Link from "next/link";
import OperatingResilienceCalculator from "./OperatingResilienceCalculator";

export const metadata: Metadata = {
  title: "Operating Resilience Assessment",
  description:
    "See monthly operating profit, the signed gap between revenue and break-even, and one stated downside illustration. Results are before financing and taxes and are planning estimates, not forecasts.",
};

export default function OperatingResiliencePage() {
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
            Operating Resilience Assessment
          </h1>

          <p className="mt-6 text-lg leading-8 text-slate-600">
            Operating resilience here means whether this month&apos;s revenue
            covers variable costs and fixed operating costs, how far that
            revenue sits from break-even, and what one stated downside does to
            operating profit.
          </p>

          <p className="mt-4 text-lg leading-8 text-slate-600">
            Enter monthly revenue, the percentage of revenue spent on variable
            costs, and monthly fixed operating costs. The figures are before
            financing and taxes. They are planning estimates, not a forecast
            and not a financial-health score.
          </p>
        </div>

        <OperatingResilienceCalculator />
      </section>

      <section className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-3xl space-y-10 px-6 py-14">
          <div>
            <h2 className="text-2xl font-bold">What this assessment covers</h2>
            <p className="mt-4 leading-7 text-slate-600">
              The assessment reads one month at a time. It asks whether
              operating profit is above, exactly at, or below zero, and whether
              revenue is above, exactly at, or below the break-even revenue for
              the same costs. A second view applies a stated downside: revenue
              is multiplied by 0.85 and fixed costs are multiplied by 1.1. The
              variable-cost rate stays the same.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-bold">Break-even revenue</h2>
            <p className="mt-4 leading-7 text-slate-600">
              Break-even revenue is the monthly revenue at which operating
              profit is zero, before financing and taxes. It exists as one
              finite number when variable costs take less than the entire
              revenue dollar. A 100% variable-cost rate with fixed costs still
              above zero has no finite break-even revenue. A 100% rate with
              zero fixed costs produces zero operating profit at every revenue
              level, so there is no single threshold. Those cases are described
              in words. They are not shown as a break-even of $0.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-bold">Margin of safety</h2>
            <p className="mt-4 leading-7 text-slate-600">
              When a unique break-even revenue exists, the margin of safety is
              the signed gap between that scenario&apos;s revenue and its
              break-even revenue. A positive gap means revenue is above
              break-even. A negative gap means revenue is short of it. Zero
              means the two amounts are equal. The percentage form divides that
              gap by the same revenue. At zero revenue the dollar gap can still
              be shown, and the percentage is unavailable. The gap is not cash
              on hand.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-bold">A worked example</h2>
            <p className="mt-4 leading-7 text-slate-600">
              Suppose monthly revenue is $10,000, variable costs are 30% of
              revenue, and monthly fixed costs are $5,000. Base operating
              profit is $2,000 and the operating margin is 20%. Break-even
              revenue is approximately $7,142.86. The margin of safety is
              approximately $2,857.14, about 28.6% of the entered revenue. The
              downside illustration produces $450 of operating profit, and its
              margin of safety is approximately $642.86.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-bold">Important limitations</h2>
            <p className="mt-4 leading-7 text-slate-600">
              Operating profit is not cash flow or net income. The downside
              case is an arithmetic illustration, not a forecast. Liquidity,
              debt service, taxes, and owner pay are outside this assessment.
              Amounts are displayed in dollars and cents. A result above or
              below zero by less than one cent can display as $0.00. That
              display is not an exact zero. These figures are not financial,
              tax, legal, or lending advice.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
