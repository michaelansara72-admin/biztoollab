import "./loadTestDatabaseEnv";

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import ImplementationPlanAuditHistory, {
  formatImplementationPlanAuditTimestamp,
} from "../src/app/admin/components/ImplementationPlanAuditHistory";

import {
  getImplementationPlanAuditHistory,
  implementationPlanAuditHistorySql,
  mapImplementationPlanAuditRow,
  type ImplementationPlanAuditHistoryExecutor,
  type ImplementationPlanAuditRecord,
  type ImplementationPlanAuditRow,
} from "../src/lib/implementationPlanRepository";

function listSourceFiles(directory: string): string[] {
  const entries = fs.readdirSync(directory, {
    withFileTypes: true,
  });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...listSourceFiles(fullPath));
      continue;
    }

    if (
      entry.name.endsWith(".ts") ||
      entry.name.endsWith(".tsx")
    ) {
      files.push(fullPath);
    }
  }

  return files;
}

function auditRow(
  overrides: Partial<ImplementationPlanAuditRow> = {}
): ImplementationPlanAuditRow {
  return {
    id: 4,
    implementation_plan_id: 7,
    previous_status: "draft",
    next_status: "ready-for-review",
    actor_type: "authenticated-admin",
    created_at: new Date("2026-04-02T15:04:05.000Z"),
    ...overrides,
  };
}

function createExecutor({
  rows = [],
  error,
}: {
  rows?: readonly ImplementationPlanAuditRow[];
  error?: Error;
} = {}) {
  const calls: {
    sql: string;
    values: readonly [number];
  }[] = [];

  const executor: ImplementationPlanAuditHistoryExecutor = {
    async execute(sql, values) {
      calls.push({
        sql,
        values,
      });

      if (error) {
        throw error;
      }

      return [rows, []];
    },
  };

  return {
    calls,
    executor,
  };
}

function auditRecord(
  overrides: Partial<ImplementationPlanAuditRecord> = {}
): ImplementationPlanAuditRecord {
  return {
    id: 4,
    implementationPlanId: 7,
    previousStatus: "draft",
    nextStatus: "ready-for-review",
    actorType: "authenticated-admin",
    createdAt: new Date("2026-04-02T15:04:05.000Z"),
    ...overrides,
  };
}

test("audit history SQL filters one plan and orders newest first", () => {
  assert.match(
    implementationPlanAuditHistorySql,
    /SELECT\s+id,\s+implementation_plan_id,\s+previous_status,\s+next_status,\s+actor_type,\s+created_at\s+FROM implementation_plan_audit/i
  );
  assert.match(
    implementationPlanAuditHistorySql,
    /WHERE implementation_plan_id = \?/
  );
  assert.match(
    implementationPlanAuditHistorySql,
    /ORDER BY created_at DESC, id DESC/
  );
  assert.equal(
    implementationPlanAuditHistorySql.match(/\?/g)?.length,
    1
  );
  assert.doesNotMatch(
    implementationPlanAuditHistorySql,
    /\bINSERT\b|\bUPDATE\b|\bDELETE\b/i
  );
});

test("audit history query passes only the requested plan id", async () => {
  const harness = createExecutor({
    rows: [auditRow()],
  });

  await getImplementationPlanAuditHistory(
    7,
    harness.executor
  );

  assert.deepEqual(harness.calls, [
    {
      sql: implementationPlanAuditHistorySql,
      values: [7],
    },
  ]);
});

test("audit history preserves newest-first query order", async () => {
  const older = auditRow({
    id: 2,
    created_at: new Date("2026-04-01T10:00:00.000Z"),
    previous_status: "draft",
    next_status: "ready-for-review",
  });
  const newerSameTimeHigherId = auditRow({
    id: 9,
    created_at: new Date("2026-04-03T10:00:00.000Z"),
    previous_status: "ready-for-review",
    next_status: "authorized",
  });
  const newerSameTimeLowerId = auditRow({
    id: 8,
    created_at: new Date("2026-04-03T10:00:00.000Z"),
    previous_status: "ready-for-review",
    next_status: "rejected",
  });

  const harness = createExecutor({
    rows: [
      newerSameTimeHigherId,
      newerSameTimeLowerId,
      older,
    ],
  });

  const records =
    await getImplementationPlanAuditHistory(
      7,
      harness.executor
    );

  assert.deepEqual(
    records.map((record) => record.id),
    [9, 8, 2]
  );
  assert.deepEqual(
    records.map((record) => [
      record.previousStatus,
      record.nextStatus,
    ]),
    [
      ["ready-for-review", "authorized"],
      ["ready-for-review", "rejected"],
      ["draft", "ready-for-review"],
    ]
  );
});

