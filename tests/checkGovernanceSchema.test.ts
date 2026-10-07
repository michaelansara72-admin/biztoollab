import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  checkGovernanceSchema,
  duplicateImplementationPlansSql,
  governanceColumnsSql,
  governanceDiagnosticExitCode,
  governanceForeignKeysSql,
  governanceIndexesSql,
  implementationPlanIdsSql,
  selectedDatabaseSql,
} from "../scripts/database/check-governance-schema.mjs";

const diagnosticPath = path.join(
  process.cwd(),
  "scripts",
  "database",
  "check-governance-schema.mjs"
);

const experimentStatus =
  "enum('draft','ready-for-review','approved','rejected')";
const planStatus =
  "enum('draft','ready-for-review','authorized','rejected')";
const actorType = "enum('authenticated-admin')";

const forbiddenSql =
  /\b(ALTER|CREATE|DROP|INSERT|UPDATE|DELETE|REPLACE|TRUNCATE)\b/i;

type ColumnRow = {
  table_name: string;
  column_name: string;
  data_type: string;
  column_type: string;
  character_maximum_length: number | null;
  is_nullable: "YES" | "NO";
  column_default: string | number | null;
  extra: string;
};

type IndexRow = {
  table_name: string;
  index_name: string;
  non_unique: number;
  seq_in_index: number;
  column_name: string;
};

type ForeignKeyRow = {
  table_name: string;
  constraint_name: string;
  column_name: string;
  referenced_table_name: string;
  referenced_column_name: string;
  removal_rule: string;
  parent_rule: string;
};

type Snapshot = {
  columns: ColumnRow[];
  indexes: IndexRow[];
  foreignKeys: ForeignKeyRow[];
  duplicates?: Array<{ experiment_id: number; secret?: string }>;
  plans?: Array<{
    experiment_id: number;
    id: number;
    secret?: string;
  }>;
};

type QueryCall = {
  sql: string;
  values?: readonly unknown[];
};

function column(
  table: string,
  name: string,
  dataType: string,
  columnType: string,
  nullable: "YES" | "NO",
  length: number | null = null,
  columnDefault: string | number | null = null,
  extra = ""
): ColumnRow {
  return {
    table_name: table,
    column_name: name,
    data_type: dataType,
    column_type: columnType,
    character_maximum_length: length,
    is_nullable: nullable,
    column_default: columnDefault,
    extra,
  };
}

function bigintColumn(table: string, name: string, extra = ""): ColumnRow {
  return column(table, name, "bigint", "bigint unsigned", "NO", null, null, extra);
}

function textColumn(
  table: string,
  name: string,
  nullable: "YES" | "NO" = "NO"
): ColumnRow {
  return column(table, name, "text", "text", nullable);
}

function varcharColumn(
  table: string,
  name: string,
  length: number,
  nullable: "YES" | "NO" = "NO",
  columnDefault: string | null = null
): ColumnRow {
  return column(
    table,
    name,
    "varchar",
    `varchar(${length})`,
    nullable,
    length,
    columnDefault
  );
}

function enumColumn(
  table: string,
  name: string,
  columnType: string,
  columnDefault: string | null = null
): ColumnRow {
  return column(table, name, "enum", columnType, "NO", null, columnDefault);
}

function timestampColumn(table: string, name: string, onUpdate = false): ColumnRow {
  return column(
    table,
    name,
    "timestamp",
    "timestamp",
    "NO",
    null,
    "CURRENT_TIMESTAMP",
    onUpdate
      ? "DEFAULT_GENERATED on update CURRENT_TIMESTAMP"
      : "DEFAULT_GENERATED"
  );
}

function indexRow(
  table: string,
  name: string,
  columnName: string,
  nonUnique: number,
  sequence = 1
): IndexRow {
  return {
    table_name: table,
    index_name: name,
    non_unique: nonUnique,
    seq_in_index: sequence,
    column_name: columnName,
  };
}

