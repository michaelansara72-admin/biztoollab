"use client";

import { useState } from "react";

type SnapshotOption = {
  id: number;
  siteUrl: string;
  evidenceStart: string;
  evidenceEnd: string;
  collectedAt: string;
};

type MetricChange = {
  before: number;
  after: number;
  difference: number;
  percentChange: number | null;
};

type ComparisonResult = {
  valid: true;
  baseline: {
    siteUrl: string;
    evidenceStart: string;
    evidenceEnd: string;
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
  };
  comparison: {
    siteUrl: string;
    evidenceStart: string;
    evidenceEnd: string;
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
  };
  periodDays: number;
  metrics: {
    clicks: MetricChange;
    impressions: MetricChange;
    ctr: MetricChange;
    position: MetricChange;
  };
};

type CompareApiResponse =
  | {
      success: true;
      baselineId: number;
      comparisonId: number;
      result: ComparisonResult;
    }
  | {
      success: false;
      error: string;
    };

type Props = {
  snapshots: SnapshotOption[];
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${value}T12:00:00`));
}

function formatSnapshotLabel(snapshot: SnapshotOption) {
  return `${formatDate(snapshot.evidenceStart)} – ${formatDate(
    snapshot.evidenceEnd
  )}`;
}

function formatPercent(value: number) {
  return `${(value * 100).toFixed(2)}%`;
}

function formatSignedNumber(
  value: number,
  digits = 0
) {
  const formatted = value.toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });

  return value > 0 ? `+${formatted}` : formatted;
}

function formatPercentChange(value: number | null) {
  if (value === null) {
    return "N/A";
  }

  return `${value > 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function MetricCard({
  label,
  change,
  kind,
}: {
  label: string;
  change: MetricChange;
  kind: "number" | "ctr" | "position";
}) {
  let before = change.before.toLocaleString();
  let after = change.after.toLocaleString();
  let difference = formatSignedNumber(
    change.difference
  );

  if (kind === "ctr") {
    before = formatPercent(change.before);
    after = formatPercent(change.after);
    difference = `${formatSignedNumber(
      change.difference * 100,
      2
    )} percentage points`;
  }

  if (kind === "position") {
    before = change.before.toFixed(1);
    after = change.after.toFixed(1);
    difference = formatSignedNumber(
      change.difference,
      1
    );
  }

  return (
    <div className="rounded-2xl bg-slate-50 p-5">
      <p className="text-sm font-semibold text-slate-500">
        {label}
      </p>

      <div className="mt-4 grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.1em] text-slate-400">
            Baseline
          </p>

          <p className="mt-1 text-xl font-bold text-slate-900">
            {before}
          </p>
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-[0.1em] text-slate-400">
            Comparison
          </p>

          <p className="mt-1 text-xl font-bold text-slate-900">
            {after}
          </p>
        </div>
      </div>

      <div className="mt-4 border-t border-slate-200 pt-4">
        <p className="text-sm font-semibold text-slate-700">
          Change: {difference}
        </p>

        <p className="mt-1 text-xs text-slate-500">
          Relative change:{" "}
          {formatPercentChange(
            change.percentChange
          )}
        </p>
      </div>
    </div>
  );
}

export default function SearchConsoleComparisonPanel({
  snapshots,
}: Props) {
  const [baselineId, setBaselineId] =
    useState("");

  const [comparisonId, setComparisonId] =
    useState("");

  const [result, setResult] =
    useState<ComparisonResult | null>(null);

  const [error, setError] =
    useState<string | null>(null);

  const [loading, setLoading] =
    useState(false);

  if (snapshots.length < 2) {
    const snapshot = snapshots[0];

    return (
      <section className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
        <p className="text-sm font-bold uppercase tracking-[0.14em] text-amber-700">
          Historical Comparison
        </p>

        <h2 className="mt-2 text-xl font-bold text-amber-950">
          More evidence is required.
        </h2>

        <p className="mt-3 max-w-3xl text-sm leading-6 text-amber-900">
          BizToolLab currently has{" "}
          <span className="font-bold">
            {snapshots.length}
          </span>{" "}
          stored Search Console snapshot
          {snapshots.length === 1 ? "" : "s"}.
          At least two distinct, compatible evidence
          periods are required before historical
          performance can be compared.
        </p>

        {snapshot && (
          <div className="mt-5 rounded-xl border border-amber-200 bg-white/70 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-amber-700">
              Existing Evidence
            </p>

            <p className="mt-2 font-semibold text-slate-900">
              Snapshot #{snapshot.id}
            </p>

            <p className="mt-1 text-sm text-slate-600">
              {formatSnapshotLabel(snapshot)}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              {snapshot.siteUrl}
            </p>
          </div>
        )}

        <p className="mt-5 text-xs leading-5 text-amber-800">
          No comparison will be inferred or
          manufactured until sufficient historical
          evidence exists.
        </p>
      </section>
    );
  }

  async function runComparison() {
    setError(null);
    setResult(null);

    if (!baselineId || !comparisonId) {
      setError(
        "Select both a baseline and a comparison snapshot."
      );
      return;
    }

    if (baselineId === comparisonId) {
      setError(
        "Baseline and comparison snapshots must be different."
      );
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `/api/admin/google/compare?baselineId=${encodeURIComponent(
          baselineId
        )}&comparisonId=${encodeURIComponent(
          comparisonId
        )}`,
        {
          method: "GET",
          cache: "no-store",
        }
      );

      const data =
        (await response.json()) as CompareApiResponse;

      if (!response.ok || !data.success) {
        setError(
          data.success
            ? "Unable to compare snapshots."
            : data.error
        );
        return;
      }

      setResult(data.result);
    } catch {
      setError(
        "The comparison request could not be completed."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="border-b border-slate-200 pb-6">
        <p className="text-sm font-bold uppercase tracking-[0.14em] text-slate-400">
          Historical Comparison
        </p>

        <h2 className="mt-2 text-xl font-bold text-slate-900">
          Compare Search Console evidence
        </h2>

        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          Compare two stored evidence periods. This
          reports observed metric changes only and
          does not by itself establish what caused
          those changes.
        </p>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="text-sm font-bold text-slate-700">
            Baseline period
          </span>

          <select
            value={baselineId}
            onChange={(event) => {
              setBaselineId(event.target.value);
              setResult(null);
              setError(null);
            }}
            className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900"
          >
            <option value="">
              Select baseline snapshot
            </option>

            {snapshots.map((snapshot) => (
              <option
                key={snapshot.id}
                value={snapshot.id}
              >
                #{snapshot.id} ·{" "}
                {formatSnapshotLabel(snapshot)}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-sm font-bold text-slate-700">
            Comparison period
          </span>

          <select
            value={comparisonId}
            onChange={(event) => {
              setComparisonId(event.target.value);
              setResult(null);
              setError(null);
            }}
            className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900"
          >
            <option value="">
              Select comparison snapshot
            </option>

            {snapshots.map((snapshot) => (
              <option
                key={snapshot.id}
                value={snapshot.id}
              >
                #{snapshot.id} ·{" "}
                {formatSnapshotLabel(snapshot)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <button
        type="button"
        onClick={runComparison}
        disabled={loading}
        className="mt-5 rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading
          ? "Comparing..."
          : "Compare Evidence"}
      </button>

      {error && (
        <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="font-semibold text-amber-900">
            Comparison unavailable
          </p>

          <p className="mt-1 text-sm text-amber-800">
            {error}
          </p>
        </div>
      )}

      {result && (
        <div className="mt-8">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
              Evidence Periods
            </p>

            <div className="mt-4 grid gap-5 md:grid-cols-2">
              <div>
                <p className="text-sm font-bold text-slate-900">
                  Baseline
                </p>

                <p className="mt-1 text-sm text-slate-600">
                  {formatDate(
                    result.baseline.evidenceStart
                  )}{" "}
                  –{" "}
                  {formatDate(
                    result.baseline.evidenceEnd
                  )}
                </p>
              </div>

              <div>
                <p className="text-sm font-bold text-slate-900">
                  Comparison
                </p>

                <p className="mt-1 text-sm text-slate-600">
                  {formatDate(
                    result.comparison.evidenceStart
                  )}{" "}
                  –{" "}
                  {formatDate(
                    result.comparison.evidenceEnd
                  )}
                </p>
              </div>
            </div>

            <p className="mt-4 text-xs text-slate-500">
              Each evidence period contains{" "}
              {result.periodDays} days.
            </p>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Clicks"
              change={result.metrics.clicks}
              kind="number"
            />

            <MetricCard
              label="Impressions"
              change={result.metrics.impressions}
              kind="number"
            />

            <MetricCard
              label="CTR"
              change={result.metrics.ctr}
              kind="ctr"
            />

            <MetricCard
              label="Avg. Position"
              change={result.metrics.position}
              kind="position"
            />
          </div>

          <div className="mt-6 rounded-xl border border-blue-200 bg-blue-50 p-4">
            <p className="font-semibold text-blue-950">
              Evidence interpretation
            </p>

            <p className="mt-2 text-sm leading-6 text-blue-900">
              These values describe what changed
              between the two stored periods. They do
              not establish that an AI recommendation,
              SEO modification, experiment, or other
              action caused the observed change.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}