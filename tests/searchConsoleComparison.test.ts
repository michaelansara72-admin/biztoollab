import test from "node:test";
import assert from "node:assert/strict";

import {
  compareSearchConsoleSnapshots,
  type ComparisonSnapshot,
} from "../src/lib/searchConsoleComparison";

function snapshot(
  overrides: Partial<ComparisonSnapshot> = {}
): ComparisonSnapshot {
  return {
    siteUrl: "sc-domain:biztoollab.com",
    evidenceStart: "2026-08-01",
    evidenceEnd: "2026-08-28",
    clicks: 10,
    impressions: 1000,
    ctr: 0.01,
    position: 50,
    ...overrides,
  };
}

test("compares valid equal-length periods", () => {
  const result = compareSearchConsoleSnapshots(
    snapshot(),
    snapshot({
      evidenceStart: "2026-08-29",
      evidenceEnd: "2026-09-25",
      clicks: 15,
      impressions: 1200,
      position: 45,
    })
  );

  assert.equal(result.valid, true);

  if (!result.valid) return;

  assert.equal(result.periodDays, 28);
  assert.equal(result.metrics.clicks.difference, 5);
  assert.equal(result.metrics.impressions.difference, 200);
  assert.equal(result.metrics.position.difference, -5);
});

test("rejects overlapping periods", () => {
  const result = compareSearchConsoleSnapshots(
    snapshot(),
    snapshot({
      evidenceStart: "2026-08-20",
      evidenceEnd: "2026-09-16",
    })
  );

  assert.equal(result.valid, false);
});

test("rejects unequal period lengths", () => {
  const result = compareSearchConsoleSnapshots(
    snapshot(),
    snapshot({
      evidenceStart: "2026-08-29",
      evidenceEnd: "2026-09-20",
    })
  );

  assert.equal(result.valid, false);
});

test("rejects invalid calendar dates", () => {
  const result = compareSearchConsoleSnapshots(
    snapshot({
      evidenceStart: "2026-02-30",
    }),
    snapshot({
      evidenceStart: "2026-03-01",
      evidenceEnd: "2026-03-28",
    })
  );

  assert.equal(result.valid, false);
});

test("handles zero baseline correctly", () => {
  const result = compareSearchConsoleSnapshots(
    snapshot({
      clicks: 0,
    }),
    snapshot({
      evidenceStart: "2026-08-29",
      evidenceEnd: "2026-09-25",
      clicks: 5,
    })
  );

  assert.equal(result.valid, true);

  if (!result.valid) return;

  assert.equal(
    result.metrics.clicks.percentChange,
    null
  );

  assert.equal(
    result.metrics.clicks.difference,
    5
  );
});

test("rejects negative metrics", () => {
  const result = compareSearchConsoleSnapshots(
    snapshot({
      impressions: -1,
    }),
    snapshot({
      evidenceStart: "2026-08-29",
      evidenceEnd: "2026-09-25",
    })
  );

  assert.equal(result.valid, false);
});

test("rejects snapshots from different Search Console properties", () => {
  const result = compareSearchConsoleSnapshots(
    snapshot(),
    snapshot({
      siteUrl: "sc-domain:example.com",
      evidenceStart: "2026-08-29",
      evidenceEnd: "2026-09-25",
    })
  );

  assert.equal(result.valid, false);

  if (result.valid) return;

  assert.match(
    result.reason,
    /same Search Console property/i
  );
});