test("audit history maps database rows to typed records", () => {
  const record = mapImplementationPlanAuditRow(
    auditRow({
      id: "11",
      implementation_plan_id: "7",
      created_at: "2026-04-02T15:04:05.000Z",
    })
  );

  assert.deepEqual(record, {
    id: 11,
    implementationPlanId: 7,
    previousStatus: "draft",
    nextStatus: "ready-for-review",
    actorType: "authenticated-admin",
    createdAt: new Date("2026-04-02T15:04:05.000Z"),
  });
});

test("a successful audit query returns the mapped records", async () => {
  const harness = createExecutor({
    rows: [auditRow()],
  });

  const records =
    await getImplementationPlanAuditHistory(
      7,
      harness.executor
    );

  assert.equal(records.length, 1);
  assert.equal(records[0]?.id, 4);
  assert.equal(records[0]?.implementationPlanId, 7);
  assert.equal(records[0]?.actorType, "authenticated-admin");
  assert.equal(
    records[0]?.createdAt.toISOString(),
    "2026-04-02T15:04:05.000Z"
  );
});

test("an empty audit query returns no records", async () => {
  const harness = createExecutor();

  const records =
    await getImplementationPlanAuditHistory(
      7,
      harness.executor
    );

  assert.deepEqual(records, []);
  assert.equal(harness.calls.length, 1);
});

test("an invalid plan id does not query the audit table", async () => {
  for (const implementationPlanId of [
    0,
    -1,
    1.5,
    Number.NaN,
  ]) {
    const harness = createExecutor({
      rows: [auditRow()],
    });

    const records =
      await getImplementationPlanAuditHistory(
        implementationPlanId,
        harness.executor
      );

    assert.deepEqual(records, []);
    assert.deepEqual(harness.calls, []);
  }
});

test("a database query failure is not reported as empty history", async () => {
  const harness = createExecutor({
    error: new Error(
      "connect ECONNREFUSED 127.0.0.1:3306"
    ),
  });

  await assert.rejects(
    () =>
      getImplementationPlanAuditHistory(
        7,
        harness.executor
      ),
    {
      message: "connect ECONNREFUSED 127.0.0.1:3306",
    }
  );
});

test("a malformed audit row fails closed without echoing the row", async () => {
  const harness = createExecutor({
    rows: [
      auditRow({
        actor_type: "alice",
        previous_status: "not-a-status",
      }),
    ],
  });

  await assert.rejects(
    () =>
      getImplementationPlanAuditHistory(
        7,
        harness.executor
      ),
    (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.equal(
        error.message,
        "Implementation plan audit history could not be read."
      );
      assert.equal(error.message.includes("alice"), false);
      assert.equal(
        error.message.includes("not-a-status"),
        false
      );
      return true;
    }
  );
});

test("a row for another plan fails the history read", async () => {
  const harness = createExecutor({
    rows: [
      auditRow({
        implementation_plan_id: 8,
      }),
    ],
  });

  await assert.rejects(
    () =>
      getImplementationPlanAuditHistory(
        7,
        harness.executor
      ),
    {
      message:
        "Implementation plan audit history could not be read.",
    }
  );
});

test("audit timestamps use an explicit UTC label", () => {
  assert.equal(
    formatImplementationPlanAuditTimestamp(
      new Date("2026-04-02T15:04:05.000Z")
    ),
    "Apr 2, 2026, 15:04:05 UTC"
  );

  assert.equal(
    formatImplementationPlanAuditTimestamp(
      "2026-01-09T03:07:08.000Z"
    ),
    "Jan 9, 2026, 03:07:08 UTC"
  );

  assert.equal(
    formatImplementationPlanAuditTimestamp("not-a-date"),
    "Timestamp unavailable"
  );
});

test("audit history renders recorded transitions as read-only text", () => {
  const html = renderToStaticMarkup(
    createElement(ImplementationPlanAuditHistory, {
      implementationPlanId: 7,
      history: {
        status: "ready",
        records: [
          auditRecord({
            id: 9,
            previousStatus: "ready-for-review",
            nextStatus: "authorized",
            createdAt: new Date(
              "2026-04-03T18:30:00.000Z"
            ),
          }),
          auditRecord({
            id: 2,
            previousStatus: "draft",
            nextStatus: "ready-for-review",
            createdAt: new Date(
              "2026-04-01T10:00:00.000Z"
            ),
          }),
        ],
      },
    })
  );

  assert.match(html, /Audit History/);
  assert.match(
    html,
    /Implementation Plan #7/
  );
  assert.match(html, /This history is read-only/);
  assert.match(
    html,
    /Ready For Review → Authorized/
  );
  assert.match(
    html,
    /Draft → Ready For Review/
  );
  assert.match(
    html,
    /Actor type: authenticated-admin/
  );
  assert.match(html, /Apr 3, 2026, 18:30:00 UTC/);
  assert.match(html, /Apr 1, 2026, 10:00:00 UTC/);
  assert.ok(
    html.indexOf("Ready For Review → Authorized") <
      html.indexOf("Draft → Ready For Review")
  );
  assert.doesNotMatch(html, /<button/i);
  assert.doesNotMatch(html, /<form/i);
  assert.doesNotMatch(html, /<input/i);
  assert.doesNotMatch(html, /<textarea/i);
  assert.doesNotMatch(html, /<select/i);
  assert.doesNotMatch(html, /contenteditable/i);
});

