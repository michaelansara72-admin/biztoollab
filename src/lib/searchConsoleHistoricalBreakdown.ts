export const storedSearchConsoleRowLimit = 1000;
export const historicalImpressionDisplayLimit = 10;

export type HistoricalListState =
  | "missing"
  | "empty"
  | "available"
  | "partial";

export type HistoricalImpressionRow = {
  label: string;
  baselineImpressions: number | null;
  comparisonImpressions: number | null;
  change: number;
};

export type HistoricalDimensionComparison = {
  state: "missing" | "empty" | "ready";
  baselineList: HistoricalListState;
  comparisonList: HistoricalListState;
  malformedRecords: number;
  duplicateRecords: number;
  oneSidedRecordsOmitted: number;
  baselineListedImpressions: number;
  comparisonListedImpressions: number;
  accountsForSitewideImpressionChange: boolean;
  losses: HistoricalImpressionRow[];
  gains: HistoricalImpressionRow[];
};

export type HistoricalSearchConsoleBreakdown = {
  pages: HistoricalDimensionComparison;
  queries: HistoricalDimensionComparison;
  messages: string[];
};

type ParsedList =
  | {
      state: "missing";
    }
  | {
      state: "empty" | "available" | "partial";
      impressions: Map<string, number>;
      malformedRecords: number;
      duplicateRecords: number;
      listedImpressions: number;
    };

function isFiniteImpression(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

export function normalizeStoredPageUrl(value: string): string {
  const trimmed = value.trim();

  try {
    const url = new URL(trimmed);
    const protocol = url.protocol.toLowerCase();
    const hostname = url.hostname.toLowerCase();
    const port = url.port ? `:${url.port}` : "";

    return `${protocol}//${hostname}${port}${url.pathname}${url.search}${url.hash}`;
  } catch {
    return trimmed;
  }
}

function parseStoredList(
  value: unknown,
  dimension: "page" | "query"
): ParsedList {
  let parsed = value;

  if (typeof parsed === "string") {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      return { state: "missing" };
    }
  }

  if (!Array.isArray(parsed)) {
    return { state: "missing" };
  }

  if (parsed.length === 0) {
    return {
      state: "empty",
      impressions: new Map(),
      malformedRecords: 0,
      duplicateRecords: 0,
      listedImpressions: 0,
    };
  }

  const impressions = new Map<string, number>();
  let malformedRecords = 0;
  let duplicateRecords = 0;
  let listedImpressions = 0;

  for (const row of parsed) {
    if (
      typeof row !== "object" ||
      row === null ||
      Array.isArray(row)
    ) {
      malformedRecords += 1;
      continue;
    }

    const label = Reflect.get(row, dimension);
    const impressionValue = Reflect.get(row, "impressions");

    if (typeof label !== "string" || label.trim() === "") {
      malformedRecords += 1;
      continue;
    }

    if (!isFiniteImpression(impressionValue)) {
      malformedRecords += 1;
      continue;
    }

    const key =
      dimension === "page"
        ? normalizeStoredPageUrl(label)
        : label;

    if (key === "") {
      malformedRecords += 1;
      continue;
    }

    if (impressions.has(key)) {
      duplicateRecords += 1;
      continue;
    }

    impressions.set(key, impressionValue);
    listedImpressions += impressionValue;
  }

  return {
    state: parsed.length >= storedSearchConsoleRowLimit
      ? "partial"
      : "available",
    impressions,
    malformedRecords,
    duplicateRecords,
    listedImpressions,
  };
}

function emptyDimension(
  baselineList: HistoricalListState,
  comparisonList: HistoricalListState,
  state: HistoricalDimensionComparison["state"]
): HistoricalDimensionComparison {
  return {
    state,
    baselineList,
    comparisonList,
    malformedRecords: 0,
    duplicateRecords: 0,
    oneSidedRecordsOmitted: 0,
    baselineListedImpressions: 0,
    comparisonListedImpressions: 0,
    accountsForSitewideImpressionChange: false,
    losses: [],
    gains: [],
  };
}

