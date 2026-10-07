import { pathToFileURL } from "node:url";

import { createMigrationConnection } from "./migrationConnection.mjs";
import { hasExactExperimentIdUniqueIndex } from "./009-add-implementation-plan-experiment-unique.mjs";

export const selectedDatabaseSql = `
  SELECT DATABASE() AS database_name
`;

export const governanceColumnsSql = `
  SELECT
    TABLE_NAME AS table_name,
    COLUMN_NAME AS column_name,
    DATA_TYPE AS data_type,
    COLUMN_TYPE AS column_type,
    CHARACTER_MAXIMUM_LENGTH AS character_maximum_length,
    IS_NULLABLE AS is_nullable,
    COLUMN_DEFAULT AS column_default,
    EXTRA AS extra
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME IN (
      'ai_recommendations',
      'experiments',
      'implementation_plans',
      'implementation_plan_audit'
    )
`;

export const governanceIndexesSql = `
  SELECT
    TABLE_NAME AS table_name,
    INDEX_NAME AS index_name,
    NON_UNIQUE AS non_unique,
    SEQ_IN_INDEX AS seq_in_index,
    COLUMN_NAME AS column_name
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME IN (
      'experiments',
      'implementation_plans',
      'implementation_plan_audit'
    )
`;

export const governanceForeignKeysSql = `
  SELECT
    kcu.TABLE_NAME AS table_name,
    kcu.CONSTRAINT_NAME AS constraint_name,
    kcu.COLUMN_NAME AS column_name,
    kcu.REFERENCED_TABLE_NAME AS referenced_table_name,
    kcu.REFERENCED_COLUMN_NAME AS referenced_column_name,
    rc.DELETE_RULE AS removal_rule,
    rc.UPDATE_RULE AS parent_rule
  FROM information_schema.KEY_COLUMN_USAGE AS kcu
  INNER JOIN information_schema.REFERENTIAL_CONSTRAINTS AS rc
    ON rc.CONSTRAINT_SCHEMA = kcu.CONSTRAINT_SCHEMA
   AND rc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME
   AND rc.TABLE_NAME = kcu.TABLE_NAME
  WHERE kcu.TABLE_SCHEMA = DATABASE()
    AND kcu.REFERENCED_TABLE_NAME IS NOT NULL
    AND kcu.TABLE_NAME IN (
      'experiments',
      'implementation_plans',
      'implementation_plan_audit'
    )
`;

export const duplicateImplementationPlansSql = `
  SELECT experiment_id
  FROM implementation_plans
  GROUP BY experiment_id
  HAVING COUNT(*) > 1
`;

export const implementationPlanIdsSql = `
  SELECT id
  FROM implementation_plans
  WHERE experiment_id = ?
  ORDER BY id
`;

const experimentStatusType =
  "enum('draft','ready-for-review','approved','rejected')";

const planStatusType =
  "enum('draft','ready-for-review','authorized','rejected')";

const actorType = "enum('authenticated-admin')";

const experimentsSpec = {
  table: "experiments",
  columns: [
    { name: "id", dataType: "bigint", unsigned: true, autoIncrement: true },
    { name: "recommendation_id", dataType: "bigint", unsigned: true },
    { name: "source_decision_id", dataType: "bigint", unsigned: true },
    { name: "title", dataType: "varchar", length: 255 },
    { name: "hypothesis", dataType: "text" },
    { name: "proposed_change", dataType: "text" },
    { name: "control_description", dataType: "text", nullable: true },
    { name: "success_metric", dataType: "text" },
    { name: "baseline_value", dataType: "varchar", length: 255, nullable: true },
    { name: "target_value", dataType: "varchar", length: 255, nullable: true },
    {
      name: "status",
      dataType: "enum",
      enumType: experimentStatusType,
      defaultValue: "draft",
    },
    {
      name: "created_by",
      dataType: "varchar",
      length: 100,
      defaultValue: "admin",
    },
    { name: "created_at", dataType: "timestamp", timestampDefault: true },
    {
      name: "updated_at",
      dataType: "timestamp",
      timestampDefault: true,
      onUpdate: true,
    },
  ],
  indexes: [
    { name: "PRIMARY", columns: ["id"], unique: true },
    { name: "idx_experiments_recommendation_id", columns: ["recommendation_id"] },
    {
      name: "idx_experiments_source_decision_id",
      columns: ["source_decision_id"],
    },
    { name: "idx_experiments_status", columns: ["status"] },
    { name: "idx_experiments_created_at", columns: ["created_at"] },
  ],
  foreignKeys: [
    {
      name: "fk_experiments_recommendation",
      column: "recommendation_id",
      referencedTable: "ai_recommendations",
      referencedColumn: "id",
      removal: "CASCADE",
      parent: "CASCADE",
    },
    {
      name: "fk_experiments_source_decision",
      column: "source_decision_id",
      referencedTable: "human_decisions",
      referencedColumn: "id",
      removal: "RESTRICT",
      parent: "CASCADE",
    },
  ],
};

