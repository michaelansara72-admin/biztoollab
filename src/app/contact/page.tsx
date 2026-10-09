import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Contact BizToolLab with questions, feedback, corrections, or suggestions for new business calculators and tools.",
};

export default function ContactPage() {
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
          Contact
        </p>

        <h1 className="mt-3 text-4xl font-bold tracking-tight">
          Get in touch with BizToolLab
        </h1>

        <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
          We welcome questions, feedback, corrections, and suggestions for new
          calculators or business tools.
        </p>

        <div className="mt-10 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h2 className="text-xl font-semibold">
            Contact information
          </h2>

          <p className="mt-4 leading-7 text-slate-600">
            Email{" "}
            <a
              href="mailto:support@biztoollab.com"
              className="font-semibold text-slate-900 underline"
            >
              support@biztoollab.com
            </a>
            .
          </p>
        </div>

        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-8">
          <h2 className="text-xl font-semibold">
            Suggestions are welcome
          </h2>

          <p className="mt-4 leading-7 text-slate-600">
            If there is a business calculation, industry-specific tool, or
            financial planning utility you would like to see added to
            BizToolLab, email{" "}
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