function foreignKey(
  table: string,
  name: string,
  columnName: string,
  referencedTable: string,
  referencedColumn: string,
  removal: string,
  parent: string
): ForeignKeyRow {
  return {
    table_name: table,
    constraint_name: name,
    column_name: columnName,
    referenced_table_name: referencedTable,
    referenced_column_name: referencedColumn,
    removal_rule: removal,
    parent_rule: parent,
  };
}

function tableIndexes(
  table: string,
  secondary: Array<[string, string]>
): IndexRow[] {
  return [
    indexRow(table, "PRIMARY", "id", 0),
    ...secondary.map(([name, columnName]) =>
      indexRow(table, name, columnName, 1)
    ),
  ];
}

function passingSnapshot(): Snapshot {
  return {
    columns: [
      column(
        "ai_recommendations",
        "evidence_fingerprint",
        "char",
        "char(64)",
        "YES",
        64
      ),
      bigintColumn("experiments", "id", "auto_increment"),
      bigintColumn("experiments", "recommendation_id"),
      bigintColumn("experiments", "source_decision_id"),
      varcharColumn("experiments", "title", 255),
      textColumn("experiments", "hypothesis"),
      textColumn("experiments", "proposed_change"),
      textColumn("experiments", "control_description", "YES"),
      textColumn("experiments", "success_metric"),
      varcharColumn("experiments", "baseline_value", 255, "YES"),
      varcharColumn("experiments", "target_value", 255, "YES"),
      enumColumn("experiments", "status", experimentStatus, "draft"),
      varcharColumn("experiments", "created_by", 100, "NO", "admin"),
      timestampColumn("experiments", "created_at"),
      timestampColumn("experiments", "updated_at", true),
      bigintColumn("implementation_plans", "id", "auto_increment"),
      bigintColumn("implementation_plans", "experiment_id"),
      bigintColumn("implementation_plans", "recommendation_id"),
      varcharColumn("implementation_plans", "title", 255),
      varcharColumn("implementation_plans", "target_path", 500),
      textColumn("implementation_plans", "proposed_changes"),
      textColumn("implementation_plans", "protected_elements"),
      textColumn("implementation_plans", "measurement_plan"),
      textColumn("implementation_plans", "rollback_plan"),
      enumColumn("implementation_plans", "status", planStatus, "draft"),
      column(
        "implementation_plans",
        "production_authorized",
        "tinyint",
        "tinyint(1)",
        "NO",
        null,
        "0"
      ),
      varcharColumn("implementation_plans", "created_by", 100, "NO", "admin"),
      timestampColumn("implementation_plans", "created_at"),
      timestampColumn("implementation_plans", "updated_at", true),
      bigintColumn("implementation_plan_audit", "id", "auto_increment"),
      bigintColumn("implementation_plan_audit", "implementation_plan_id"),
      enumColumn("implementation_plan_audit", "previous_status", planStatus),
      enumColumn("implementation_plan_audit", "next_status", planStatus),
      enumColumn("implementation_plan_audit", "actor_type", actorType),
      timestampColumn("implementation_plan_audit", "created_at"),
    ],
    indexes: [
      ...tableIndexes("experiments", [
        ["idx_experiments_recommendation_id", "recommendation_id"],
        ["idx_experiments_source_decision_id", "source_decision_id"],
        ["idx_experiments_status", "status"],
        ["idx_experiments_created_at", "created_at"],
      ]),
      ...tableIndexes("implementation_plans", [
        ["idx_implementation_plans_experiment_id", "experiment_id"],
        ["idx_implementation_plans_recommendation_id", "recommendation_id"],
        ["idx_implementation_plans_status", "status"],
        ["idx_implementation_plans_created_at", "created_at"],
      ]),
      indexRow(
        "implementation_plans",
        "custom_plan_experiment",
        "experiment_id",
        0
      ),
      ...tableIndexes("implementation_plan_audit", [
        [
          "idx_implementation_plan_audit_implementation_plan_id",
          "implementation_plan_id",
        ],
        ["idx_implementation_plan_audit_created_at", "created_at"],
      ]),
    ],
    foreignKeys: [
      foreignKey(
        "experiments",
        "fk_experiments_recommendation",
        "recommendation_id",
        "ai_recommendations",
        "id",
        "CASCADE",
        "CASCADE"
      ),
      foreignKey(
        "experiments",
        "fk_experiments_source_decision",
        "source_decision_id",
        "human_decisions",
        "id",
        "RESTRICT",
        "CASCADE"
      ),
      foreignKey(
        "implementation_plans",
        "fk_implementation_plans_experiment",
        "experiment_id",
        "experiments",
        "id",
        "RESTRICT",
        "CASCADE"
      ),
      foreignKey(
        "implementation_plans",
        "fk_implementation_plans_recommendation",
        "recommendation_id",
        "ai_recommendations",
        "id",
        "RESTRICT",
        "CASCADE"
      ),
      foreignKey(
        "implementation_plan_audit",
        "fk_implementation_plan_audit_implementation_plan",
        "implementation_plan_id",
        "implementation_plans",
        "id",
        "RESTRICT",
        "CASCADE"
      ),
    ],
  };
}