function compareDimension(
  baselineValue: unknown,
  comparisonValue: unknown,
  dimension: "page" | "query",
  sitewideBaselineImpressions: number,
  sitewideComparisonImpressions: number
): HistoricalDimensionComparison {
  const baseline = parseStoredList(baselineValue, dimension);
  const comparison = parseStoredList(comparisonValue, dimension);

  if (baseline.state === "missing" || comparison.state === "missing") {
    return emptyDimension(
      baseline.state === "missing" ? "missing" : baseline.state,
      comparison.state === "missing" ? "missing" : comparison.state,
      "missing"
    );
  }

  if (baseline.state === "empty" && comparison.state === "empty") {
    return emptyDimension("empty", "empty", "empty");
  }

  const partial =
    baseline.state === "partial" || comparison.state === "partial";
  const keys = new Set([
    ...baseline.impressions.keys(),
    ...comparison.impressions.keys(),
  ]);
  const rows: HistoricalImpressionRow[] = [];
  let oneSidedRecordsOmitted = 0;

  for (const key of keys) {
    const baselineRecorded = baseline.impressions.has(key);
    const comparisonRecorded = comparison.impressions.has(key);

    if (partial && (!baselineRecorded || !comparisonRecorded)) {
      oneSidedRecordsOmitted += 1;
      continue;
    }

    const baselineImpressions = baselineRecorded
      ? baseline.impressions.get(key) ?? 0
      : null;
    const comparisonImpressions = comparisonRecorded
      ? comparison.impressions.get(key) ?? 0
      : null;

    rows.push({
      label: key,
      baselineImpressions,
      comparisonImpressions,
      change:
        (comparisonImpressions ?? 0) - (baselineImpressions ?? 0),
    });
  }

  const byMagnitude = (
    direction: "loss" | "gain"
  ) =>
    rows
      .filter((row) =>
        direction === "loss" ? row.change < 0 : row.change > 0
      )
      .sort((left, right) => {
        const difference =
          direction === "loss"
            ? left.change - right.change
            : right.change - left.change;

        if (difference !== 0) {
          return difference;
        }

        return left.label.localeCompare(right.label);
      })
      .slice(0, historicalImpressionDisplayLimit);

  const listedBaseline = baseline.listedImpressions;
  const listedComparison = comparison.listedImpressions;
  const accountsForSitewideImpressionChange =
    dimension === "page" &&
    !partial &&
    baseline.malformedRecords === 0 &&
    comparison.malformedRecords === 0 &&
    baseline.duplicateRecords === 0 &&
    comparison.duplicateRecords === 0 &&
    listedBaseline === sitewideBaselineImpressions &&
    listedComparison === sitewideComparisonImpressions;

  return {
    state: "ready",
    baselineList: baseline.state,
    comparisonList: comparison.state,
    malformedRecords:
      baseline.malformedRecords + comparison.malformedRecords,
    duplicateRecords:
      baseline.duplicateRecords + comparison.duplicateRecords,
    oneSidedRecordsOmitted,
    baselineListedImpressions: listedBaseline,
    comparisonListedImpressions: listedComparison,
    accountsForSitewideImpressionChange,
    losses: byMagnitude("loss"),
    gains: byMagnitude("gain"),
  };
}

function dimensionMessages(
  label: "page" | "query",
  comparison: HistoricalDimensionComparison
): string[] {
  const messages: string[] = [];
  const noun = label === "page" ? "page" : "query";

  if (
    comparison.baselineList === "missing" ||
    comparison.comparisonList === "missing"
  ) {
    messages.push(
      `Historical ${noun} JSON is missing from one or both snapshots.`
    );
  }

  if (
    comparison.baselineList === "empty" ||
    comparison.comparisonList === "empty"
  ) {
    messages.push(
      `One or both stored ${noun} lists are empty.`
    );
  }

  if (
    comparison.baselineList === "partial" ||
    comparison.comparisonList === "partial"
  ) {
    messages.push(
      `A stored ${noun} list reached the 1,000-row collection limit. A ${noun} missing from that list does not prove it had zero impressions.`
    );
  }

  if (comparison.oneSidedRecordsOmitted > 0) {
    messages.push(
      `${noun === "page" ? "Pages" : "Queries"} present in only one stored list were left out of the ranking because a list reached the collection limit.`
    );
  }

  if (comparison.malformedRecords > 0) {
    messages.push(
      `Malformed ${noun} records were excluded from the ranking.`
    );
  }

  if (comparison.duplicateRecords > 0) {
    messages.push(
      `Duplicate ${noun} records were not combined.`
    );
  }

  return messages;
}

export function compareHistoricalSearchConsoleEvidence({
  baselinePages,
  comparisonPages,
  baselineQueries,
  comparisonQueries,
  baselineImpressions,
  comparisonImpressions,
}: {
  baselinePages: unknown;
  comparisonPages: unknown;
  baselineQueries: unknown;
  comparisonQueries: unknown;
  baselineImpressions: number;
  comparisonImpressions: number;
}): HistoricalSearchConsoleBreakdown {
  const pages = compareDimension(
    baselinePages,
    comparisonPages,
    "page",
    baselineImpressions,
    comparisonImpressions
  );
  const queries = compareDimension(
    baselineQueries,
    comparisonQueries,
    "query",
    baselineImpressions,
    comparisonImpressions
  );
  const messages = [
    "A change in sitewide average position does not establish that the same queries ranked higher.",
    "Stored query rows can omit searches, so their impression total may not match the sitewide total.",
    ...dimensionMessages("page", pages),
    ...dimensionMessages("query", queries),
  ];

  if (
    pages.state === "ready" &&
    !pages.accountsForSitewideImpressionChange &&
    pages.baselineList !== "partial" &&
    pages.comparisonList !== "partial" &&
    pages.baselineListedImpressions +
      pages.comparisonListedImpressions >
      0 &&
    (pages.baselineListedImpressions !== baselineImpressions ||
      pages.comparisonListedImpressions !==
        comparisonImpressions)
  ) {
    messages.push(
      "Stored page impressions do not add up to the sitewide totals."
    );
  }

  if (pages.accountsForSitewideImpressionChange) {
    messages.push(
      "The stored page rows account for the sitewide impression totals. They do not identify the cause of the change."
    );
  } else {
    messages.push(
      "These page and query changes are not a complete explanation of the sitewide impression change."
    );
  }

  return {
    pages,
    queries,
    messages,
  };
}
