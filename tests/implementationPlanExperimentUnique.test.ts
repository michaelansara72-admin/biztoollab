import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  addImplementationPlanExperimentUniqueSql,
  applyImplementationPlanExperimentUniqueIndex,
  duplicateImplementationPlanExperimentSql,
  hasExactExperimentIdUniqueIndex,
  implementationPlanExperimentUniqueIndexName,
} from "../scripts/database/009-add-implementation-plan-experiment-unique.mjs";

const migrationPath = path.join(
  process.cwd(),
  "scripts",
  "database",
  "009-add-implementation-plan-experiment-unique.mjs"
);

type IndexRow = {
  index_name: string;
  non_unique: number;
  seq_in_index: number;
  column_name: string;
};

type QueryCall = {
  sql: string;
  values?: readonly unknown[];
};

function createHarness({
  tables,
  indexes,
  indexesAfterAlter = indexes,
  duplicates = [],
  plansByExperiment = {},
}: {
  tables: unknown[];
  indexes: IndexRow[];
  indexesAfterAlter?: IndexRow[];
  duplicates?: Array<{ experiment_id: number }>;
  plansByExperiment?: Record<
    number,
    Array<{ id: number }>
  >;
}) {
  const calls: QueryCall[] = [];
  let indexReads = 0;

  return {
    calls,

    async query(sql: string) {
      calls.push({ sql });

      if (/SHOW TABLES/i.test(sql)) {
        return [tables];
      }

      if (/information_schema/i.test(sql)) {
        indexReads += 1;

        return [
          indexReads === 1
            ? indexes
            : indexesAfterAlter,
        ];
      }

      if (/GROUP BY experiment_id/i.test(sql)) {
        return [duplicates];
      }

      throw new Error(`Unexpected query: ${sql}`);
    },

    async execute(
      sql: string,
      values?: readonly unknown[]
    ) {
      calls.push({ sql, values });

      if (/SELECT id/i.test(sql)) {
        const experimentId = Number(values?.[0]);

        return [plansByExperiment[experimentId] ?? []];
      }

      if (/ALTER TABLE/i.test(sql)) {
        return [{ affectedRows: 0 }];
      }

      throw new Error(`Unexpected execute: ${sql}`);
    },
  };
}

function sqlCalls(calls: QueryCall[]) {
  return calls.map((call) => call.sql).join("\n");
}

const nonUniqueExperimentIndex: IndexRow[] = [
  {
    index_name: "idx_implementation_plans_experiment_id",
    non_unique: 1,
    seq_in_index: 1,
    column_name: "experiment_id",
  },
];

const addedUniqueIndex: IndexRow[] = [
  ...nonUniqueExperimentIndex,
  {
    index_name: implementationPlanExperimentUniqueIndexName,
    non_unique: 0,
    seq_in_index: 1,
    column_name: "experiment_id",
  },
];

test("an exact unique experiment_id index is recognized by its columns", () => {
  assert.equal(
    hasExactExperimentIdUniqueIndex([
      {
        index_name: "plans_experiment_key",
        non_unique: 0,
        seq_in_index: 1,
        column_name: "experiment_id",
      },
    ]),
    true
  );

  assert.equal(
    hasExactExperimentIdUniqueIndex(
      nonUniqueExperimentIndex
    ),
    false
  );

  assert.equal(
    hasExactExperimentIdUniqueIndex([
      {
        index_name: "uq_experiment_and_title",
        non_unique: 0,
        seq_in_index: 1,
        column_name: "experiment_id",
      },
      {
        index_name: "uq_experiment_and_title",
        non_unique: 0,
        seq_in_index: 2,
        column_name: "title",
      },
    ]),
    false
  );
});

test("a missing implementation_plans table fails closed", async () => {
  const harness = createHarness({
    tables: [],
    indexes: [],
  });

  await assert.rejects(
    () =>
      applyImplementationPlanExperimentUniqueIndex(
        harness
      ),
    {
      message:
        "implementation_plans table does not exist. Apply migration 007 before adding the experiment uniqueness constraint.",
    }
  );

  assert.equal(harness.calls.length, 1);
  assert.match(harness.calls[0].sql, /SHOW TABLES/i);
  assert.doesNotMatch(
    sqlCalls(harness.calls),
    /ALTER TABLE/i
  );
});

