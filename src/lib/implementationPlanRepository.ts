import type {
  ResultSetHeader,
  RowDataPacket,
} from "mysql2";

import { db } from "@/lib/db";

import {
  getExperimentById,
} from "@/lib/experimentRepository";

export type ImplementationPlanStatus =
  | "draft"
  | "ready-for-review"
  | "authorized"
  | "rejected";

export type ImplementationPlanRecord = {
  experimentId: number;
  recommendationId: number;

  title: string;

  targetPath: string;

  proposedChanges: string;

  protectedElements: string;

  measurementPlan: string;

  rollbackPlan: string;

  createdBy?: string;
};

export type SavedImplementationPlan =
  RowDataPacket & {
    id: number;

    experiment_id: number;
    recommendation_id: number;

    title: string;

    target_path: string;

    proposed_changes: string;

    protected_elements: string;

    measurement_plan: string;

    rollback_plan: string;

    status: ImplementationPlanStatus;

    production_authorized:
      | boolean
      | number;

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

export async function saveImplementationPlan(
  record: ImplementationPlanRecord
) {
  requirePositiveSafeInteger(
    record.experimentId,
    "experimentId"
  );

  requirePositiveSafeInteger(
    record.recommendationId,
    "recommendationId"
  );

  requireText(
    record.title,
    "title"
  );

  requireText(
    record.targetPath,
    "targetPath"
  );

  requireText(
    record.proposedChanges,
    "proposedChanges"
  );

  requireText(
    record.protectedElements,
    "protectedElements"
  );

  requireText(
    record.measurementPlan,
    "measurementPlan"
  );

  requireText(
    record.rollbackPlan,
    "rollbackPlan"
  );

  const experiment =
    await getExperimentById(
      record.experimentId
    );

  if (!experiment) {
    throw new Error(
      "Experiment not found."
    );
  }

  if (
    experiment.recommendation_id !==
    record.recommendationId
  ) {
    throw new Error(
      "The implementation plan recommendation does not match the experiment recommendation."
    );
  }

  if (experiment.status !== "approved") {
    throw new Error(
      "Only an approved experiment can create an implementation plan."
    );
  }

  const createdBy =
    record.createdBy?.trim() ||
    "admin";

  const [result] =
    await db.execute<ResultSetHeader>(
      `
        INSERT INTO implementation_plans (
          experiment_id,
          recommendation_id,
          title,
          target_path,
          proposed_changes,
          protected_elements,
          measurement_plan,
          rollback_plan,
          status,
          production_authorized,
          created_by
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        record.experimentId,
        record.recommendationId,
        record.title.trim(),
        record.targetPath.trim(),
        record.proposedChanges.trim(),
        record.protectedElements.trim(),
        record.measurementPlan.trim(),
        record.rollbackPlan.trim(),

        "draft",
        false,

        createdBy,
      ]
    );

  return {
    id: result.insertId,
  };
}

export async function getImplementationPlanById(
  planId: number
): Promise<SavedImplementationPlan | null> {
  if (
    !Number.isSafeInteger(planId) ||
    planId <= 0
  ) {
    return null;
  }

  const [rows] = await db.execute<
    SavedImplementationPlan[]
  >(
    `
      SELECT *
      FROM implementation_plans
      WHERE id = ?
      LIMIT 1
    `,
    [planId]
  );

  return rows[0] ?? null;
}

export async function getImplementationPlansForExperiment(
  experimentId: number
): Promise<SavedImplementationPlan[]> {
  if (
    !Number.isSafeInteger(experimentId) ||
    experimentId <= 0
  ) {
    return [];
  }

  const [rows] = await db.execute<
    SavedImplementationPlan[]
  >(
    `
      SELECT *
      FROM implementation_plans
      WHERE experiment_id = ?
      ORDER BY created_at DESC, id DESC
    `,
    [experimentId]
  );

  return rows;
}

export async function getLatestImplementationPlanForExperiment(
  experimentId: number
): Promise<SavedImplementationPlan | null> {
  if (
    !Number.isSafeInteger(experimentId) ||
    experimentId <= 0
  ) {
    return null;
  }

  const [rows] = await db.execute<
    SavedImplementationPlan[]
  >(
    `
      SELECT *
      FROM implementation_plans
      WHERE experiment_id = ?
      ORDER BY created_at DESC, id DESC
      LIMIT 1
    `,
    [experimentId]
  );

  return rows[0] ?? null;
}

export async function getImplementationPlansForRecommendation(
  recommendationId: number
): Promise<SavedImplementationPlan[]> {
  if (
    !Number.isSafeInteger(
      recommendationId
    ) ||
    recommendationId <= 0
  ) {
    return [];
  }

  const [rows] = await db.execute<
    SavedImplementationPlan[]
  >(
    `
      SELECT *
      FROM implementation_plans
      WHERE recommendation_id = ?
      ORDER BY created_at DESC, id DESC
    `,
    [recommendationId]
  );

  return rows;
}