const implementationPlansSpec = {
  table: "implementation_plans",
  columns: [
    { name: "id", dataType: "bigint", unsigned: true, autoIncrement: true },
    { name: "experiment_id", dataType: "bigint", unsigned: true },
    { name: "recommendation_id", dataType: "bigint", unsigned: true },
    { name: "title", dataType: "varchar", length: 255 },
    { name: "target_path", dataType: "varchar", length: 500 },
    { name: "proposed_changes", dataType: "text" },
    { name: "protected_elements", dataType: "text" },
    { name: "measurement_plan", dataType: "text" },
    { name: "rollback_plan", dataType: "text" },
    {
      name: "status",
      dataType: "enum",
      enumType: planStatusType,
      defaultValue: "draft",
    },
    { name: "production_authorized", booleanFalse: true },
    {
      name: "created_by",
      dataType: "varchar",
      length: 100,
      defaultValue: "admin",
    },
    { name: "created_at", dataType: "timestamp", timestampDefault: true },
    {
      name: "updated_at",
      dataType: "timestamp",
      timestampDefault: true,
      onUpdate: true,
    },
  ],
  indexes: [
    { name: "PRIMARY", columns: ["id"], unique: true },
    {
      name: "idx_implementation_plans_experiment_id",
      columns: ["experiment_id"],
    },
    {
      name: "idx_implementation_plans_recommendation_id",
      columns: ["recommendation_id"],
    },
    { name: "idx_implementation_plans_status", columns: ["status"] },
    { name: "idx_implementation_plans_created_at", columns: ["created_at"] },
  ],
  foreignKeys: [
    {
      name: "fk_implementation_plans_experiment",
      column: "experiment_id",
      referencedTable: "experiments",
      referencedColumn: "id",
      removal: "RESTRICT",
      parent: "CASCADE",
    },
    {
      name: "fk_implementation_plans_recommendation",
      column: "recommendation_id",
      referencedTable: "ai_recommendations",
      referencedColumn: "id",
      removal: "RESTRICT",
      parent: "CASCADE",
    },
  ],
};

const implementationPlanAuditSpec = {
  table: "implementation_plan_audit",
  columns: [
    { name: "id", dataType: "bigint", unsigned: true, autoIncrement: true },
    {
      name: "implementation_plan_id",
      dataType: "bigint",
      unsigned: true,
    },
    {
      name: "previous_status",
      dataType: "enum",
      enumType: planStatusType,
    },
    {
      name: "next_status",
      dataType: "enum",
      enumType: planStatusType,
    },
    {
      name: "actor_type",
      dataType: "enum",
      enumType: actorType,
    },
    { name: "created_at", dataType: "timestamp", timestampDefault: true },
  ],
  indexes: [
    { name: "PRIMARY", columns: ["id"], unique: true },
    {
      name: "idx_implementation_plan_audit_implementation_plan_id",
      columns: ["implementation_plan_id"],
    },
    {
      name: "idx_implementation_plan_audit_created_at",
      columns: ["created_at"],
    },
  ],
  foreignKeys: [
    {
      name: "fk_implementation_plan_audit_implementation_plan",
      column: "implementation_plan_id",
      referencedTable: "implementation_plans",
      referencedColumn: "id",
      removal: "RESTRICT",
      parent: "CASCADE",
    },
  ],
};