function createHarness(snapshot: Snapshot, databaseName: string | null = "governance_schema_check") {
  const calls: QueryCall[] = [];

  return {
    calls,
    connection: {
      async query(sql: string, values?: readonly unknown[]) {
        calls.push({ sql, values });

        if (/SELECT\s+DATABASE\(\)\s+AS\s+database_name/i.test(sql)) {
          return [[{ database_name: databaseName }]];
        }

        if (/information_schema\.COLUMNS/i.test(sql)) {
          return [snapshot.columns];
        }

        if (/information_schema\.STATISTICS/i.test(sql)) {
          return [snapshot.indexes];
        }

        if (/REFERENTIAL_CONSTRAINTS/i.test(sql)) {
          return [snapshot.foreignKeys];
        }

        if (/GROUP BY experiment_id/i.test(sql)) {
          return [snapshot.duplicates ?? []];
        }

        if (/WHERE experiment_id = \?/i.test(sql)) {
          const experimentId = values?.[0];

          return [
            (snapshot.plans ?? [])
              .filter((plan) => plan.experiment_id === experimentId)
              .map((plan) => ({ id: plan.id, secret: plan.secret })),
          ];
        }

        throw new Error(`Unexpected diagnostic SQL: ${sql}`);
      },
    },
  };
}

function checkById(
  report: { checks: Array<{ id: string; label: string; pass: boolean; detail: string }> },
  id: string,
  label: string
) {
  const check = report.checks.find(
    (candidate) => candidate.id === id && candidate.label === label
  );

  assert.ok(check, `missing check ${id} ${label}`);
  return check;
}

test("importing the diagnostic does not connect", () => {
  const source = fs.readFileSync(diagnosticPath, "utf8");
  const mainIndex = source.indexOf("async function main");
  const connectIndex = source.indexOf("createMigrationConnection(");
  const guardIndex = source.lastIndexOf("if (isExecutedAsScript())");

  assert.equal(typeof checkGovernanceSchema, "function");
  assert.ok(mainIndex !== -1);
  assert.ok(connectIndex > mainIndex);
  assert.equal(connectIndex, source.lastIndexOf("createMigrationConnection("));
  assert.ok(guardIndex > connectIndex);
  assert.doesNotMatch(source, /^await /m);
  assert.match(source, /finally\s*\{[^}]*connection\.end\(\)/);
  assert.doesNotMatch(source, /MYSQL_PASSWORD|MYSQL_USER|MYSQL_HOST/);
});

