import type {
  ResultSetHeader,
  RowDataPacket,
} from "mysql2";

import { db } from "@/lib/db";

export type ExperimentStatus =
  | "draft"
  | "ready-for-review"
  | "approved"
  | "rejected";

export type ExperimentRecord = {
  recommendationId: number;
  sourceDecisionId: number;

  title: string;

  hypothesis: string;
  proposedChange: string;
  controlDescription?: string | null;

  successMetric: string;
  baselineValue?: string | null;
  targetValue?: string | null;

  status?: ExperimentStatus;
  createdBy?: string;
};

export type SavedExperiment =
  RowDataPacket & {
    id: number;

    recommendation_id: number;
    source_decision_id: number;

    title: string;

    hypothesis: string;
    proposed_change: string;
    control_description: string | null;

    success_metric: string;
    baseline_value: string | null;
    target_value: string | null;

    status: ExperimentStatus;
    created_by: string;

    created_at: Date;
    updated_at: Date;
  };

function requirePositiveSafeInteger(
  value: number,
  fieldName: string
) {
  if (
    !Number.isSafeInteger(value) ||
    value <= 0
  ) {
    throw new Error(
      `${fieldName} must be a positive safe integer.`
    );
  }
}

function requireText(
  value: string,
  fieldName: string
) {
  if (!value.trim()) {
    throw new Error(
      `${fieldName} is required.`
    );
  }
}

export async function saveExperiment(
  record: ExperimentRecord
) {
  requirePositiveSafeInteger(
    record.recommendationId,
    "recommendationId"
  );

  requirePositiveSafeInteger(
    record.sourceDecisionId,
    "sourceDecisionId"
  );

  requireText(record.title, "title");
  requireText(record.hypothesis, "hypothesis");
  requireText(
    record.proposedChange,
    "proposedChange"
  );
  requireText(
    record.successMetric,
    "successMetric"
  );

  const status =
    record.status ?? "draft";

  const createdBy =
    record.createdBy?.trim() || "admin";

  const [result] =
    await db.execute<ResultSetHeader>(
      `
        INSERT INTO experiments (
          recommendation_id,
          source_decision_id,
          title,
          hypothesis,
          proposed_change,
          control_description,
          success_metric,
          baseline_value,
          target_value,
          status,
          created_by
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        record.recommendationId,
        record.sourceDecisionId,
        record.title.trim(),
        record.hypothesis.trim(),
        record.proposedChange.trim(),
        record.controlDescription?.trim() || null,
        record.successMetric.trim(),
        record.baselineValue?.trim() || null,
        record.targetValue?.trim() || null,
        status,
        createdBy,
      ]
    );

  return {
    id: result.insertId,
  };
}

export async function getExperimentById(
  experimentId: number
): Promise<SavedExperiment | null> {
  if (
    !Number.isSafeInteger(experimentId) ||
    experimentId <= 0
  ) {
    return null;
  }

  const [rows] = await db.execute<
    SavedExperiment[]
  >(
    `
      SELECT *
      FROM experiments
      WHERE id = ?
      LIMIT 1
    `,
    [experimentId]
  );

  return rows[0] ?? null;
}

export async function getExperimentsForRecommendation(
  recommendationId: number
): Promise<SavedExperiment[]> {
  if (
    !Number.isSafeInteger(recommendationId) ||
    recommendationId <= 0
  ) {
    return [];
  }

  const [rows] = await db.execute<
    SavedExperiment[]
  >(
    `
      SELECT *
      FROM experiments
      WHERE recommendation_id = ?
      ORDER BY created_at DESC, id DESC
    `,
    [recommendationId]
  );

  return rows;
}

export async function getLatestExperimentForRecommendation(
  recommendationId: number
): Promise<SavedExperiment | null> {
  if (
    !Number.isSafeInteger(recommendationId) ||
    recommendationId <= 0
  ) {
    return null;
  }

  const [rows] = await db.execute<
    SavedExperiment[]
  >(
    `
      SELECT *
      FROM experiments
      WHERE recommendation_id = ?
      ORDER BY created_at DESC, id DESC
      LIMIT 1
    `,
    [recommendationId]
  );

  return rows[0] ?? null;
}