function same(left, right) {
  return (
    String(left ?? "")
      .trim()
      .toLowerCase() ===
    String(right ?? "")
      .trim()
      .toLowerCase()
  );
}

function normalizeType(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "");
}

export function normalizeInformationSchemaStringDefault(value) {
  let text = String(value ?? "").trim().toLowerCase();

  if (
    text.length >= 2 &&
    text.startsWith("'") &&
    text.endsWith("'")
  ) {
    text = text.slice(1, -1).replace(/''/g, "'");
  }

  return text;
}

function isCurrentTimestamp(value) {
  return /^current_timestamp(?:\(\))?$/i.test(
    String(value ?? "").trim()
  );
}

function isFalseDefault(value) {
  return value === 0 || value === "0";
}

function rowsForTable(rows, table) {
  return (rows ?? []).filter((row) => same(row.table_name, table));
}

function checkResult(id, label, problems) {
  return {
    id,
    label,
    pass: problems.length === 0,
    detail: problems.join("; "),
  };
}

function columnProblems(row, expected) {
  if (!row) {
    return [`missing column ${expected.name}`];
  }

  const problems = [];

  if (expected.booleanFalse) {
    if (
      !same(row.data_type, "tinyint") ||
      normalizeType(row.column_type) !== "tinyint(1)"
    ) {
      problems.push(
        `${expected.name} is not BOOLEAN`
      );
    }

    if (String(row.is_nullable).toUpperCase() !== "NO") {
      problems.push(`${expected.name} nullable is ${row.is_nullable}`);
    }

    if (!isFalseDefault(row.column_default)) {
      problems.push(`${expected.name} default is not FALSE`);
    }

    return problems;
  }

  if (!same(row.data_type, expected.dataType)) {
    problems.push(
      `${expected.name} data type is ${row.data_type}`
    );
  }

  const nullable = String(row.is_nullable).toUpperCase() === "YES";

  if (nullable !== Boolean(expected.nullable)) {
    problems.push(`${expected.name} nullable is ${row.is_nullable}`);
  }

  if (
    expected.length != null &&
    Number(row.character_maximum_length) !== expected.length
  ) {
    problems.push(
      `${expected.name} length is ${row.character_maximum_length}`
    );
  }

  if (
    expected.unsigned &&
    !normalizeType(row.column_type).includes("unsigned")
  ) {
    problems.push(`${expected.name} is not unsigned`);
  }

  if (
    expected.enumType &&
    normalizeType(row.column_type) !== expected.enumType
  ) {
    problems.push(`${expected.name} type is ${row.column_type}`);
  }

  if (
    expected.defaultValue != null &&
    normalizeInformationSchemaStringDefault(row.column_default) !==
      normalizeInformationSchemaStringDefault(expected.defaultValue)
  ) {
    problems.push(
      `${expected.name} default is ${row.column_default}`
    );
  }

  if (
    expected.autoIncrement &&
    !String(row.extra ?? "")
      .toLowerCase()
      .includes("auto_increment")
  ) {
    problems.push(`${expected.name} is not auto increment`);
  }

  if (expected.timestampDefault && !isCurrentTimestamp(row.column_default)) {
    problems.push(`${expected.name} default is ${row.column_default}`);
  }

  if (
    expected.onUpdate &&
    !String(row.extra ?? "")
      .toLowerCase()
      .includes("on update")
  ) {
    problems.push(`${expected.name} is missing its automatic refresh`);
  }

  return problems;
}

