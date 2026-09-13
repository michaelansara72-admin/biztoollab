import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import {
  adminSessionCookie,
  verifyAdminSessionToken,
} from "@/lib/adminAuth";

import SignOutButton from "./components/SignOutButton";

type SearchConsoleResponse = {
  success: boolean;
  connected: boolean;
  siteUrl: string;
  period: {
    startDate: string;
    endDate: string;
  };
  metrics: {
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
  };
  queries: Array<{
    query: string;
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
  }>;
  pages: Array<{
    page: string;
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
  }>;
};

function formatPercent(value: number) {
  return `${(value * 100).toFixed(2)}%`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${value}T12:00:00`));
}

function formatPageName(page: string) {
  try {
    const url = new URL(page);

    if (url.pathname === "/") {
      return "Home";
    }

    if (url.pathname === "/calculators") {
      return "Calculators";
    }

    const slug = url.pathname
      .split("/")
      .filter(Boolean)
      .pop();

    if (!slug) {
      return page;
    }

    return slug
      .split("-")
      .map(
        (word) =>
          word.charAt(0).toUpperCase() +
          word.slice(1)
      )
      .join(" ");
  } catch {
    return page;
  }
}

async function getSearchConsoleData() {
  const headerStore = await headers();

  const host = headerStore.get("host") ?? "localhost:3000";

  const protocol =
    process.env.NODE_ENV === "production"
      ? "https"
      : "http";

  const cookieStore = await cookies();

  const cookieHeader = cookieStore
    .getAll()
    .map(
      (cookie) =>
        `${cookie.name}=${cookie.value}`
    )
    .join("; ");

  const response = await fetch(
    `${protocol}://${host}/api/admin/google/performance`,
    {
      headers: {
        cookie: cookieHeader,
      },
      cache: "no-store",
    }
  );

  if (!response.ok) {
    return null;
  }

  return (await response.json()) as SearchConsoleResponse;
}

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

  const searchConsoleData =
    await getSearchConsoleData();

  const topQueries =
    searchConsoleData?.queries?.slice(0, 10) ?? [];

  const topPages =
    searchConsoleData?.pages?.slice(0, 10) ?? [];

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

        {searchConsoleData ? (
          <>
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-bold uppercase tracking-[0.14em] text-slate-400">
                    Search Visibility
                  </p>

                  <h2 className="mt-2 text-2xl font-bold text-slate-900">
                    Google Search Console
                  </h2>

                  <p className="mt-2 text-sm text-slate-500">
                    Connected to{" "}
                    <span className="font-semibold text-slate-700">
                      {searchConsoleData.siteUrl}
                    </span>
                  </p>
                </div>

                <div className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-bold text-emerald-700">
                  Connected
                </div>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl bg-slate-50 p-5">
                  <p className="text-sm font-semibold text-slate-500">
                    Impressions
                  </p>
                  <p className="mt-2 text-3xl font-bold text-slate-900">
                    {searchConsoleData.metrics.impressions.toLocaleString()}
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-5">
                  <p className="text-sm font-semibold text-slate-500">
                    Clicks
                  </p>
                  <p className="mt-2 text-3xl font-bold text-slate-900">
                    {searchConsoleData.metrics.clicks.toLocaleString()}
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-5">
                  <p className="text-sm font-semibold text-slate-500">
                    CTR
                  </p>
                  <p className="mt-2 text-3xl font-bold text-slate-900">
                    {formatPercent(
                      searchConsoleData.metrics.ctr
                    )}
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-5">
                  <p className="text-sm font-semibold text-slate-500">
                    Avg. Position
                  </p>
                  <p className="mt-2 text-3xl font-bold text-slate-900">
                    {searchConsoleData.metrics.position.toFixed(
                      1
                    )}
                  </p>
                </div>
              </div>

              <p className="mt-5 text-sm text-slate-500">
                Reporting period:{" "}
                <span className="font-semibold text-slate-700">
                  {formatDate(
                    searchConsoleData.period.startDate
                  )}{" "}
                  –{" "}
                  {formatDate(
                    searchConsoleData.period.endDate
                  )}
                </span>
              </p>
            </section>

            <div className="mt-8 grid gap-6 lg:grid-cols-2">
              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-5">
                  <p className="text-sm font-bold uppercase tracking-[0.14em] text-slate-400">
                    Top Search Queries
                  </p>

                  <h2 className="mt-2 text-xl font-bold text-slate-900">
                    What people are searching for
                  </h2>
                </div>

                <div className="space-y-3">
                  {topQueries.map(
                    (item, index) => (
                      <div
                        key={`${item.query}-${index}`}
                        className="flex items-center justify-between gap-4 rounded-xl bg-slate-50 px-4 py-3"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-slate-900">
                            {item.query}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            Position{" "}
                            {item.position.toFixed(1)}
                          </p>
                        </div>

                        <div className="text-right">
                          <p className="font-bold text-slate-900">
                            {item.impressions}
                          </p>
                          <p className="text-xs text-slate-500">
                            impressions
                          </p>
                        </div>
                      </div>
                    )
                  )}
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-5">
                  <p className="text-sm font-bold uppercase tracking-[0.14em] text-slate-400">
                    Top Pages
                  </p>

                  <h2 className="mt-2 text-xl font-bold text-slate-900">
                    Pages appearing in Google
                  </h2>
                </div>

                <div className="space-y-3">
                  {topPages.map(
                    (item, index) => (
                      <div
                        key={`${item.page}-${index}`}
                        className="flex items-center justify-between gap-4 rounded-xl bg-slate-50 px-4 py-3"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-slate-900">
                            {formatPageName(item.page)}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            Position{" "}
                            {item.position.toFixed(1)}
                          </p>
                        </div>

                        <div className="text-right">
                          <p className="font-bold text-slate-900">
                            {item.impressions}
                          </p>
                          <p className="text-xs text-slate-500">
                            impressions
                          </p>
                        </div>
                      </div>
                    )
                  )}
                </div>
              </section>
            </div>
          </>
        ) : (
          <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
            <p className="font-bold text-amber-900">
              Search Console data is currently unavailable.
            </p>

            <p className="mt-2 text-sm text-amber-800">
              Reconnect Google Search Console to restore live
              SEO performance data.
            </p>
          </section>
        )}

        <div className="mt-8 grid gap-6 md:grid-cols-3">
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
              Search performance data now flows directly into
              BizToolLab. The next intelligence layer will use
              this evidence to identify opportunities and support
              controlled decisions.
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
              AI recommendations will support approval,
              monitoring, modification, or rejection before
              consequential changes are implemented.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}