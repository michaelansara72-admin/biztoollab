import "./loadTestDatabaseEnv";

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  assertImplementationPlanAuditRecorded,
  implementationPlanAuditActorType,
  implementationPlanAuditInsertSql,
  implementationPlanStatusTransitionSql,
  transitionImplementationPlanStatus,
  type ImplementationPlanStatus,
  type ImplementationPlanTransitionConnection,
  type ImplementationPlanTransitionDependencies,
  type SavedImplementationPlan,
} from "../src/lib/implementationPlanRepository";

const migrationPath = path.join(
  process.cwd(),
  "scripts/database/008-create-implementation-plan-audit.mjs"
);

function savedImplementationPlan(
  overrides: {
    id?: number;
    status?: ImplementationPlanStatus;
    production_authorized?: boolean | number;
  } = {}
): SavedImplementationPlan {
  return {
    id: 7,
    experiment_id: 4,
    recommendation_id: 9,
    title: "Tighten the pricing headline",
    target_path: "/pricing",
    proposed_changes: "Revise the hero headline",
    protected_elements: "Primary navigation",
    measurement_plan: "Compare CTR",
    rollback_plan: "Restore the previous headline",
    status: "draft",
    production_authorized: 0,
    created_by: "admin",
    created_at: new Date("2026-04-01T00:00:00.000Z"),
    updated_at: new Date("2026-04-01T00:00:00.000Z"),
    ...overrides,
  } as SavedImplementationPlan;
}

type FailurePoint =
  | "begin"
  | "update"
  | "audit"
  | "commit"
  | "rollback";

function createHarness({
  plan,
  updateAffectedRows = 1,
  auditAffectedRows = 1,
  failOn,
}: {
  plan: SavedImplementationPlan | null;
  updateAffectedRows?: number;
  auditAffectedRows?: number;
  failOn?: FailurePoint;
}) {
  const calls: string[] = [];
  const executions: {
    sql: string;
    values: readonly (string | number)[];
  }[] = [];
  let acquiredConnections = 0;

  const connection: ImplementationPlanTransitionConnection = {
    async beginTransaction() {
      calls.push("begin");

      if (failOn === "begin") {
        throw new Error("begin failed");
      }
    },

    async execute(sql, values) {
      executions.push({
        sql,
        values,
      });

      if (sql === implementationPlanStatusTransitionSql) {
        calls.push("update");

        if (failOn === "update") {
          throw new Error("update failed");
        }

        return [
          {
            affectedRows: updateAffectedRows,
          },
          [],
        ];
      }

      if (sql === implementationPlanAuditInsertSql) {
        calls.push("audit");

        if (failOn === "audit") {
          throw new Error("audit failed");
        }

        return [
          {
            affectedRows: auditAffectedRows,
          },
          [],
        ];
      }

      throw new Error(`Unexpected SQL: ${sql}`);
    },

    async commit() {
      calls.push("commit");

      if (failOn === "commit") {
        throw new Error("commit failed");
      }
    },

    async rollback() {
      calls.push("rollback");

      if (failOn === "rollback") {
        throw new Error("rollback failed");
      }
    },

    release() {
      calls.push("release");
    },
  };

  const dependencies: ImplementationPlanTransitionDependencies = {
    async loadImplementationPlan() {
      calls.push("load");
      return plan;
    },

    async acquireConnection() {
      acquiredConnections += 1;
      calls.push("acquire");
      return connection;
    },
  };

  return {
    calls,
    executions,
    dependencies,
    get acquiredConnections() {
      return acquiredConnections;
    },
  };
}

test("audit insert uses the server actor and the database timestamp", () => {
  assert.equal(
    implementationPlanAuditActorType,
    "authenticated-admin"
  );

  assert.match(
    implementationPlanAuditInsertSql,
    /INSERT INTO implementation_plan_audit/
  );
  assert.match(
    implementationPlanAuditInsertSql,
    /implementation_plan_id/
  );
  assert.match(
    implementationPlanAuditInsertSql,
    /previous_status/
  );
  assert.match(
    implementationPlanAuditInsertSql,
    /next_status/
  );
  assert.match(
    implementationPlanAuditInsertSql,
    /actor_type/
  );
  assert.doesNotMatch(
    implementationPlanAuditInsertSql,
    /created_at/
  );
  assert.doesNotMatch(
    implementationPlanAuditInsertSql,
    /updated_at/
  );
  assert.doesNotMatch(
    implementationPlanAuditInsertSql,
    /reviewer/i
  );
});