function indexProblems(indexes, table, expected) {
  const rows = rowsForTable(indexes, table)
    .filter((row) => same(row.index_name, expected.name))
    .sort(
      (left, right) =>
        Number(left.seq_in_index) - Number(right.seq_in_index)
    );

  if (rows.length === 0) {
    return [`missing index ${expected.name}`];
  }

  const problems = [];
  const columns = rows.map((row) =>
    String(row.column_name).trim().toLowerCase()
  );

  if (columns.join(",") !== expected.columns.join(",")) {
    problems.push(
      `index ${expected.name} columns are ${columns.join(", ")}`
    );
  }

  const flags = rows.map((row) => Number(row.non_unique));

  if (expected.unique) {
    if (flags.some((flag) => flag !== 0)) {
      problems.push(`index ${expected.name} is not a unique index`);
    }
  } else if (flags.some((flag) => flag !== 1)) {
    problems.push(
      `index ${expected.name} uniqueness does not match its migration`
    );
  }

  return problems;
}

function foreignKeyProblems(foreignKeys, table, expected) {
  const rows = rowsForTable(foreignKeys, table).filter((row) =>
    same(row.constraint_name, expected.name)
  );

  if (rows.length === 0) {
    return [`missing foreign key ${expected.name}`];
  }

  const row = rows[0];
  const problems = [];

  if (!same(row.column_name, expected.column)) {
    problems.push(
      `foreign key ${expected.name} column is ${row.column_name}`
    );
  }

  if (
    !same(row.referenced_table_name, expected.referencedTable) ||
    !same(row.referenced_column_name, expected.referencedColumn)
  ) {
    problems.push(
      `foreign key ${expected.name} references ${row.referenced_table_name}.${row.referenced_column_name}`
    );
  }

  if (
    !same(row.removal_rule, expected.removal) ||
    !same(row.parent_rule, expected.parent)
  ) {
    problems.push(
      `foreign key ${expected.name} rules are ${row.removal_rule}/${row.parent_rule}`
    );
  }

  return problems;
}

function assessTable(spec, columns, indexes, foreignKeys) {
  if (rowsForTable(columns, spec.table).length === 0) {
    return [`${spec.table} table does not exist`];
  }

  const problems = [];

  for (const expected of spec.columns) {
    const row = rowsForTable(columns, spec.table).find((candidate) =>
      same(candidate.column_name, expected.name)
    );

    problems.push(...columnProblems(row, expected));
  }

  for (const expected of spec.indexes) {
    problems.push(...indexProblems(indexes, spec.table, expected));
  }

  for (const expected of spec.foreignKeys) {
    problems.push(
      ...foreignKeyProblems(foreignKeys, spec.table, expected)
    );
  }

  return problems;
}

export function assessEvidenceFingerprint(columns) {
  const row = (columns ?? []).find(
    (candidate) =>
      same(candidate.table_name, "ai_recommendations") &&
      same(candidate.column_name, "evidence_fingerprint")
  );

  if (!row) {
    return checkResult("005", "evidence_fingerprint", [
      "ai_recommendations.evidence_fingerprint is missing",
    ]);
  }

  const problems = [];

  if (!same(row.data_type, "char")) {
    problems.push(`evidence_fingerprint data type is ${row.data_type}`);
  }

  if (Number(row.character_maximum_length) !== 64) {
    problems.push(
      `evidence_fingerprint length is ${row.character_maximum_length}`
    );
  }

  if (String(row.is_nullable).toUpperCase() !== "YES") {
    problems.push(
      `evidence_fingerprint nullable is ${row.is_nullable}`
    );
  }

  return checkResult("005", "evidence_fingerprint", problems);
}

export function assessExperiments(columns, indexes, foreignKeys) {
  return checkResult(
    "006",
    "experiments",
    assessTable(experimentsSpec, columns, indexes, foreignKeys)
  );
}

export function assessImplementationPlans(columns, indexes, foreignKeys) {
  return checkResult(
    "007",
    "implementation_plans",
    assessTable(implementationPlansSpec, columns, indexes, foreignKeys)
  );
}

