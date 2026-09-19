import type {
  ResultSetHeader,
  RowDataPacket,
} from "mysql2";

import { db } from "@/lib/db";

export type SearchConsoleSnapshotRecord = {
  siteUrl: string;

  evidenceStart: string;
  evidenceEnd: string;

  clicks: number;
  impressions: number;
  ctr: number;
  position: number;

  queries: unknown[];
  pages: unknown[];
};

export type SavedSearchConsoleSnapshot =
  RowDataPacket & {
    id: number;

    site_url: string;

    evidence_start: Date | string;
    evidence_end: Date | string;

    clicks: number;
    impressions: number;
    ctr: number;
    position: number;

    queries_json: string | object | null;
    pages_json: string | object | null;

    collected_at: Date;
    created_at: Date;
  };

export async function saveSearchConsoleSnapshot(
  record: SearchConsoleSnapshotRecord
) {
  const [result] = await db.execute<ResultSetHeader>(
    `
      INSERT INTO search_console_snapshots (
        site_url,
        evidence_start,
        evidence_end,
        clicks,
        impressions,
        ctr,
        position,
        queries_json,
        pages_json
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      record.siteUrl,
      record.evidenceStart,
      record.evidenceEnd,
      record.clicks,
      record.impressions,
      record.ctr,
      record.position,
      JSON.stringify(record.queries),
      JSON.stringify(record.pages),
    ]
  );

  return {
    id: result.insertId,
  };
}

export async function getSnapshotByPeriod({
  siteUrl,
  evidenceStart,
  evidenceEnd,
}: {
  siteUrl: string;
  evidenceStart: string;
  evidenceEnd: string;
}): Promise<SavedSearchConsoleSnapshot | null> {
  const [rows] = await db.execute<
    SavedSearchConsoleSnapshot[]
  >(
    `
      SELECT *
      FROM search_console_snapshots
      WHERE site_url = ?
        AND evidence_start = ?
        AND evidence_end = ?
      LIMIT 1
    `,
    [
      siteUrl,
      evidenceStart,
      evidenceEnd,
    ]
  );

  return rows[0] ?? null;
}

export async function getLatestSearchConsoleSnapshot():
  Promise<SavedSearchConsoleSnapshot | null> {
  const [rows] = await db.execute<
    SavedSearchConsoleSnapshot[]
  >(
    `
      SELECT *
      FROM search_console_snapshots
      ORDER BY evidence_end DESC, id DESC
      LIMIT 1
    `
  );

  return rows[0] ?? null;
}

export async function getSearchConsoleSnapshots(
  limit = 20
): Promise<SavedSearchConsoleSnapshot[]> {
  const safeLimit = Math.max(
    1,
    Math.min(100, Math.floor(limit))
  );

  const [rows] = await db.query<
    SavedSearchConsoleSnapshot[]
  >(
    `
      SELECT *
      FROM search_console_snapshots
      ORDER BY evidence_end DESC, id DESC
      LIMIT ${safeLimit}
    `
  );

  return rows;
}

export async function getSearchConsoleSnapshotById(
  id: number
): Promise<SavedSearchConsoleSnapshot | null> {
  if (!Number.isSafeInteger(id) || id <= 0) {
    return null;
  }

  const [rows] = await db.execute<
    SavedSearchConsoleSnapshot[]
  >(
    `
      SELECT *
      FROM search_console_snapshots
      WHERE id = ?
      LIMIT 1
    `,
    [id]
  );

  return rows[0] ?? null;
}