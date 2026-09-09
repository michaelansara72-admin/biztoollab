import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Free Business Calculators & Tools",
  description:
    "Browse free business calculators for profit, startup costs, break-even analysis, ROI, vending machines, laundromats, and more.",
};

const calculators = [
  {
    title: "Laundromat Profit Calculator",
    description:
      "Estimate monthly revenue, operating expenses, profit margin, ROI, and investment payback for a laundromat.",
    href: "/calculators/laundromat-profit-calculator",
    category: "Business Profitability",
  },
  {
    title: "Vending Machine Profit Calculator",
    description:
      "Estimate vending route revenue, product costs, commissions, operating expenses, profit, and payback.",
    href: "/calculators/vending-machine-profit-calculator",
    category: "Business Profitability",
  },
  {
    title: "Startup Cost Calculator",
    description:
      "Estimate startup expenses, monthly operating costs, cash reserves, contingency funds, and total capital needed.",
    href: "/calculators/startup-cost-calculator",
    category: "Business Planning",
  },
  {
    title: "Break-Even Calculator",
    description:
      "Calculate break-even units, break-even revenue, contribution margin, and the sales required to reach a target profit.",
    href: "/calculators/break-even-calculator",
    category: "Business Planning",
  },
  {
    title: "Profit Margin Calculator",
    description:
      "Calculate gross profit, net profit, gross margin, net margin, and operating expense percentages.",
    href: "/calculators/profit-margin-calculator",
    category: "Financial Analysis",
  },
  {
    title: "ROI Calculator",
    description:
      "Calculate net profit, return on investment, return multiple, and annualized return over a holding period.",
    href: "/calculators/roi-calculator",
    category: "Financial Analysis",
  },
];

export default function CalculatorsPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-500">
            BizToolLab
          </p>

          <h1 className="mt-4 max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">
            Free Business Calculators & Tools
          </h1>

          <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-600">
            Explore practical calculators designed to help entrepreneurs,
            small-business owners, and side hustlers estimate costs,
            profitability, break-even points, margins, and investment returns.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-14">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {calculators.map((calculator) => (
            <a
              key={calculator.href}
              href={calculator.href}
              className="group flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-400 hover:shadow-md"
            >
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                {calculator.category}
              </p>

              <h2 className="mt-3 text-xl font-bold text-slate-900">
                {calculator.title}
              </h2>

              <p className="mt-3 flex-1 text-sm leading-7 text-slate-600">
                {calculator.description}
              </p>

              <span className="mt-6 text-sm font-semibold text-slate-900">
                Open calculator →
              </span>
            </a>
          ))}
        </div>
      </section>

      <section className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-4xl px-6 py-14">
          <h2 className="text-2xl font-bold">
            Practical Tools for Better Business Decisions
          </h2>

          <div className="mt-6 space-y-5 leading-7 text-slate-600">
            <p>
              BizToolLab calculators are designed to make common business
              calculations easier to understand and compare. Use them to test
              different assumptions before making decisions about pricing,
              operating costs, startup capital, or investments.
            </p>

            <p>
              Each calculator includes an explanation of how the calculation
              works, a practical example, frequently asked questions, and
              related tools to help you continue your analysis.
            </p>

            <p>
              Results are estimates for planning and educational purposes.
              Actual business performance can vary based on market conditions,
              taxes, financing, operating decisions, and other factors.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}