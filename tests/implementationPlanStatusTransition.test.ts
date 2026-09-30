import "./loadTestDatabaseEnv";

import test from "node:test";
import assert from "node:assert/strict";

import {
  assertImplementationPlanStatusTransitionApplied,
  canTransitionImplementationPlanStatus,
  getImplementationPlanStatusTransitionRejection,
  implementationPlanStatusTransitionSql,
  type ImplementationPlanStatus,
} from "../src/lib/implementationPlanRepository";

const statuses: readonly ImplementationPlanStatus[] = [
  "draft",
  "ready-for-review",
  "authorized",
  "rejected",
];

test("draft can transition to ready-for-review", () => {
  assert.equal(
    canTransitionImplementationPlanStatus(
      "draft",
      "ready-for-review"
    ),
    true
  );
});

test("no other current status transition is allowed", () => {
  for (const currentStatus of statuses) {
    for (const nextStatus of statuses) {
      const allowed =
        currentStatus === "draft" &&
        nextStatus === "ready-for-review";

      assert.equal(
        canTransitionImplementationPlanStatus(
          currentStatus,
          nextStatus
        ),
        allowed,
        `${currentStatus} -> ${nextStatus}`
      );
    }
  }
});

test("a production-authorized plan cannot transition through this path", () => {
  const rejection =
    getImplementationPlanStatusTransitionRejection({
      currentStatus: "draft",
      nextStatus: "ready-for-review",
      productionAuthorized: true,
    });

  assert.equal(
    rejection,
    "An implementation plan with production authorization cannot be transitioned by this review action."
  );

  assert.match(
    implementationPlanStatusTransitionSql,
    /AND production_authorized = FALSE/
  );
});

test("an optimistic-lock miss does not report success", () => {
  assert.throws(
    () =>
      assertImplementationPlanStatusTransitionApplied(
        0
      ),
    {
      message:
        "Implementation plan status changed before this transition could be completed.",
    }
  );

  assert.throws(
    () =>
      assertImplementationPlanStatusTransitionApplied(
        2
      ),
    {
      message:
        "Implementation plan status changed before this transition could be completed.",
    }
  );

  assert.doesNotThrow(() =>
    assertImplementationPlanStatusTransitionApplied(1)
  );
});