test("empty audit history does not invent transitions", () => {
  const html = renderToStaticMarkup(
    createElement(ImplementationPlanAuditHistory, {
      implementationPlanId: 7,
      history: {
        status: "ready",
        records: [],
      },
    })
  );

  assert.match(
    html,
    /No audit events have been recorded for this implementation plan/
  );
  assert.doesNotMatch(html, /→/);
  assert.doesNotMatch(
    html,
    /Audit history is unavailable/
  );
  assert.doesNotMatch(html, /authenticated-admin/);
});

test("an unavailable audit history is distinct from an empty history", () => {
  const html = renderToStaticMarkup(
    createElement(ImplementationPlanAuditHistory, {
      implementationPlanId: 7,
      history: {
        status: "unavailable",
      },
    })
  );

  assert.match(html, /Audit history is unavailable/);
  assert.match(
    html,
    /Recorded transitions for this implementation plan could not be loaded/
  );
  assert.doesNotMatch(
    html,
    /No audit events have been recorded/
  );
  assert.doesNotMatch(html, /ECONNREFUSED/);
  assert.doesNotMatch(html, /mysql/i);
  assert.doesNotMatch(html, /→/);
});

test("rendered history keeps events for the selected plan only", () => {
  const html = renderToStaticMarkup(
    createElement(ImplementationPlanAuditHistory, {
      implementationPlanId: 7,
      history: {
        status: "ready",
        records: [
          auditRecord({
            id: 3,
            implementationPlanId: 8,
            previousStatus: "authorized",
            nextStatus: "rejected",
            createdAt: new Date(
              "2026-05-01T00:00:00.000Z"
            ),
          }),
          auditRecord({
            id: 4,
            implementationPlanId: 7,
            previousStatus: "draft",
            nextStatus: "ready-for-review",
          }),
        ],
      },
    })
  );

  assert.match(html, /Draft → Ready For Review/);
  assert.doesNotMatch(
    html,
    /Authorized → Rejected/
  );
  assert.doesNotMatch(html, /May 1, 2026/);
});

test("audit history is loaded only after the admin session check", () => {
  const pageSource = fs.readFileSync(
    path.join(
      process.cwd(),
      "src/app/admin/page.tsx"
    ),
    "utf8"
  );
  const authIndex = pageSource.indexOf(
    "verifyAdminSessionToken"
  );
  const redirectIndex = pageSource.indexOf(
    'redirect("/admin/login")'
  );
  const auditIndex = pageSource.indexOf(
    "await getImplementationPlanAuditHistory"
  );

  assert.ok(authIndex >= 0);
  assert.ok(redirectIndex > authIndex);
  assert.ok(auditIndex > redirectIndex);
  assert.match(
    pageSource,
    /Unable to load implementation plan audit history:/
  );
  assert.match(pageSource, /status: "unavailable"/);
  assert.doesNotMatch(
    pageSource,
    /auditError\.message/
  );

  const savedPlanSource = fs.readFileSync(
    path.join(
      process.cwd(),
      "src/app/admin/components/SavedImplementationPlan.tsx"
    ),
    "utf8"
  );
  const controlsIndex = savedPlanSource.indexOf(
    "<ImplementationPlanLifecycleControls"
  );
  const historyIndex = savedPlanSource.indexOf(
    "<ImplementationPlanAuditHistory"
  );

  assert.ok(controlsIndex >= 0);
  assert.ok(historyIndex > controlsIndex);

  const historySource = fs.readFileSync(
    path.join(
      process.cwd(),
      "src/app/admin/components/ImplementationPlanAuditHistory.tsx"
    ),
    "utf8"
  );

  assert.doesNotMatch(historySource, /["']use client["']/);
  assert.doesNotMatch(
    historySource,
    /\b(INSERT|UPDATE|DELETE)\b/i
  );

  const apiDirectory = path.join(
    process.cwd(),
    "src/app/api"
  );

  for (const filePath of listSourceFiles(apiDirectory)) {
    const source = fs.readFileSync(filePath, "utf8");

    assert.equal(
      source.includes(
        "getImplementationPlanAuditHistory"
      ),
      false,
      filePath
    );
  }
});
