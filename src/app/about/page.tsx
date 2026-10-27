import type { Metadata } from "next";
import Link from "next/link";
import { publicCanonicalUrl } from "@/lib/publicCanonical";

export const metadata: Metadata = {
  title: "About",
  description:
    "Learn about BizToolLab and our mission to provide simple, useful business calculators and tools for entrepreneurs and small-business owners.",
  alternates: {
    canonical: publicCanonicalUrl("/about"),
  },
};

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
          <Link href="/" className="text-2xl font-bold">
            BizToolLab
          </Link>

          <Link
            href="/"
            className="text-sm font-medium text-slate-600 hover:text-slate-950"
          >
            Back to Home
          </Link>
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
            BizToolLab is owned and operated by Synergy Media & Tech LLC.
          </p>

          <p>
            The mission is to give entrepreneurs, small-business owners, side
            hustlers, and people evaluating a business idea clear calculators
            and short guides for everyday financial questions.
          </p>

          <p>
            The tools help users estimate costs, model revenue, look at
            profitability, compare opportunities, and calculate returns. They
            are meant to make those calculations understandable without a
            complicated spreadsheet.
          </p>

          <p>
            BizToolLab is continuing to add calculators, industry-specific
            tools, and educational guides.
          </p>
        </div>

        <div className="mt-12 rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-xl font-semibold">Our approach</h2>

          <div className="mt-3 space-y-4 leading-7 text-slate-600">
            <p>
              Each calculator starts from the assumptions you enter, such as
              prices, costs, volume, or other operating figures. The result is
              the estimate those inputs produce.
            </p>

            <p>
              Where a calculator explains a formula or walks through an
              example, that explanation shows how the estimate is calculated
              from the assumptions. The inputs stay visible so you can see
              what the result depends on.
            </p>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-xl font-semibold">Estimates, not advice</h2>

          <div className="mt-3 space-y-4 leading-7 text-slate-600">
            <p>
              Calculator results and guide examples are educational planning
              estimates. They are only as useful as the assumptions behind
              them, and real revenue, costs, and operating conditions can
              differ.
            </p>

            <p>
              These estimates are not financial, accounting, tax, legal, or
              investment advice, and they are not a prediction or a guarantee
              of business results. Review the assumptions and check the
              figures before you rely on them.
            </p>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-xl font-semibold">Corrections and suggestions</h2>

          <p className="mt-3 leading-7 text-slate-600">
            If you find an error or want to suggest an improvement, use the{" "}
            <Link
              href="/contact"
              className="font-semibold text-slate-900 underline"
            >
              contact page
            </Link>{" "}
            or email{" "}
            <a
              href="mailto:support@biztoollab.com"
              className="font-semibold text-slate-900 underline"
            >
              support@biztoollab.com
            </a>
            .
          </p>
        </div>
      </section>
    </main>
  );
}