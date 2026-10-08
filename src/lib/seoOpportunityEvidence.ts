import {
  createSeoEvidenceFingerprint,
  serializeSeoEvidence,
  type SeoEvidence,
  type SeoEvidencePage,
  type SeoEvidenceQuery,
} from "@/lib/seoEvidence";

export const seoEvidenceQueryRowLimit = 1000;
export const seoEvidencePageRowLimit = 1000;

export const seoEvidenceCoverageDescription =
  "Up to 1,000 query rows and 1,000 page rows are requested. Those lists are not a complete inventory. Headline totals are separate and are not limited to the listed rows.";

export type SeoEvidenceState =
  | "fresh-capture"
  | "stored-snapshot";

export type SeoEvidenceCoverage = {
  maxQueryRowsRequested: number;
  maxPageRowsRequested: number;
  queryRowsReturned: number;
  pageRowsReturned: number;
  queryAndPageListsRepresentCompleteInventory: false;
  headlineTotalsLimitedToListedRows: false;
  description: string;
};

export type SnapshotEvidenceRecord = {
  id: number;
  site_url: string;
  evidence_start: Date | string;
  evidence_end: Date | string;
  clicks: number | string;
  impressions: number | string;
  ctr: number | string;
  position: number | string;
  queries_json: string | object | null;
  pages_json: string | object | null;
  collected_at?: Date | string | null;
};

function formatDatabaseDate(value: Date | string): string {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  return String(value).slice(0, 10);
}

function invalidStoredEvidence(label: string): Error {
  return new Error(
    `Stored Search Console ${label} evidence is invalid.`
  );
}

function parseJsonArray(
  value: string | object | null,
  label: string
): unknown[] {
  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === "string") {
    let parsed: unknown;

    try {
      parsed = JSON.parse(value);
    } catch {
      throw invalidStoredEvidence(label);
    }

    if (!Array.isArray(parsed)) {
      throw invalidStoredEvidence(label);
    }

    return parsed;
  }

  throw invalidStoredEvidence(label);
}

function requireStoredMetric(
  value: unknown,
  label: string
): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();

    if (/^-?(?:\d+\.\d+|\d+)$/.test(trimmed)) {
      const parsed = Number(trimmed);

      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }

  throw new Error(
    `Stored Search Console ${label} must be a finite number.`
  );
}

function requireRowRecord(
  value: unknown,
  label: "query" | "page"
): Record<string, unknown> {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value)
  ) {
    throw invalidStoredEvidence(label);
  }

  return value as Record<string, unknown>;
}

function requireRowName(
  row: Record<string, unknown>,
  label: "query" | "page"
): string {
  const name = row[label];

  if (typeof name !== "string") {
    throw invalidStoredEvidence(label);
  }

  return name;
}

function requireRowMetrics(
  row: Record<string, unknown>,
  label: "query" | "page"
) {
  return {
    clicks: requireStoredMetric(row.clicks, `${label} clicks`),
    impressions: requireStoredMetric(
      row.impressions,
      `${label} impressions`
    ),
    ctr: requireStoredMetric(row.ctr, `${label} ctr`),
    position: requireStoredMetric(
      row.position,
      `${label} position`
    ),
  };
}

function normalizeQueries(values: unknown[]): SeoEvidenceQuery[] {
  return values.map((value) => {
    const row = requireRowRecord(value, "query");

    return {
      query: requireRowName(row, "query"),
      ...requireRowMetrics(row, "query"),
    };
  });
}

function normalizePages(values: unknown[]): SeoEvidencePage[] {
  return values.map((value) => {
    const row = requireRowRecord(value, "page");

    return {
      page: requireRowName(row, "page"),
      ...requireRowMetrics(row, "page"),
    };
  });
}