test("migration 008 is an idempotent append-only audit table with no backfill", () => {
  const source = fs.readFileSync(
    migrationPath,
    "utf8"
  );

  assert.match(
    source,
    /CREATE TABLE IF NOT EXISTS implementation_plan_audit/
  );
  assert.match(source, /PRIMARY KEY \(id\)/);
  assert.match(
    source,
    /implementation_plan_id BIGINT UNSIGNED NOT NULL/
  );
  assert.match(source, /previous_status ENUM/);
  assert.match(source, /next_status ENUM/);
  assert.match(source, /'authenticated-admin'/);
  assert.match(
    source,
    /created_at TIMESTAMP NOT NULL\s+DEFAULT CURRENT_TIMESTAMP/
  );
  assert.match(
    source,
    /INDEX idx_implementation_plan_audit_implementation_plan_id/
  );
  assert.match(
    source,
    /INDEX idx_implementation_plan_audit_created_at/
  );
  assert.match(
    source,
    /FOREIGN KEY \(implementation_plan_id\)\s+REFERENCES implementation_plans\(id\)\s+ON DELETE RESTRICT/
  );
  assert.match(source, /ON UPDATE CASCADE/);
  assert.doesNotMatch(source, /ON DELETE CASCADE/i);
  assert.doesNotMatch(source, /ON DELETE SET NULL/i);
  assert.doesNotMatch(source, /\bINSERT\b/i);
  assert.doesNotMatch(
    source,
    /UPDATE\s+implementation_plan/i
  );
  assert.doesNotMatch(source, /DELETE\s+FROM/i);
  assert.doesNotMatch(source, /ON UPDATE CURRENT_TIMESTAMP/);
});

test("a missing audit insert does not count as recorded", () => {
  assert.throws(
    () => assertImplementationPlanAuditRecorded(0),
    {
      message:
        "Implementation plan status transition audit record was not created.",
    }
  );

  assert.throws(
    () => assertImplementationPlanAuditRecorded(2),
    {
      message:
        "Implementation plan status transition audit record was not created.",
    }
  );

  assert.doesNotThrow(() =>
    assertImplementationPlanAuditRecorded(1)
  );
});

test("a successful transition updates and audits on one connection, then commits", async () => {
  const harness = createHarness({
    plan: savedImplementationPlan(),
  });

  const result =
    await transitionImplementationPlanStatus(
      {
        implementationPlanId: 7,
        nextStatus: "ready-for-review",
      },
      harness.dependencies
    );

  assert.deepEqual(result, {
    implementationPlanId: 7,
    previousStatus: "draft",
    status: "ready-for-review",
  });

  assert.equal(harness.acquiredConnections, 1);
  assert.deepEqual(harness.calls, [
    "load",
    "acquire",
    "begin",
    "update",
    "audit",
    "commit",
    "release",
  ]);
  assert.deepEqual(harness.executions, [
    {
      sql: implementationPlanStatusTransitionSql,
      values: ["ready-for-review", 7, "draft"],
    },
    {
      sql: implementationPlanAuditInsertSql,
      values: [
        7,
        "draft",
        "ready-for-review",
        "authenticated-admin",
      ],
    },
  ]);
});

test("ready-for-review can be authorized with an audit row", async () => {
  const harness = createHarness({
    plan: savedImplementationPlan({
      status: "ready-for-review",
    }),
  });

  const result =
    await transitionImplementationPlanStatus(
      {
        implementationPlanId: 7,
        nextStatus: "authorized",
      },
      harness.dependencies
    );

  assert.equal(result.previousStatus, "ready-for-review");
  assert.equal(result.status, "authorized");
  assert.deepEqual(
    harness.executions[1]?.values,
    [
      7,
      "ready-for-review",
      "authorized",
      "authenticated-admin",
    ]
  );
  assert.deepEqual(harness.calls.at(-2), "commit");
  assert.deepEqual(harness.calls.at(-1), "release");
  assert.equal(harness.calls.includes("rollback"), false);
});

test("ready-for-review can be rejected with an audit row", async () => {
  const harness = createHarness({
    plan: savedImplementationPlan({
      status: "ready-for-review",
      production_authorized: false,
    }),
  });

  await transitionImplementationPlanStatus(
    {
      implementationPlanId: 7,
      nextStatus: "rejected",
    },
    harness.dependencies
  );

  assert.deepEqual(
    harness.executions[1]?.values,
    [
      7,
      "ready-for-review",
      "rejected",
      "authenticated-admin",
    ]
  );
});

