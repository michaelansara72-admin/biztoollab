import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import SaveRecommendationButton from "./components/SaveRecommendationButton";
import GovernanceDecisionBrief from "./components/GovernanceDecisionBrief";
import SavedGovernanceHistory from "./components/SavedGovernanceHistory";
import RecommendationEvidence from "./components/RecommendationEvidence";
import SearchConsoleComparisonPanel from "./components/SearchConsoleComparisonPanel";
import { getSearchConsoleSnapshots } from "@/lib/searchConsoleSnapshotRepository";
import {
  getSnapshotsForRecommendation,
} from "@/lib/recommendationSnapshotRepository";
import {
  getLatestAiRecommendation,
} from "@/lib/aiRecommendationRepository";

import {
  getDecisionsForRecommendation,
} from "@/lib/humanDecisionRepository";

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

type SeoOpportunityResponse = {
  success: boolean;
  source: string;
  siteUrl: string;

  period: {
    startDate: string;
    endDate: string;
  };

  analysis: {
    summary: string;
    evidenceAssessment: string;
    opportunity: string;
    evidence: string;
    recommendation: string;
    experiment: string;
    measurement: string;
    confidence: "low" | "moderate" | "high";
    governanceStatus:
      | "monitor-longer"
      | "candidate-experiment";
  };
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
async function getSeoOpportunityData() {
  const headerStore = await headers();

  const host =
    headerStore.get("host") ?? "localhost:3000";

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
    `${protocol}://${host}/api/admin/ai/seo-opportunity`,
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

  return (await response.json()) as SeoOpportunityResponse;
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

  const [
  searchConsoleData,
  seoOpportunityData,
] = await Promise.all([
  getSearchConsoleData(),
  getSeoOpportunityData(),
]);

const topQueries =
  searchConsoleData?.queries?.slice(0, 10) ?? [];

const topPages =
  searchConsoleData?.pages?.slice(0, 10) ?? [];

const seoAnalysis =
  seoOpportunityData?.analysis ?? null;
let searchConsoleSnapshots: Array<{
  id: number;
  siteUrl: string;
  evidenceStart: string;
  evidenceEnd: string;
  collectedAt: string;
}> = [];

try {
  const snapshotRecords = await getSearchConsoleSnapshots(20);

  searchConsoleSnapshots = snapshotRecords.map((snapshot) => ({
    id: Number(snapshot.id),
    siteUrl: snapshot.site_url,
    evidenceStart:
      snapshot.evidence_start instanceof Date
        ? snapshot.evidence_start.toISOString().slice(0, 10)
        : String(snapshot.evidence_start).slice(0, 10),
    evidenceEnd:
      snapshot.evidence_end instanceof Date
        ? snapshot.evidence_end.toISOString().slice(0, 10)
        : String(snapshot.evidence_end).slice(0, 10),
    collectedAt:
      snapshot.collected_at instanceof Date
        ? snapshot.collected_at.toISOString()
        : String(snapshot.collected_at),
  }));
} catch (error) {
  console.error("Unable to load Search Console snapshots:", error);
}
// Retrieve the latest saved governance history.
// A database error must not prevent the dashboard from loading.

let savedGovernance = null;

try {
  const recommendation =
    await getLatestAiRecommendation();

  if (recommendation) {
    const [decisions, evidenceSnapshots] =
      await Promise.all([
        getDecisionsForRecommendation(
          recommendation.id
        ),
        getSnapshotsForRecommendation(
          recommendation.id
        ),
      ]);

    savedGovernance = {
      recommendation,
      latestDecision: decisions[0] ?? null,
      decisions,
      evidenceSnapshots,
    };
  }
} catch (error) {
  console.error(
    "Unable to load saved governance history:",
    error
  );
}  return (
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
                  â€“{" "}
                  {formatDate(
                    searchConsoleData.period.endDate
                  )}
                </span>
              </p>
            </section>

            <SearchConsoleComparisonPanel
  snapshots={searchConsoleSnapshots}
/>
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
{searchConsoleData && seoAnalysis && (
  <GovernanceDecisionBrief
    siteMetrics={searchConsoleData.metrics}
    period={searchConsoleData.period}
    analysis={seoAnalysis}
  />
)}
   {savedGovernance && (
  <>
    <SavedGovernanceHistory
      recommendation={savedGovernance.recommendation}
      latestDecision={savedGovernance.latestDecision}
      decisions={savedGovernance.decisions}
    />

    <RecommendationEvidence
      snapshots={savedGovernance.evidenceSnapshots}
    />
  </>
)}
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
  <div className="flex items-start justify-between gap-4">
    <div>
      <p className="text-sm font-bold text-slate-500">
        AI Opportunities
      </p>

      <p className="mt-3 text-2xl font-bold text-slate-900">
        SEO Intelligence
      </p>
    </div>

    {seoAnalysis && (
      <span
        className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${
          seoAnalysis.governanceStatus ===
          "candidate-experiment"
            ? "bg-blue-50 text-blue-700"
            : "bg-amber-50 text-amber-700"
        }`}
      >
        {seoAnalysis.governanceStatus ===
        "candidate-experiment"
          ? "Candidate Experiment"
          : "Monitor Longer"}
      </span>
    )}
  </div>

  {seoAnalysis ? (
    <>
      <p className="mt-4 text-sm leading-6 text-slate-600">
        {seoAnalysis.summary}
      </p>

      <div className="mt-5 rounded-xl bg-slate-50 p-4">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
          Opportunity
        </p>

        <p className="mt-2 text-sm leading-6 text-slate-700">
          {seoAnalysis.opportunity}
        </p>
      </div>

      <div className="mt-4">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
          Recommendation
        </p>

        <p className="mt-2 text-sm leading-6 text-slate-600">
          {seoAnalysis.recommendation}
        </p>
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-slate-200 pt-4">
        <span className="text-sm font-semibold text-slate-500">
          AI Confidence
        </span>

        <span className="text-sm font-bold capitalize text-slate-900">
          {seoAnalysis.confidence}
        </span>
      </div>

      <SaveRecommendationButton
  recommendation={{
    source:
      seoOpportunityData?.source ??
      "google-search-console",

    siteUrl:
      seoOpportunityData?.siteUrl ?? "",

    period:
      seoOpportunityData?.period ?? {
        startDate: "",
        endDate: "",
      },

    analysis: seoAnalysis,
  }}
/>
    </>
  ) : (
    <p className="mt-4 text-sm text-slate-500">
      AI opportunity intelligence is currently unavailable.
    </p>
  )}
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
              PDF Â· Excel Â· CSV
            </p>

            <p className="mt-2 text-sm text-slate-500">
              Downloadable intelligence and management reports.
            </p>
          </section>
        </div>

        <SearchConsoleComparisonPanel
  snapshots={searchConsoleSnapshots}
/>
<div className="mt-8 grid gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-bold uppercase tracking-[0.14em] text-slate-400">
              Intelligence Pipeline
            </p>

            <h2 className="mt-2 text-xl font-bold text-slate-900">
              Observe â†’ Analyze â†’ Recommend â†’ Decide
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