export type ComparisonSnapshot = {
  siteUrl: string;
  evidenceStart: string;
  evidenceEnd: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};
export type MetricChange = {
  before: number;
  after: number;
  difference: number;
  percentChange: number | null;
};

export type SnapshotComparison = {
  valid: true;
  baseline: ComparisonSnapshot;
  comparison: ComparisonSnapshot;
  periodDays: number;
  metrics: {
    clicks: MetricChange;
    impressions: MetricChange;
    ctr: MetricChange;
    position: MetricChange;
  };
};

export type ComparisonResult =
  | SnapshotComparison
  | {
      valid: false;
      reason: string;
    };

function parseDate(value: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const timestamp = Date.parse(`${value}T00:00:00Z`);

  if (!Number.isFinite(timestamp)) {
    return null;
  }

  if (
    new Date(timestamp).toISOString().slice(0, 10) !==
    value
  ) {
    return null;
  }

  return timestamp;
}

function calculateChange(
  before: number,
  after: number
): MetricChange {
  const difference = after - before;

  return {
    before,
    after,
    difference,
    percentChange:
      before === 0
        ? null
        : (difference / before) * 100,
  };
}

export function compareSearchConsoleSnapshots(
  baseline: ComparisonSnapshot,
  comparison: ComparisonSnapshot
): ComparisonResult {
      if (
    !baseline.siteUrl ||
    !comparison.siteUrl ||
    baseline.siteUrl !== comparison.siteUrl
  ) {
    return {
      valid: false,
      reason: "Snapshots must belong to the same Search Console property.",
    };
  }
  const baselineStart = parseDate(
    baseline.evidenceStart
  );

  const baselineEnd = parseDate(
    baseline.evidenceEnd
  );

  const comparisonStart = parseDate(
    comparison.evidenceStart
  );

  const comparisonEnd = parseDate(
    comparison.evidenceEnd
  );

  if (
    baselineStart === null ||
    baselineEnd === null ||
    comparisonStart === null ||
    comparisonEnd === null
  ) {
    return {
      valid: false,
      reason: "One or more evidence dates are invalid.",
    };
  }

  if (
    baselineStart > baselineEnd ||
    comparisonStart > comparisonEnd
  ) {
    return {
      valid: false,
      reason: "An evidence period has reversed dates.",
    };
  }

  const day = 24 * 60 * 60 * 1000;

  const baselineDays =
    (baselineEnd - baselineStart) / day + 1;

  const comparisonDays =
    (comparisonEnd - comparisonStart) / day + 1;

  if (baselineDays !== comparisonDays) {
    return {
      valid: false,
      reason:
        "Evidence periods must have equal lengths.",
    };
  }

  if (comparisonStart <= baselineEnd) {
    return {
      valid: false,
      reason:
        "Comparison period must begin after the baseline ends.",
    };
  }

  const values = [
    baseline.clicks,
    baseline.impressions,
    baseline.ctr,
    baseline.position,
    comparison.clicks,
    comparison.impressions,
    comparison.ctr,
    comparison.position,
  ];

  if (
    values.some(
      (value) =>
        !Number.isFinite(value) || value < 0
    )
  ) {
    return {
      valid: false,
      reason:
        "Metrics must be finite, nonnegative numbers.",
    };
  }

  return {
    valid: true,
    baseline,
    comparison,
    periodDays: baselineDays,
    metrics: {
      clicks: calculateChange(
        baseline.clicks,
        comparison.clicks
      ),
      impressions: calculateChange(
        baseline.impressions,
        comparison.impressions
      ),
      ctr: calculateChange(
        baseline.ctr,
        comparison.ctr
      ),
      position: calculateChange(
        baseline.position,
        comparison.position
      ),
    },
  };
}