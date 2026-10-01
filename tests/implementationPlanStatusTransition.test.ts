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

test("ready-for-review can transition to authorized", () => {
  assert.equal(
    canTransitionImplementationPlanStatus(
      "ready-for-review",
      "authorized"
    ),
    true
  );
});

test("ready-for-review can transition to rejected", () => {
  assert.equal(
    canTransitionImplementationPlanStatus(
      "ready-for-review",
      "rejected"
    ),
    true
  );
});

test("draft cannot transition directly to authorized", () => {
  assert.equal(
    canTransitionImplementationPlanStatus(
      "draft",
      "authorized"
    ),
    false
  );
});

test("draft cannot transition directly to rejected", () => {
  assert.equal(
    canTransitionImplementationPlanStatus(
      "draft",
      "rejected"
    ),
    false
  );
});

test("authorized has no outgoing transitions", () => {
  for (const nextStatus of statuses) {
    assert.equal(
      canTransitionImplementationPlanStatus(
        "authorized",
        nextStatus
      ),
      false,
      `authorized -> ${nextStatus}`
    );
  }
});

test("rejected has no outgoing transitions", () => {
  for (const nextStatus of statuses) {
    assert.equal(
      canTransitionImplementationPlanStatus(
        "rejected",
        nextStatus
      ),
      false,
      `rejected -> ${nextStatus}`
    );
  }
});

test("no other current status transition is allowed", () => {
  const allowedTransitions = new Set([
    "draft->ready-for-review",
    "ready-for-review->authorized",
    "ready-for-review->rejected",
  ]);

  for (const currentStatus of statuses) {
    for (const nextStatus of statuses) {
      assert.equal(
        canTransitionImplementationPlanStatus(
          currentStatus,
          nextStatus
        ),
        allowedTransitions.has(
          `${currentStatus}->${nextStatus}`
        ),
        `${currentStatus} -> ${nextStatus}`
      );
    }
  }
});

test("a production-authorized plan cannot transition through this path", () => {
  const reviewRejection =
    getImplementationPlanStatusTransitionRejection({
      currentStatus: "draft",
      nextStatus: "ready-for-review",
      productionAuthorized: true,
    });

  assert.equal(
    reviewRejection,
    "An implementation plan with production authorization cannot be transitioned by this review action."
  );

  const authorizeRejection =
    getImplementationPlanStatusTransitionRejection({
      currentStatus: "ready-for-review",
      nextStatus: "authorized",
      productionAuthorized: true,
    });

  assert.equal(
    authorizeRejection,
    "An implementation plan with production authorization cannot be transitioned by this review action."
  );

  const rejectRejection =
    getImplementationPlanStatusTransitionRejection({
      currentStatus: "ready-for-review",
      nextStatus: "rejected",
      productionAuthorized: true,
    });

  assert.equal(
    rejectRejection,
    "An implementation plan with production authorization cannot be transitioned by this review action."
  );

  assert.match(
    implementationPlanStatusTransitionSql,
    /AND production_authorized = FALSE/
  );
  assert.doesNotMatch(
    implementationPlanStatusTransitionSql,
    /production_authorized\s*=\s*TRUE/i
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