test("request identity fields cannot choose the audit actor", async () => {
  const harness = createHarness({
    plan: savedImplementationPlan(),
  });

  const request = {
    implementationPlanId: 7,
    nextStatus: "ready-for-review" as const,
    reviewer: "alice",
    actorType: "named-admin",
    createdBy: "alice",
  };

  await transitionImplementationPlanStatus(
    request,
    harness.dependencies
  );

  assert.equal(
    harness.executions[1]?.values[3],
    "authenticated-admin"
  );
});

test("a missing plan does not open a transaction or write an audit row", async () => {
  const harness = createHarness({
    plan: null,
  });

  await assert.rejects(
    () =>
      transitionImplementationPlanStatus(
        {
          implementationPlanId: 7,
          nextStatus: "ready-for-review",
        },
        harness.dependencies
      ),
    {
      message: "Implementation plan not found.",
    }
  );

  assert.deepEqual(harness.calls, ["load"]);
  assert.deepEqual(harness.executions, []);
});

test("a duplicate status does not open a transaction or write an audit row", async () => {
  const harness = createHarness({
    plan: savedImplementationPlan({
      status: "ready-for-review",
    }),
  });

  await assert.rejects(
    () =>
      transitionImplementationPlanStatus(
        {
          implementationPlanId: 7,
          nextStatus: "ready-for-review",
        },
        harness.dependencies
      ),
    {
      message:
        "Implementation plan #7 is already ready-for-review.",
    }
  );

  assert.deepEqual(harness.calls, ["load"]);
  assert.deepEqual(harness.executions, []);
});

test("an invalid transition does not open a transaction or write an audit row", async () => {
  const invalidTransitions: readonly [
    ImplementationPlanStatus,
    ImplementationPlanStatus,
  ][] = [
    ["draft", "authorized"],
    ["draft", "rejected"],
    ["authorized", "rejected"],
    ["rejected", "draft"],
    ["ready-for-review", "draft"],
  ];

  for (const [currentStatus, nextStatus] of invalidTransitions) {
    const harness = createHarness({
      plan: savedImplementationPlan({
        status: currentStatus,
      }),
    });

    await assert.rejects(
      () =>
        transitionImplementationPlanStatus(
          {
            implementationPlanId: 7,
            nextStatus,
          },
          harness.dependencies
        ),
      {
        message: `Invalid implementation plan status transition: ${currentStatus} -> ${nextStatus}.`,
      }
    );

    assert.deepEqual(harness.calls, ["load"]);
    assert.deepEqual(harness.executions, []);
  }
});

test("a production-authorized plan does not open a transaction or write an audit row", async () => {
  for (const productionAuthorized of [true, 1]) {
    const harness = createHarness({
      plan: savedImplementationPlan({
        production_authorized: productionAuthorized,
      }),
    });

    await assert.rejects(
      () =>
        transitionImplementationPlanStatus(
          {
            implementationPlanId: 7,
            nextStatus: "ready-for-review",
          },
          harness.dependencies
        ),
      {
        message:
          "An implementation plan with production authorization cannot be transitioned by this review action.",
      }
    );

    assert.deepEqual(harness.calls, ["load"]);
    assert.deepEqual(harness.executions, []);
  }
});

test("an invalid id does not load a plan or acquire a connection", async () => {
  for (const implementationPlanId of [0, -1, 1.5, Number.NaN]) {
    const harness = createHarness({
      plan: savedImplementationPlan(),
    });

    await assert.rejects(
      () =>
        transitionImplementationPlanStatus(
          {
            implementationPlanId,
            nextStatus: "ready-for-review",
          },
          harness.dependencies
        ),
      {
        message:
          "implementationPlanId must be a positive safe integer.",
      }
    );

    assert.deepEqual(harness.calls, []);
  }
});