test("successful expected schema passes", async () => {
  const { connection } = createHarness(passingSnapshot());
  const report = await checkGovernanceSchema(connection);

  assert.equal(report.databaseName, "governance_schema_check");
  assert.equal(governanceDiagnosticExitCode(report), 0);
  assert.ok(report.checks.every((check: { pass: boolean }) => check.pass));
  assert.equal(
    checkById(report, "009", "experiment unique index").pass,
    true
  );
  assert.doesNotMatch(
    JSON.stringify(report),
    /uq_implementation_plans_experiment_id/
  );
});

test("quoted information_schema string defaults match the migration literals", async () => {
  const snapshot = passingSnapshot();

  for (const row of snapshot.columns) {
    if (row.column_name === "status") {
      row.column_default = "'draft'";
    }

    if (row.column_name === "created_by") {
      row.column_default = "'admin'";
    }
  }

  const report = await checkGovernanceSchema(
    createHarness(snapshot).connection
  );

  assert.equal(checkById(report, "006", "experiments").pass, true);
  assert.equal(checkById(report, "007", "implementation_plans").pass, true);
  assert.equal(governanceDiagnosticExitCode(report), 0);
});

test("a different string default still fails", async () => {
  const snapshot = passingSnapshot();
  const createdBy = snapshot.columns.find(
    (row) =>
      row.table_name === "experiments" &&
      row.column_name === "created_by"
  );

  assert.ok(createdBy);
  createdBy.column_default = "'owner'";

  const report = await checkGovernanceSchema(
    createHarness(snapshot).connection
  );
  const experiments = checkById(report, "006", "experiments");

  assert.equal(experiments.pass, false);
  assert.match(experiments.detail, /created_by default is 'owner'/);
  assert.equal(checkById(report, "007", "implementation_plans").pass, true);
});

test("missing table fails", async () => {
  const snapshot = passingSnapshot();
  snapshot.columns = snapshot.columns.filter(
    (row) => row.table_name !== "experiments"
  );
  snapshot.indexes = snapshot.indexes.filter(
    (row) => row.table_name !== "experiments"
  );
  snapshot.foreignKeys = snapshot.foreignKeys.filter(
    (row) => row.table_name !== "experiments"
  );

  const report = await checkGovernanceSchema(
    createHarness(snapshot).connection
  );
  const experiments = checkById(report, "006", "experiments");

  assert.equal(experiments.pass, false);
  assert.match(experiments.detail, /experiments table does not exist/);
  assert.equal(governanceDiagnosticExitCode(report), 1);
});

test("malformed evidence_fingerprint fails", async () => {
  const snapshot = passingSnapshot();
  const fingerprint = snapshot.columns.find(
    (row) => row.column_name === "evidence_fingerprint"
  );

  assert.ok(fingerprint);
  fingerprint.data_type = "varchar";
  fingerprint.column_type = "varchar(32)";
  fingerprint.character_maximum_length = 32;
  fingerprint.is_nullable = "NO";

  const report = await checkGovernanceSchema(
    createHarness(snapshot).connection
  );
  const fingerprintCheck = checkById(report, "005", "evidence_fingerprint");

  assert.equal(fingerprintCheck.pass, false);
  assert.match(fingerprintCheck.detail, /varchar/);
  assert.equal(
    checkById(report, "006", "experiments").pass,
    true
  );
});

test("missing required index fails", async () => {
  const snapshot = passingSnapshot();
  snapshot.indexes = snapshot.indexes.filter(
    (row) => row.index_name !== "idx_experiments_status"
  );

  const report = await checkGovernanceSchema(
    createHarness(snapshot).connection
  );
  const experiments = checkById(report, "006", "experiments");

  assert.equal(experiments.pass, false);
  assert.match(experiments.detail, /missing index idx_experiments_status/);
});