test("an existing qualifying unique index is already complete", async () => {
  const harness = createHarness({
    tables: [{ Tables_in_db: "implementation_plans" }],
    indexes: [
      {
        index_name: "plans_experiment_key",
        non_unique: 0,
        seq_in_index: 1,
        column_name: "experiment_id",
      },
    ],
  });

  const result =
    await applyImplementationPlanExperimentUniqueIndex(
      harness
    );

  assert.deepEqual(result, {
    status: "already-present",
  });
  assert.doesNotMatch(
    sqlCalls(harness.calls),
    /ALTER TABLE|GROUP BY experiment_id/i
  );
});

test("duplicate experiment ids prevent the unique index and report plan ids", async () => {
  const harness = createHarness({
    tables: [{ Tables_in_db: "implementation_plans" }],
    indexes: nonUniqueExperimentIndex,
    duplicates: [
      { experiment_id: 12 },
      { experiment_id: 15 },
    ],
    plansByExperiment: {
      12: [{ id: 4 }, { id: 9 }],
      15: [{ id: 8 }, { id: 11 }],
    },
  });

  await assert.rejects(
    () =>
      applyImplementationPlanExperimentUniqueIndex(
        harness
      ),
    (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.match(
        error.message,
        /did not alter implementation_plans/
      );
      assert.match(
        error.message,
        /experiment_id 12: implementation plan id\(s\) 4, 9/
      );
      assert.match(
        error.message,
        /experiment_id 15: implementation plan id\(s\) 8, 11/
      );
      assert.equal(
        error.message.includes("MYSQL_"),
        false
      );
      assert.equal(
        error.message.includes("password"),
        false
      );
      return true;
    }
  );

  assert.match(
    sqlCalls(harness.calls),
    /GROUP BY experiment_id\s+HAVING COUNT\(\*\) > 1/
  );
  assert.doesNotMatch(
    sqlCalls(harness.calls),
    /ALTER TABLE|DELETE|UPDATE/i
  );
});

test("a clean table adds and verifies the deterministic unique index", async () => {
  const harness = createHarness({
    tables: [{ Tables_in_db: "implementation_plans" }],
    indexes: nonUniqueExperimentIndex,
    indexesAfterAlter: addedUniqueIndex,
    duplicates: [],
  });

  const result =
    await applyImplementationPlanExperimentUniqueIndex(
      harness
    );

  assert.deepEqual(result, {
    status: "added",
  });

  const statements = sqlCalls(harness.calls);
  const duplicateCheck = statements.indexOf(
    "GROUP BY experiment_id"
  );
  const alter = statements.indexOf(
    "ADD UNIQUE INDEX"
  );

  assert.ok(duplicateCheck >= 0);
  assert.ok(alter > duplicateCheck);
  assert.match(
    addImplementationPlanExperimentUniqueSql,
    /ADD UNIQUE INDEX uq_implementation_plans_experiment_id \(\s*experiment_id\s*\)/
  );
  assert.match(
    sqlCalls(harness.calls),
    /ADD UNIQUE INDEX uq_implementation_plans_experiment_id/
  );
  assert.match(
    duplicateImplementationPlanExperimentSql,
    /GROUP BY experiment_id\s+HAVING COUNT\(\*\) > 1/
  );
});

test("migration 009 does not delete or update plan rows", () => {
  const source = fs.readFileSync(migrationPath, "utf8");

  assert.match(
    source,
    /createMigrationConnection/
  );
  assert.match(
    source,
    /uq_implementation_plans_experiment_id/
  );
  assert.match(
    source,
    /GROUP BY experiment_id\s+HAVING COUNT\(\*\) > 1/
  );
  assert.match(source, /finally \{/);
  assert.match(source, /connection\.end\(\)/);
  assert.doesNotMatch(source, /\bDELETE\b/i);
  assert.doesNotMatch(source, /\bUPDATE\b/i);
  assert.doesNotMatch(source, /\bINSERT\b/i);
  assert.doesNotMatch(source, /CREATE TABLE/i);
});
