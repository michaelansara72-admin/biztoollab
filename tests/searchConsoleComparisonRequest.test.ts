import test from "node:test";
import assert from "node:assert/strict";

import {
  parseSnapshotIds,
  toComparisonSnapshot,
  compareStoredSnapshots,
  type SnapshotRecord,
} from "../src/lib/searchConsoleComparisonRequest";

function record(
  overrides: Partial<SnapshotRecord> = {}
): SnapshotRecord {
  return {
    site_url: "sc-domain:biztoollab.com",
    evidence_start: "2026-07-01",
    evidence_end: "2026-07-28",
    clicks: "10",
    impressions: "1000",
    ctr: "0.01",
    position: "50",
    ...overrides,
  };
}

test("accepts two distinct valid snapshot IDs", () => {
  assert.deepEqual(parseSnapshotIds("12", "13"), {
    valid: true,
    baselineId: 12,
    comparisonId: 13,
  });
});

test("rejects missing snapshot IDs", () => {
  assert.equal(parseSnapshotIds(null, "2").valid, false);
  assert.equal(parseSnapshotIds("1", null).valid, false);
});

test("rejects malformed snapshot IDs", () => {
  for (const value of [
    "",
    "0",
    "-1",
    "1.5",
    "1e3",
    " 1",
    "0x10",
    "abc",
  ]) {
    assert.equal(
      parseSnapshotIds(value, "2").valid,
      false,
      `Expected ${JSON.stringify(value)} to be rejected`
    );
  }
});

test("rejects unsafe and identical snapshot IDs", () => {
  assert.equal(
    parseSnapshotIds("9007199254740992", "2").valid,
    false
  );

  assert.equal(
    parseSnapshotIds("5", "5").valid,
    false
  );
});

test("converts database dates and numeric strings", () => {
  const result = toComparisonSnapshot(
    record({
      evidence_start: new Date("2026-07-01T00:00:00Z"),
      evidence_end: new Date("2026-07-28T00:00:00Z"),
    })
  );

  assert.equal(result.evidenceStart, "2026-07-01");
  assert.equal(result.evidenceEnd, "2026-07-28");
  assert.equal(result.clicks, 10);
  assert.equal(result.impressions, 1000);
  assert.equal(result.ctr, 0.01);
  assert.equal(result.position, 50);
});

test("compares two stored snapshot records", () => {
  const result = compareStoredSnapshots(
    record(),
    record({
      evidence_start: "2026-07-29",
      evidence_end: "2026-08-25",
      clicks: "15",
      impressions: "1200",
      position: "45",
    })
  );

  assert.equal(result.valid, true);

  if (!result.valid) return;

  assert.equal(result.periodDays, 28);
  assert.equal(result.metrics.clicks.difference, 5);
  assert.equal(result.metrics.impressions.difference, 200);
  assert.equal(result.metrics.position.difference, -5);
});

test("rejects stored records from different properties", () => {
  const result = compareStoredSnapshots(
    record(),
    record({
      site_url: "sc-domain:example.com",
      evidence_start: "2026-07-29",
      evidence_end: "2026-08-25",
    })
  );

  assert.equal(result.valid, false);
});

test("rejects invalid stored metric values", () => {
  const result = compareStoredSnapshots(
    record({ clicks: "invalid" }),
    record({
      evidence_start: "2026-07-29",
      evidence_end: "2026-08-25",
    })
  );

  assert.equal(result.valid, false);
});