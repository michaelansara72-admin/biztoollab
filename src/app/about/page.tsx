import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About",
  description:
    "Learn about BizToolLab and our mission to provide simple, useful business calculators and tools for entrepreneurs and small-business owners.",
};

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
          <a href="/" className="text-2xl font-bold">
            BizToolLab
          </a>

          <a
            href="/"
            className="text-sm font-medium text-slate-600 hover:text-slate-950"
          >
            Back to Home
          </a>
        </div>
      </header>

      <section className="mx-auto max-w-4xl px-6 py-16">
        <p className="text-sm font-semibold uppercase tracking-wider text-slate-500">
          About BizToolLab
        </p>

        <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
          Practical tools for better business decisions.
        </h1>

        <div className="mt-8 space-y-6 text-lg leading-8 text-slate-600">
          <p>
            BizToolLab is a growing collection of free business calculators and
            practical decision-making tools designed for entrepreneurs,
            small-business owners, side hustlers, and people evaluating new
            business opportunities.
          </p>

          <p>
            Our goal is to make common business calculations easier to
            understand without requiring complicated spreadsheets or expensive
            software.
          </p>

          <p>
            BizToolLab tools are designed to help users estimate costs, model
            revenue, evaluate profitability, compare opportunities, calculate
            returns, and better understand the financial assumptions behind a
            business decision.
          </p>

          <p>
            We are continuing to expand the site with additional calculators,
            industry-specific tools, startup resources, and educational
            information.
          </p>
        </div>

        <div className="mt-12 rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-xl font-semibold">Our approach</h2>

          <p className="mt-3 leading-7 text-slate-600">
            We aim to keep our tools simple, transparent, and useful. Whenever
            possible, we explain how calculations are performed so users can
            understand the assumptions behind the results.
          </p>
        </div>
      </section>
    </main>
  );
}