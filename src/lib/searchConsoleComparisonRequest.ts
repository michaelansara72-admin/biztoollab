import {
  compareSearchConsoleSnapshots,
  type ComparisonResult,
  type ComparisonSnapshot,
} from "./searchConsoleComparison";

export type SnapshotRecord = {
  site_url: string;
  evidence_start: Date | string;
  evidence_end: Date | string;
  clicks: number | string;
  impressions: number | string;
  ctr: number | string;
  position: number | string;
};

export type SnapshotIdResult =
  | {
      valid: true;
      baselineId: number;
      comparisonId: number;
    }
  | {
      valid: false;
      reason: string;
    };

export function parseSnapshotIds(
  baselineParam: string | null,
  comparisonParam: string | null
): SnapshotIdResult {
  if (
    !baselineParam ||
    !comparisonParam ||
    !/^[1-9]\d*$/.test(baselineParam) ||
    !/^[1-9]\d*$/.test(comparisonParam)
  ) {
    return {
      valid: false,
      reason: "Two valid snapshot IDs are required.",
    };
  }

  const baselineId = Number(baselineParam);
  const comparisonId = Number(comparisonParam);

  if (
    !Number.isSafeInteger(baselineId) ||
    !Number.isSafeInteger(comparisonId) ||
    baselineId === comparisonId
  ) {
    return {
      valid: false,
      reason: "Two distinct, valid snapshot IDs are required.",
    };
  }

  return {
    valid: true,
    baselineId,
    comparisonId,
  };
}

function formatDatabaseDate(value: Date | string): string {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  return String(value).slice(0, 10);
}

export function toComparisonSnapshot(
  record: SnapshotRecord
): ComparisonSnapshot {
  return {
    siteUrl: record.site_url,
    evidenceStart: formatDatabaseDate(record.evidence_start),
    evidenceEnd: formatDatabaseDate(record.evidence_end),
    clicks: Number(record.clicks),
    impressions: Number(record.impressions),
    ctr: Number(record.ctr),
    position: Number(record.position),
  };
}

export function compareStoredSnapshots(
  baseline: SnapshotRecord,
  comparison: SnapshotRecord
): ComparisonResult {
  return compareSearchConsoleSnapshots(
    toComparisonSnapshot(baseline),
    toComparisonSnapshot(comparison)
  );
}