export function assessImplementationPlanAudit(columns, indexes, foreignKeys) {
  return checkResult(
    "008",
    "implementation_plan_audit",
    assessTable(implementationPlanAuditSpec, columns, indexes, foreignKeys)
  );
}

export function assessExperimentUniqueIndex(columns, indexes) {
  if (rowsForTable(columns, "implementation_plans").length === 0) {
    return checkResult("009", "experiment unique index", [
      "implementation_plans table does not exist",
    ]);
  }

  const planIndexes = rowsForTable(indexes, "implementation_plans");

  if (!hasExactExperimentIdUniqueIndex(planIndexes)) {
    return checkResult("009", "experiment unique index", [
      "no unique index whose only column is experiment_id",
    ]);
  }

  return checkResult("009", "experiment unique index", []);
}

export function assessDuplicatePlans(groups) {
  if ((groups ?? []).length === 0) {
    return checkResult("009", "duplicate experiment plans", []);
  }

  const detail = groups.map((group) => {
    const planIds = (group.planIds ?? []).map((id) => String(id));
    const planList =
      planIds.length > 0 ? planIds.join(", ") : "(none returned)";

    return `experiment_id ${group.experimentId}: implementation plan id(s) ${planList}`;
  });

  return checkResult("009", "duplicate experiment plans", detail);
}

export function governanceDiagnosticExitCode(report) {
  return report.checks.some((check) => !check.pass) ? 1 : 0;
}

function formatCheck(check) {
  const status = check.pass ? "[PASS]" : "[FAIL]";

  if (!check.pass && check.detail) {
    return `${status} ${check.id} ${check.label}: ${check.detail}`;
  }

  return `${status} ${check.id} ${check.label}`;
}

async function readDuplicateGroups(connection) {
  const [experimentRows] = await connection.query(
    duplicateImplementationPlansSql
  );
  const groups = [];

  for (const row of experimentRows ?? []) {
    const [planRows] = await connection.query(implementationPlanIdsSql, [
      row.experiment_id,
    ]);

    groups.push({
      experimentId: row.experiment_id,
      planIds: (planRows ?? []).map((plan) => plan.id),
    });
  }

  return groups;
}

export async function checkGovernanceSchema(connection) {
  const [databaseRows] = await connection.query(selectedDatabaseSql);
  const databaseName = databaseRows?.[0]?.database_name;

  if (typeof databaseName !== "string" || databaseName.trim() === "") {
    return {
      databaseName: null,
      checks: [
        checkResult("database", "selected database", [
          "no database is selected",
        ]),
      ],
    };
  }

  const [columns] = await connection.query(governanceColumnsSql);
  const [indexes] = await connection.query(governanceIndexesSql);
  const [foreignKeys] = await connection.query(governanceForeignKeysSql);
  const plansExist =
    rowsForTable(columns, "implementation_plans").length > 0;
  const duplicateGroups = plansExist
    ? await readDuplicateGroups(connection)
    : [];
  const duplicateCheck = plansExist
    ? assessDuplicatePlans(duplicateGroups)
    : checkResult("009", "duplicate experiment plans", [
        "implementation_plans table does not exist",
      ]);

  return {
    databaseName,
    checks: [
      assessEvidenceFingerprint(columns),
      assessExperiments(columns, indexes, foreignKeys),
      assessImplementationPlans(columns, indexes, foreignKeys),
      assessImplementationPlanAudit(columns, indexes, foreignKeys),
      assessExperimentUniqueIndex(columns, indexes),
      duplicateCheck,
    ],
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
    const report = await checkGovernanceSchema(connection);

    console.log(
      `Database: ${report.databaseName ?? "(none selected)"}`
    );

    for (const check of report.checks) {
      console.log(formatCheck(check));
    }

    const exitCode = governanceDiagnosticExitCode(report);

    if (exitCode !== 0) {
      process.exitCode = exitCode;
    }
  } finally {
    await connection.end();
  }
}

if (isExecutedAsScript()) {
  main().catch((error) => {
    const message = error instanceof Error ? error.message : String(error);

    console.error(message);
    process.exitCode = 1;
  });
}