test("a concurrent transition rolls back without an audit row and releases the connection", async () => {
  for (const updateAffectedRows of [0, 2]) {
    const harness = createHarness({
      plan: savedImplementationPlan(),
      updateAffectedRows,
    });

    await assert.rejects(
      () =>
        transitionImplementationPlanStatus(
          {
            implementationPlanId: 7,
            nextStatus: "ready-for-review",
          },
          harness.dependencies
        ),
      {
        message:
          "Implementation plan status changed before this transition could be completed.",
      }
    );

    assert.equal(harness.acquiredConnections, 1);
    assert.deepEqual(harness.calls, [
      "load",
      "acquire",
      "begin",
      "update",
      "rollback",
      "release",
    ]);
    assert.equal(harness.executions.length, 1);
    assert.equal(
      harness.executions[0]?.sql,
      implementationPlanStatusTransitionSql
    );
  }
});

test("an audit insert failure rolls back the status change and releases the connection", async () => {
  const harness = createHarness({
    plan: savedImplementationPlan(),
    failOn: "audit",
  });

  await assert.rejects(
    () =>
      transitionImplementationPlanStatus(
        {
          implementationPlanId: 7,
          nextStatus: "ready-for-review",
        },
        harness.dependencies
      ),
    {
      message: "audit failed",
    }
  );

  assert.deepEqual(harness.calls, [
    "load",
    "acquire",
    "begin",
    "update",
    "audit",
    "rollback",
    "release",
  ]);
  assert.equal(harness.calls.includes("commit"), false);
});

test("an audit insert that writes no row rolls back and does not commit", async () => {
  const harness = createHarness({
    plan: savedImplementationPlan(),
    auditAffectedRows: 0,
  });

  await assert.rejects(
    () =>
      transitionImplementationPlanStatus(
        {
          implementationPlanId: 7,
          nextStatus: "ready-for-review",
        },
        harness.dependencies
      ),
    {
      message:
        "Implementation plan status transition audit record was not created.",
    }
  );

  assert.deepEqual(harness.calls, [
    "load",
    "acquire",
    "begin",
    "update",
    "audit",
    "rollback",
    "release",
  ]);
});

test("a commit failure rolls back and still releases the connection", async () => {
  const harness = createHarness({
    plan: savedImplementationPlan(),
    failOn: "commit",
  });

  await assert.rejects(
    () =>
      transitionImplementationPlanStatus(
        {
          implementationPlanId: 7,
          nextStatus: "ready-for-review",
        },
        harness.dependencies
      ),
    {
      message: "commit failed",
    }
  );

  assert.deepEqual(harness.calls, [
    "load",
    "acquire",
    "begin",
    "update",
    "audit",
    "commit",
    "rollback",
    "release",
  ]);
});

test("a failed rollback still releases the connection and preserves the original error", async () => {
  const harness = createHarness({
    plan: savedImplementationPlan(),
    failOn: "rollback",
    updateAffectedRows: 0,
  });

  const originalConsoleError = console.error;
  console.error = () => {};

  try {
    await assert.rejects(
      () =>
        transitionImplementationPlanStatus(
          {
            implementationPlanId: 7,
            nextStatus: "ready-for-review",
          },
          harness.dependencies
        ),
      {
        message:
          "Implementation plan status changed before this transition could be completed.",
      }
    );
  } finally {
    console.error = originalConsoleError;
  }

  assert.deepEqual(harness.calls, [
    "load",
    "acquire",
    "begin",
    "update",
    "rollback",
    "release",
  ]);
});

test("a failed begin still rolls back and releases the connection", async () => {
  const harness = createHarness({
    plan: savedImplementationPlan(),
    failOn: "begin",
  });

  await assert.rejects(
    () =>
      transitionImplementationPlanStatus(
        {
          implementationPlanId: 7,
          nextStatus: "ready-for-review",
        },
        harness.dependencies
      ),
    {
      message: "begin failed",
    }
  );

  assert.deepEqual(harness.calls, [
    "load",
    "acquire",
    "begin",
    "rollback",
    "release",
  ]);
  assert.deepEqual(harness.executions, []);
});

test("an update failure rolls back without an audit row and releases the connection", async () => {
  const harness = createHarness({
    plan: savedImplementationPlan(),
    failOn: "update",
  });

  await assert.rejects(
    () =>
      transitionImplementationPlanStatus(
        {
          implementationPlanId: 7,
          nextStatus: "ready-for-review",
        },
        harness.dependencies
      ),
    {
      message: "update failed",
    }
  );

  assert.deepEqual(harness.calls, [
    "load",
    "acquire",
    "begin",
    "update",
    "rollback",
    "release",
  ]);
  assert.equal(
    harness.executions.some(
      (execution) =>
        execution.sql === implementationPlanAuditInsertSql
    ),
    false
  );
});