export function createEvidenceFromSnapshot(
  snapshot: SnapshotEvidenceRecord
): SeoEvidence {
  const queries = normalizeQueries(
    parseJsonArray(snapshot.queries_json, "query")
  );
  const pages = normalizePages(
    parseJsonArray(snapshot.pages_json, "page")
  );
  const clicks = requireStoredMetric(snapshot.clicks, "clicks");
  const impressions = requireStoredMetric(
    snapshot.impressions,
    "impressions"
  );
  const ctr = requireStoredMetric(snapshot.ctr, "ctr");
  const position = requireStoredMetric(
    snapshot.position,
    "position"
  );

  return {
    siteUrl: snapshot.site_url,
    period: {
      startDate: formatDatabaseDate(snapshot.evidence_start),
      endDate: formatDatabaseDate(snapshot.evidence_end),
    },
    metrics: {
      clicks,
      impressions,
      ctr,
      position,
    },
    queries,
    pages,
  };
}

export function readSnapshotCollectedAt(
  snapshot: {
    collected_at?: Date | string | null;
  }
): string | null {
  const value = snapshot.collected_at;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime())
      ? null
      : value.toISOString();
  }

  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }

  return null;
}

export function evidenceCoverageFor(
  evidence: SeoEvidence
): SeoEvidenceCoverage {
  return {
    maxQueryRowsRequested: seoEvidenceQueryRowLimit,
    maxPageRowsRequested: seoEvidencePageRowLimit,
    queryRowsReturned: evidence.queries.length,
    pageRowsReturned: evidence.pages.length,
    queryAndPageListsRepresentCompleteInventory: false,
    headlineTotalsLimitedToListedRows: false,
    description: seoEvidenceCoverageDescription,
  };
}

export function describeSeoEvidenceState({
  evidenceState,
  collectedAt,
}: {
  evidenceState: SeoEvidenceState;
  collectedAt: string | null;
}): string {
  if (evidenceState === "stored-snapshot") {
    return collectedAt
      ? `This analysis reuses a stored Search Console snapshot collected at ${collectedAt}. It is not a new Google pull.`
      : "This analysis reuses a stored Search Console snapshot. No collection timestamp was stored. It is not a new Google pull.";
  }

  return collectedAt
    ? `This analysis uses Google Search Console evidence captured for this request at ${collectedAt}.`
    : "This analysis uses Google Search Console evidence captured for this request. No collection timestamp was stored.";
}

export async function resolveSeoOpportunityEvidence<
  TSnapshot extends SnapshotEvidenceRecord,
>({
  existingSnapshot,
  captureAndSave,
}: {
  existingSnapshot: TSnapshot | null;
  captureAndSave: () => Promise<TSnapshot>;
}): Promise<{
  snapshot: TSnapshot;
  evidence: SeoEvidence;
  evidenceFingerprint: string;
  evidenceState: SeoEvidenceState;
  collectedAt: string | null;
  evidenceCoverage: SeoEvidenceCoverage;
}> {
  const evidenceState: SeoEvidenceState = existingSnapshot
    ? "stored-snapshot"
    : "fresh-capture";
  const snapshot = existingSnapshot ?? (await captureAndSave());
  const evidence = createEvidenceFromSnapshot(snapshot);

  return {
    snapshot,
    evidence,
    evidenceFingerprint: createSeoEvidenceFingerprint(evidence),
    evidenceState,
    collectedAt: readSnapshotCollectedAt(snapshot),
    evidenceCoverage: evidenceCoverageFor(evidence),
  };
}

export function seoOpportunityEvidencePrompt(
  evidence: SeoEvidence
): string {
  return `${seoEvidenceCoverageDescription}\n\n${serializeSeoEvidence(evidence)}`;
}

type SearchConsoleMetricRow = {
  keys?: string[];
  clicks?: number;
  impressions?: number;
  ctr?: number;
  position?: number;
};

export type SeoSearchConsoleQuery = (
  accessToken: string,
  startDate: string,
  endDate: string,
  dimensions?: string[],
  rowLimit?: number
) => Promise<{
  rows?: SearchConsoleMetricRow[];
}>;

export type SeoSnapshotSaveRecord = {
  siteUrl: string;
  evidenceStart: string;
  evidenceEnd: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  queries: SeoEvidenceQuery[];
  pages: SeoEvidencePage[];
};

export type SeoSnapshotPeriod = {
  siteUrl: string;
  evidenceStart: string;
  evidenceEnd: string;
};