test("missing required foreign key fails", async () => {
  const snapshot = passingSnapshot();
  snapshot.foreignKeys = snapshot.foreignKeys.filter(
    (row) => row.constraint_name !== "fk_implementation_plans_experiment"
  );

  const report = await checkGovernanceSchema(
    createHarness(snapshot).connection
  );
  const plans = checkById(report, "007", "implementation_plans");

  assert.equal(plans.pass, false);
  assert.match(
    plans.detail,
    /missing foreign key fk_implementation_plans_experiment/
  );
});

test("one-column unique experiment index passes regardless of name", async () => {
  const snapshot = passingSnapshot();
  snapshot.indexes = snapshot.indexes.map((row) =>
    row.index_name === "custom_plan_experiment"
      ? { ...row, index_name: "zzz_any_experiment_key" }
      : row
  );

  const report = await checkGovernanceSchema(
    createHarness(snapshot).connection
  );

  assert.equal(
    checkById(report, "009", "experiment unique index").pass,
    true
  );
  assert.equal(governanceDiagnosticExitCode(report), 0);
});

test("composite unique index does not satisfy migration 009", async () => {
  const snapshot = passingSnapshot();
  snapshot.indexes = snapshot.indexes.filter(
    (row) => row.index_name !== "custom_plan_experiment"
  );
  snapshot.indexes.push(
    indexRow(
      "implementation_plans",
      "experiment_id_status_key",
      "experiment_id",
      0,
      1
    ),
    indexRow(
      "implementation_plans",
      "experiment_id_status_key",
      "status",
      0,
      2
    )
  );

  const report = await checkGovernanceSchema(
    createHarness(snapshot).connection
  );
  const unique = checkById(report, "009", "experiment unique index");

  assert.equal(unique.pass, false);
  assert.match(unique.detail, /experiment_id/);
  assert.equal(checkById(report, "007", "implementation_plans").pass, true);
  assert.equal(
    checkById(report, "009", "duplicate experiment plans").pass,
    true
  );
  assert.equal(governanceDiagnosticExitCode(report), 1);
});

test("duplicate experiment rows fail and expose only plan and experiment ids", async () => {
  const snapshot = passingSnapshot();
  snapshot.duplicates = [
    { experiment_id: 12, secret: "MYSQL_PASSWORD=hunter2" },
  ];
  snapshot.plans = [
    { experiment_id: 12, id: 4, secret: "MYSQL_PASSWORD=hunter2" },
    { experiment_id: 12, id: 9, secret: "connection-string" },
  ];

  const report = await checkGovernanceSchema(
    createHarness(snapshot).connection
  );
  const duplicates = checkById(report, "009", "duplicate experiment plans");

  assert.equal(duplicates.pass, false);
  assert.equal(
    duplicates.detail,
    "experiment_id 12: implementation plan id(s) 4, 9"
  );
  assert.doesNotMatch(
    JSON.stringify(report),
    /hunter2|MYSQL_PASSWORD|connection-string|MYSQL_USER/
  );
  assert.equal(governanceDiagnosticExitCode(report), 1);
});

test("diagnostic SQL contains no write or DDL statements", async () => {
  const source = fs.readFileSync(diagnosticPath, "utf8");
  const generated = [
    selectedDatabaseSql,
    governanceColumnsSql,
    governanceIndexesSql,
    governanceForeignKeysSql,
    duplicateImplementationPlansSql,
    implementationPlanIdsSql,
  ];
  const { calls, connection } = createHarness(passingSnapshot());

  await checkGovernanceSchema(connection);

  assert.doesNotMatch(source, /^\s*(ALTER|CREATE|DROP|INSERT|UPDATE|DELETE|REPLACE|TRUNCATE)\b/im);

  for (const sql of [...generated, ...calls.map((call) => call.sql)]) {
    assert.doesNotMatch(sql, forbiddenSql);
    assert.match(sql, /^\s*(SELECT)\b/i);
  }

  assert.ok(
    calls.some((call) => /GROUP BY experiment_id/i.test(call.sql))
  );
});
