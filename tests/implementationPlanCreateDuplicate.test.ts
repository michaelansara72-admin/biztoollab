import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  implementationPlanCreateFailure,
  implementationPlanCreateFailureClientError,
  implementationPlanDuplicateEntryClientError,
  isMysqlDuplicateEntryError,
} from "../src/lib/mysqlDuplicateEntryError";

const routePath = path.join(
  process.cwd(),
  "src",
  "app",
  "api",
  "admin",
  "ai",
  "implementation-plans",
  "route.ts"
);

const leakedDatabaseText =
  "Duplicate entry '4' for key 'uq_implementation_plans_experiment_id'";

const leakedSql =
  "INSERT INTO implementation_plans (experiment_id) VALUES (4)";

test("ER_DUP_ENTRY returns a static 409", () => {
  const error = Object.assign(
    new Error(leakedDatabaseText),
    {
      code: "ER_DUP_ENTRY",
      errno: 1062,
      sql: leakedSql,
    }
  );

  assert.equal(isMysqlDuplicateEntryError(error), true);

  const failure = implementationPlanCreateFailure(error);

  assert.deepEqual(failure, {
    status: 409,
    error: implementationPlanDuplicateEntryClientError,
  });
  assert.equal(
    failure.error.includes(leakedDatabaseText),
    false
  );
  assert.equal(failure.error.includes(leakedSql), false);
  assert.equal(
    failure.error.includes("uq_implementation_plans"),
    false
  );
});

test("errno 1062 returns a static 409 without a code", () => {
  const error = Object.assign(
    new Error(leakedDatabaseText),
    {
      errno: 1062,
      sqlMessage: leakedDatabaseText,
    }
  );

  assert.equal(isMysqlDuplicateEntryError(error), true);

  const failure = implementationPlanCreateFailure(error);

  assert.equal(failure.status, 409);
  assert.equal(
    failure.error,
    implementationPlanDuplicateEntryClientError
  );
  assert.equal(
    failure.error.includes(leakedDatabaseText),
    false
  );
});

test("unrelated database errors stay on the generic 500 path", () => {
  const error = Object.assign(
    new Error(
      "Table 'biztoollab.implementation_plans' doesn't exist"
    ),
    {
      code: "ER_NO_SUCH_TABLE",
      errno: 1146,
      sql: "INSERT INTO implementation_plans VALUES (?)",
    }
  );

  assert.equal(isMysqlDuplicateEntryError(error), false);
  assert.equal(
    isMysqlDuplicateEntryError(
      new Error("ER_DUP_ENTRY mentioned only in the message")
    ),
    false
  );
  assert.equal(
    isMysqlDuplicateEntryError({
      code: "ER_NO_SUCH_TABLE",
      errno: "1062",
    }),
    false
  );

  const failure = implementationPlanCreateFailure(error);

  assert.deepEqual(failure, {
    status: 500,
    error: implementationPlanCreateFailureClientError,
  });
  assert.equal(
    failure.error.includes("doesn't exist"),
    false
  );
  assert.equal(failure.error.includes("INSERT"), false);
});

test("the pre-insert duplicate check still runs before save", () => {
  const source = fs.readFileSync(routePath, "utf8");
  const existingPlanCheck = source.indexOf(
    "getLatestImplementationPlanForExperiment"
  );
  const save = source.indexOf(
    "saveImplementationPlan({"
  );

  assert.ok(existingPlanCheck >= 0);
  assert.ok(save > existingPlanCheck);
  assert.match(
    source,
    /Experiment #\$\{experiment\.id\} already has Implementation Plan #\$\{existingPlan\.id\}\./
  );
  assert.match(
    source,
    /implementationPlanCreateFailure\(error\)/
  );
});
