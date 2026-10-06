import { pathToFileURL } from "node:url";

import { createMigrationConnection } from "./migrationConnection.mjs";

export const implementationPlanExperimentUniqueIndexName =
  "uq_implementation_plans_experiment_id";

export const implementationPlanTableLookupSql = `
  SHOW TABLES
  LIKE 'implementation_plans'
`;

export const implementationPlanIndexInspectionSql = `
  SELECT
    INDEX_NAME AS index_name,
    NON_UNIQUE AS non_unique,
    SEQ_IN_INDEX AS seq_in_index,
    COLUMN_NAME AS column_name
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'implementation_plans'
  ORDER BY INDEX_NAME, SEQ_IN_INDEX
`;

export const duplicateImplementationPlanExperimentSql = `
  SELECT experiment_id
  FROM implementation_plans
  GROUP BY experiment_id
  HAVING COUNT(*) > 1
`;

export const implementationPlanIdsForExperimentSql = `
  SELECT id
  FROM implementation_plans
  WHERE experiment_id = ?
  ORDER BY id
`;

export const addImplementationPlanExperimentUniqueSql = `
  ALTER TABLE implementation_plans
    ADD UNIQUE INDEX ${implementationPlanExperimentUniqueIndexName} (
      experiment_id
    )
`;

export function hasExactExperimentIdUniqueIndex(rows) {
  const indexes = new Map();

  for (const row of rows ?? []) {
    const indexName = String(row.index_name);
    const columns = indexes.get(indexName) ?? [];

    columns.push({
      sequence: Number(row.seq_in_index),
      columnName: String(row.column_name),
      nonUnique: Number(row.non_unique),
    });

    indexes.set(indexName, columns);
  }

  for (const columns of indexes.values()) {
    const ordered = [...columns].sort(
      (left, right) => left.sequence - right.sequence
    );
    const columnNames = ordered.map(
      (column) => column.columnName.toLowerCase()
    );

    if (
      ordered.every((column) => column.nonUnique === 0) &&
      columnNames.length === 1 &&
      columnNames[0] === "experiment_id"
    ) {
      return true;
    }
  }

  return false;
}

function duplicatePlanReport(experimentId, planIds) {
  const planList =
    planIds.length > 0
      ? planIds.join(", ")
      : "(none read)";

  return `experiment_id ${experimentId}: implementation plan id(s) ${planList}`;
}

export async function applyImplementationPlanExperimentUniqueIndex(
  connection
) {
  const [tables] = await connection.query(
    implementationPlanTableLookupSql
  );

  if (!Array.isArray(tables) || tables.length !== 1) {
    throw new Error(
      "implementation_plans table does not exist. Apply migration 007 before adding the experiment uniqueness constraint."
    );
  }

  const [existingIndexes] = await connection.query(
    implementationPlanIndexInspectionSql
  );

  if (hasExactExperimentIdUniqueIndex(existingIndexes)) {
    console.log(
      "[PASS] A unique index on experiment_id already exists."
    );
    console.log(
      "[PASS] implementation_plans was not altered."
    );

    return {
      status: "already-present",
    };
  }

  const [duplicateExperiments] = await connection.query(
    duplicateImplementationPlanExperimentSql
  );

  if (
    Array.isArray(duplicateExperiments) &&
    duplicateExperiments.length > 0
  ) {
    const reports = [];

    for (const duplicate of duplicateExperiments) {
      const [plans] = await connection.execute(
        implementationPlanIdsForExperimentSql,
        [duplicate.experiment_id]
      );

      const planIds = Array.isArray(plans)
        ? plans.map((plan) => plan.id)
        : [];

      reports.push(
        duplicatePlanReport(
          duplicate.experiment_id,
          planIds
        )
      );
    }

    throw new Error(
      "Duplicate implementation plans exist. Migration 009 did not alter implementation_plans. " +
        reports.join("; ")
    );
  }

  await connection.execute(
    addImplementationPlanExperimentUniqueSql
  );

  const [verifiedIndexes] = await connection.query(
    implementationPlanIndexInspectionSql
  );

  const namedIndexExists = (verifiedIndexes ?? []).some(
    (row) =>
      String(row.index_name) ===
      implementationPlanExperimentUniqueIndexName
  );

  if (
    !namedIndexExists ||
    !hasExactExperimentIdUniqueIndex(verifiedIndexes)
  ) {
    throw new Error(
      "Unique index uq_implementation_plans_experiment_id could not be verified."
    );
  }

  console.log(
    "[PASS] Unique index uq_implementation_plans_experiment_id is present."
  );

  return {
    status: "added",
  };
}

function isExecutedAsScript() {
  const entry = process.argv[1];

  if (!entry) {
    return false;
  }

  return import.meta.url === pathToFileURL(entry).href;
}

async function main() {
  const connection = await createMigrationConnection();

  try {
    console.log(
      "=============================================="
    );
    console.log(
      " BIZTOOLLAB IMPLEMENTATION PLAN EXPERIMENT UNIQUE"
    );
    console.log(
      "=============================================="
    );

    await applyImplementationPlanExperimentUniqueIndex(
      connection
    );
  } finally {
    await connection.end();
  }
}

if (isExecutedAsScript()) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
