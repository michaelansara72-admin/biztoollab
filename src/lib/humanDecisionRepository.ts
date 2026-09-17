import type {
  ResultSetHeader,
  RowDataPacket,
} from "mysql2";

import { db } from "@/lib/db";

export type HumanDecision =
  | "review-experiment"
  | "monitor-longer"
  | "modify"
  | "reject";

type RecommendationExistsRow =
  RowDataPacket & {
    id: number;
  };

export async function recommendationExists(
  recommendationId: number
) {
  const [rows] = await db.execute<
    RecommendationExistsRow[]
  >(
    `
      SELECT id
      FROM ai_recommendations
      WHERE id = ?
      LIMIT 1
    `,
    [recommendationId]
  );

  return rows.length === 1;
}

export async function saveHumanDecision({
  recommendationId,
  decision,
  notes,
  decidedBy = "admin",
}: {
  recommendationId: number;
  decision: HumanDecision;
  notes?: string | null;
  decidedBy?: string;
}) {
  const [result] = await db.execute<ResultSetHeader>(
    `
      INSERT INTO human_decisions (
        recommendation_id,
        decision,
        notes,
        decided_by
      )
      VALUES (?, ?, ?, ?)
    `,
    [
      recommendationId,
      decision,
      notes?.trim() || null,
      decidedBy,
    ]
  );

  return {
    id: result.insertId,
    recommendationId,
    decision,
  };
}

export type SavedHumanDecision =
  RowDataPacket & {
    id: number;
    recommendation_id: number;
    decision: HumanDecision;
    notes: string | null;
    decided_by: string;
    created_at: Date;
  };

export async function getDecisionsForRecommendation(
  recommendationId: number
): Promise<SavedHumanDecision[]> {
  const [rows] = await db.execute<
    SavedHumanDecision[]
  >(
    `
      SELECT
        id,
        recommendation_id,
        decision,
        notes,
        decided_by,
        created_at
      FROM human_decisions
      WHERE recommendation_id = ?
      ORDER BY created_at DESC, id DESC
    `,
    [recommendationId]
  );

  return rows;
}

export async function getLatestDecisionForRecommendation(
  recommendationId: number
): Promise<SavedHumanDecision | null> {
  const [rows] = await db.execute<
    SavedHumanDecision[]
  >(
    `
      SELECT
        id,
        recommendation_id,
        decision,
        notes,
        decided_by,
        created_at
      FROM human_decisions
      WHERE recommendation_id = ?
      ORDER BY created_at DESC, id DESC
      LIMIT 1
    `,
    [recommendationId]
  );

  return rows[0] ?? null;
}