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

export type ImplementationPlanStatusTransitionResult = {
  implementationPlanId: number;
  previousStatus: ImplementationPlanStatus;
  status: ImplementationPlanStatus;
};

const allowedImplementationPlanStatusTransitions: Record<
  ImplementationPlanStatus,
  readonly ImplementationPlanStatus[]
> = {
  draft: ["ready-for-review"],
  "ready-for-review": ["authorized", "rejected"],
  authorized: [],
  rejected: [],
};

export function canTransitionImplementationPlanStatus(
  currentStatus: ImplementationPlanStatus,
  nextStatus: ImplementationPlanStatus
) {
  return allowedImplementationPlanStatusTransitions[
    currentStatus
  ].includes(nextStatus);
}

export const implementationPlanStatusTransitionSql = `
  UPDATE implementation_plans
  SET status = ?
  WHERE id = ?
    AND status = ?
    AND production_authorized = FALSE
`;

export function getImplementationPlanStatusTransitionRejection({
  currentStatus,
  nextStatus,
  productionAuthorized,
}: {
  currentStatus: ImplementationPlanStatus;
  nextStatus: ImplementationPlanStatus;
  productionAuthorized: boolean;
}): string | null {
  if (productionAuthorized) {
    return "An implementation plan with production authorization cannot be transitioned by this review action.";
  }

  if (currentStatus === nextStatus) {
    return null;
  }

  if (
    !canTransitionImplementationPlanStatus(
      currentStatus,
      nextStatus
    )
  ) {
    return `Invalid implementation plan status transition: ${currentStatus} -> ${nextStatus}.`;
  }

  return null;
}

export function assertImplementationPlanStatusTransitionApplied(
  affectedRows: number
) {
  if (affectedRows !== 1) {
    throw new Error(
      "Implementation plan status changed before this transition could be completed."
    );
  }
}

export const implementationPlanAuditActorType =
  "authenticated-admin" as const;

export const implementationPlanAuditInsertSql = `
  INSERT INTO implementation_plan_audit (
    implementation_plan_id,
    previous_status,
    next_status,
    actor_type
  )
  VALUES (?, ?, ?, ?)
`;

export function assertImplementationPlanAuditRecorded(
  affectedRows: number
) {
  if (affectedRows !== 1) {
    throw new Error(
      "Implementation plan status transition audit record was not created."
    );
  }
}

export type ImplementationPlanTransitionConnection = {
  execute: (
    sql: string,
    values: readonly (string | number)[]
  ) => Promise<
    readonly [
      {
        affectedRows: number;
      },
      unknown,
    ]
  >;

  beginTransaction: () => Promise<void>;

  commit: () => Promise<void>;

  rollback: () => Promise<void>;

  release: () => void;
};

export type ImplementationPlanTransitionDependencies = {
  loadImplementationPlan: (
    implementationPlanId: number
  ) => Promise<SavedImplementationPlan | null>;

  acquireConnection: () => Promise<ImplementationPlanTransitionConnection>;
};

async function acquireImplementationPlanTransitionConnection(): Promise<ImplementationPlanTransitionConnection> {
  const connection =
    await db.getConnection();

  return {
    execute: (sql, values) =>
      connection.execute<ResultSetHeader>(
        sql,
        [...values]
      ),

    beginTransaction: () =>
      connection.beginTransaction(),

    commit: () =>
      connection.commit(),

    rollback: () =>
      connection.rollback(),

    release: () => {
      connection.release();
    },
  };
}

const defaultImplementationPlanTransitionDependencies: ImplementationPlanTransitionDependencies =
  {
    loadImplementationPlan:
      getImplementationPlanById,

    acquireConnection:
      acquireImplementationPlanTransitionConnection,
  };

function isProductionAuthorized(
  value: SavedImplementationPlan["production_authorized"]
) {
  return Boolean(value);
}

export async function transitionImplementationPlanStatus(
  {
    implementationPlanId,
    nextStatus,
  }: {
    implementationPlanId: number;
    nextStatus: ImplementationPlanStatus;
  },
  dependencies: ImplementationPlanTransitionDependencies =
    defaultImplementationPlanTransitionDependencies
): Promise<ImplementationPlanStatusTransitionResult> {
  requirePositiveSafeInteger(
    implementationPlanId,
    "implementationPlanId"
  );

  const implementationPlan =
    await dependencies.loadImplementationPlan(
      implementationPlanId
    );

  if (!implementationPlan) {
    throw new Error(
      "Implementation plan not found."
    );
  }

  const previousStatus =
    implementationPlan.status;

  if (previousStatus === nextStatus) {
    throw new Error(
      `Implementation plan #${implementationPlanId} is already ${nextStatus}.`
    );
  }

  const rejection =
    getImplementationPlanStatusTransitionRejection({
      currentStatus: previousStatus,
      nextStatus,
      productionAuthorized: isProductionAuthorized(
        implementationPlan.production_authorized
      ),
    });

  if (rejection) {
    throw new Error(rejection);
  }

  const connection =
    await dependencies.acquireConnection();

  try {
    await connection.beginTransaction();

    const [updateResult] =
      await connection.execute(
        implementationPlanStatusTransitionSql,
        [
          nextStatus,
          implementationPlanId,
          previousStatus,
        ]
      );

    assertImplementationPlanStatusTransitionApplied(
      updateResult.affectedRows
    );

    const [auditResult] =
      await connection.execute(
        implementationPlanAuditInsertSql,
        [
          implementationPlanId,
          previousStatus,
          nextStatus,
          implementationPlanAuditActorType,
        ]
      );

    assertImplementationPlanAuditRecorded(
      auditResult.affectedRows
    );

    await connection.commit();
  } catch (error) {
    try {
      await connection.rollback();
    } catch (rollbackError) {
      console.error(
        "Failed to roll back implementation plan status transition:",
        rollbackError
      );
    }

    throw error;
  } finally {
    connection.release();
  }

  return {
    implementationPlanId,
    previousStatus,
    status: nextStatus,
  };
}