function mapSearchConsoleQueries(
  rows: SearchConsoleMetricRow[] | undefined
): SeoEvidenceQuery[] {
  return (
    rows?.map((row) => ({
      query: row.keys?.[0] ?? "",
      clicks: row.clicks ?? 0,
      impressions: row.impressions ?? 0,
      ctr: row.ctr ?? 0,
      position: row.position ?? 0,
    })) ?? []
  );
}

function mapSearchConsolePages(
  rows: SearchConsoleMetricRow[] | undefined
): SeoEvidencePage[] {
  return (
    rows?.map((row) => ({
      page: row.keys?.[0] ?? "",
      clicks: row.clicks ?? 0,
      impressions: row.impressions ?? 0,
      ctr: row.ctr ?? 0,
      position: row.position ?? 0,
    })) ?? []
  );
}

export async function captureAndReloadSeoOpportunitySnapshot<
  TSnapshot extends SnapshotEvidenceRecord,
>({
  siteUrl,
  startDate,
  endDate,
  getAccessToken,
  querySearchConsole,
  saveSnapshot,
  reloadSnapshot,
}: {
  siteUrl: string;
  startDate: string;
  endDate: string;
  getAccessToken: () => Promise<string>;
  querySearchConsole: SeoSearchConsoleQuery;
  saveSnapshot: (
    record: SeoSnapshotSaveRecord
  ) => Promise<{ id: number }>;
  reloadSnapshot: (
    period: SeoSnapshotPeriod
  ) => Promise<TSnapshot | null>;
}): Promise<TSnapshot> {
  const accessToken = await getAccessToken();
  const [totalsData, queriesData, pagesData] =
    await Promise.all([
      querySearchConsole(accessToken, startDate, endDate),
      querySearchConsole(
        accessToken,
        startDate,
        endDate,
        ["query"],
        seoEvidenceQueryRowLimit
      ),
      querySearchConsole(
        accessToken,
        startDate,
        endDate,
        ["page"],
        seoEvidencePageRowLimit
      ),
    ]);

  const totals = totalsData.rows?.[0] ?? {
    clicks: 0,
    impressions: 0,
    ctr: 0,
    position: 0,
  };
  const queries = mapSearchConsoleQueries(queriesData.rows);
  const pages = mapSearchConsolePages(pagesData.rows);
  const saved = await saveSnapshot({
    siteUrl,
    evidenceStart: startDate,
    evidenceEnd: endDate,
    clicks: totals.clicks ?? 0,
    impressions: totals.impressions ?? 0,
    ctr: totals.ctr ?? 0,
    position: totals.position ?? 0,
    queries,
    pages,
  });
  const stored = await reloadSnapshot({
    siteUrl,
    evidenceStart: startDate,
    evidenceEnd: endDate,
  });

  if (!stored || stored.id !== saved.id) {
    throw new Error(
      "Saved Search Console snapshot could not be verified."
    );
  }

  return stored;
}

export async function resolveAdminSeoOpportunityEvidence<
  TSnapshot extends SnapshotEvidenceRecord,
>({
  siteUrl,
  startDate,
  endDate,
  loadExistingSnapshot,
  getAccessToken,
  querySearchConsole,
  saveSnapshot,
  reloadSnapshot,
}: {
  siteUrl: string;
  startDate: string;
  endDate: string;
  loadExistingSnapshot: () => Promise<TSnapshot | null>;
  getAccessToken: () => Promise<string>;
  querySearchConsole: SeoSearchConsoleQuery;
  saveSnapshot: (
    record: SeoSnapshotSaveRecord
  ) => Promise<{ id: number }>;
  reloadSnapshot: (
    period: SeoSnapshotPeriod
  ) => Promise<TSnapshot | null>;
}) {
  const existingSnapshot = await loadExistingSnapshot();

  return resolveSeoOpportunityEvidence({
    existingSnapshot,
    captureAndSave: () =>
      captureAndReloadSeoOpportunitySnapshot({
        siteUrl,
        startDate,
        endDate,
        getAccessToken,
        querySearchConsole,
        saveSnapshot,
        reloadSnapshot,
      }),
  });
}
