import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Read the BizToolLab Privacy Policy and learn how information may be collected and used when visiting the website.",
};

export default function PrivacyPage() {
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
          Legal
        </p>

        <h1 className="mt-3 text-4xl font-bold tracking-tight">
          Privacy Policy
        </h1>

        <p className="mt-4 text-sm text-slate-500">
          Last updated: September 8, 2026
        </p>

        <div className="mt-10 space-y-10 leading-7 text-slate-600">
          <section>
            <h2 className="text-2xl font-semibold text-slate-900">
              Information we collect
            </h2>

            <p className="mt-3">
              BizToolLab may collect limited technical information associated
              with visits to the website, such as browser type, device type,
              referring pages, approximate geographic region, pages visited,
              and general usage information.
            </p>

            <p className="mt-3">
              Calculator values entered into tools are generally processed for
              the purpose of performing calculations and are not intended to
              require personally identifying information.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900">
              Analytics
            </h2>

            <p className="mt-3">
              BizToolLab may use analytics services in the future to understand
              how visitors use the website, identify popular tools, measure
              performance, and improve the user experience.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900">
              Advertising
            </h2>

            <p className="mt-3">
              BizToolLab may display advertising in the future through services
              such as Google AdSense or other advertising providers.
              Advertising providers may use cookies or similar technologies as
              permitted by applicable law and their own privacy policies.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900">
              Cookies and similar technologies
            </h2>

            <p className="mt-3">
              The website or third-party services used by BizToolLab may use
              cookies or similar technologies for functionality, analytics,
              security, advertising, or performance measurement.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900">
              Third-party services
            </h2>

            <p className="mt-3">
              BizToolLab may use third-party hosting, analytics, advertising,
              or other technology providers. Those services may process
              information according to their own privacy policies and terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900">
              Changes to this policy
            </h2>

            <p className="mt-3">
              This Privacy Policy may be updated as BizToolLab adds new tools,
              services, analytics, advertising, or other website features.
              Changes will be reflected on this page.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900">
              Contact
            </h2>

            <p className="mt-3">
              Questions regarding this Privacy Policy may be submitted through
              the BizToolLab Contact page.
            </p>
          </section>
        </div>
      </section>
    </main>
  );
}