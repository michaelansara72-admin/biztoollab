import type {
  ResultSetHeader,
  RowDataPacket,
} from "mysql2";

import { db } from "@/lib/db";

export type RecommendationSnapshotRelationship =
  | "analysis-time"
  | "historical-reconstruction";

export type LinkedRecommendationSnapshot =
  RowDataPacket & {
    link_id: number;
    recommendation_id: number;
    snapshot_id: number;

    relationship_type:
      RecommendationSnapshotRelationship;

    notes: string | null;
    linked_at: Date;

    site_url: string;
    evidence_start: Date | string;
    evidence_end: Date | string;

    clicks: string | number;
    impressions: string | number;
    ctr: string | number;
    position: string | number;

    collected_at: Date;
  };

export async function saveRecommendationSnapshotLink({
  recommendationId,
  snapshotId,
  relationshipType,
  notes = null,
}: {
  recommendationId: number;
  snapshotId: number;
  relationshipType:
    RecommendationSnapshotRelationship;
  notes?: string | null;
}) {
  if (
    !Number.isSafeInteger(recommendationId) ||
    recommendationId <= 0
  ) {
    throw new Error(
      "recommendationId must be a positive safe integer."
    );
  }

  if (
    !Number.isSafeInteger(snapshotId) ||
    snapshotId <= 0
  ) {
    throw new Error(
      "snapshotId must be a positive safe integer."
    );
  }

  const [result] =
    await db.execute<ResultSetHeader>(
      `
        INSERT INTO recommendation_snapshot_links (
          recommendation_id,
          snapshot_id,
          relationship_type,
          notes
        )
        VALUES (?, ?, ?, ?)
      `,
      [
        recommendationId,
        snapshotId,
        relationshipType,
        notes?.trim() || null,
      ]
    );

  return {
    id: result.insertId,
    recommendationId,
    snapshotId,
    relationshipType,
  };
}

export async function getSnapshotsForRecommendation(
  recommendationId: number
): Promise<LinkedRecommendationSnapshot[]> {
  const [rows] = await db.execute<
    LinkedRecommendationSnapshot[]
  >(
    `
      SELECT
        links.id AS link_id,
        links.recommendation_id,
        links.snapshot_id,
        links.relationship_type,
        links.notes,
        links.created_at AS linked_at,

        snapshots.site_url,
        snapshots.evidence_start,
        snapshots.evidence_end,
        snapshots.clicks,
        snapshots.impressions,
        snapshots.ctr,
        snapshots.position,
        snapshots.collected_at

      FROM recommendation_snapshot_links AS links

      INNER JOIN search_console_snapshots AS snapshots
        ON snapshots.id = links.snapshot_id

      WHERE links.recommendation_id = ?

      ORDER BY snapshots.collected_at DESC,
               links.id DESC
    `,
    [recommendationId]
  );

  return rows;
}