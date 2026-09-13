import SignOutButton from "./components/SignOutButton";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  adminSessionCookie,
  verifyAdminSessionToken,
} from "@/lib/adminAuth";

export default async function AdminPage() {
  const cookieStore = await cookies();

  const sessionToken = cookieStore.get(
    adminSessionCookie.name
  )?.value;

  const authenticated =
    verifyAdminSessionToken(sessionToken);

  if (!authenticated) {
    redirect("/admin/login");
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-12">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
  <div>
    <p className="text-sm font-bold uppercase tracking-[0.16em] text-slate-400">
      BizToolLab Back Office
    </p>

    <h1 className="mt-2 text-3xl font-bold text-slate-900">
      SEO & Business Intelligence
    </h1>

    <p className="mt-3 max-w-3xl text-slate-600">
      Private operations dashboard for search performance,
      AI recommendations, experiments, reporting, and
      human-governed decision making.
    </p>
  </div>

  <SignOutButton />
</div>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-bold text-slate-500">
              Search Visibility
            </p>
            <p className="mt-3 text-2xl font-bold text-slate-900">
              Coming Soon
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Google Search Console performance and trends.
            </p>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-bold text-slate-500">
              AI Opportunities
            </p>
            <p className="mt-3 text-2xl font-bold text-slate-900">
              Coming Soon
            </p>
            <p className="mt-2 text-sm text-slate-500">
              AI-detected growth and optimization opportunities.
            </p>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-bold text-slate-500">
              Experiments
            </p>
            <p className="mt-3 text-2xl font-bold text-slate-900">
              Coming Soon
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Approved tests and measured outcomes.
            </p>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-bold text-slate-500">
              Reports
            </p>
            <p className="mt-3 text-2xl font-bold text-slate-900">
              PDF · Excel · CSV
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Downloadable intelligence and management reports.
            </p>
          </section>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-bold uppercase tracking-[0.14em] text-slate-400">
              Intelligence Pipeline
            </p>

            <h2 className="mt-2 text-xl font-bold text-slate-900">
              Observe → Analyze → Recommend → Decide
            </h2>

            <p className="mt-3 leading-7 text-slate-600">
              This area will combine performance data with AI
              analysis so opportunities can be reviewed before
              controlled changes are made.
            </p>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-bold uppercase tracking-[0.14em] text-slate-400">
              Human Governance
            </p>

            <h2 className="mt-2 text-xl font-bold text-slate-900">
              You remain the decision authority.
            </h2>

            <p className="mt-3 leading-7 text-slate-600">
              Future AI recommendations will support approval,
              monitoring, modification, or rejection before
              consequential changes are implemented.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}