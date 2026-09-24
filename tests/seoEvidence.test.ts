import test from "node:test";
import assert from "node:assert/strict";

import {
  createSeoEvidenceFingerprint,
  serializeSeoEvidence,
  type SeoEvidence,
} from "../src/lib/seoEvidence";

function evidence(
  overrides: Partial<SeoEvidence> = {}
): SeoEvidence {
  return {
    siteUrl: "sc-domain:biztoollab.com",

    period: {
      startDate: "2026-08-25",
      endDate: "2026-09-21",
    },

    metrics: {
      clicks: 25,
      impressions: 2500,
      ctr: 0.01,
      position: 42.5,
    },

    queries: [
      {
        query: "business calculator",
        clicks: 10,
        impressions: 1000,
        ctr: 0.01,
        position: 35,
      },
      {
        query: "profit calculator",
        clicks: 5,
        impressions: 500,
        ctr: 0.01,
        position: 28,
      },
    ],

    pages: [
      {
        page: "https://biztoollab.com/",
        clicks: 15,
        impressions: 1500,
        ctr: 0.01,
        position: 30,
      },
    ],

    ...overrides,
  };
}

test("identical evidence produces identical fingerprints", () => {
  const first = evidence();
  const second = evidence();

  assert.equal(
    createSeoEvidenceFingerprint(first),
    createSeoEvidenceFingerprint(second)
  );
});

test("fingerprint changes when a metric changes", () => {
  const first = evidence();

  const second = evidence({
    metrics: {
      ...first.metrics,
      clicks: first.metrics.clicks + 1,
    },
  });

  assert.notEqual(
    createSeoEvidenceFingerprint(first),
    createSeoEvidenceFingerprint(second)
  );
});

test("fingerprint changes when query evidence changes", () => {
  const first = evidence();

  const second = evidence({
    queries: first.queries.map((row, index) =>
      index === 0
        ? {
            ...row,
            impressions: row.impressions + 1,
          }
        : row
    ),
  });

  assert.notEqual(
    createSeoEvidenceFingerprint(first),
    createSeoEvidenceFingerprint(second)
  );
});

test("fingerprint changes when page ordering changes", () => {
  const first = evidence({
    pages: [
      {
        page: "https://biztoollab.com/a",
        clicks: 5,
        impressions: 500,
        ctr: 0.01,
        position: 20,
      },
      {
        page: "https://biztoollab.com/b",
        clicks: 10,
        impressions: 1000,
        ctr: 0.01,
        position: 30,
      },
    ],
  });

  const second = evidence({
    pages: [...first.pages].reverse(),
  });

  assert.notEqual(
    createSeoEvidenceFingerprint(first),
    createSeoEvidenceFingerprint(second)
  );
});

test("serialization is deterministic for identical evidence", () => {
  const first = evidence();
  const second = evidence();

  assert.equal(
    serializeSeoEvidence(first),
    serializeSeoEvidence(second)
  );
});

test("rejects non-finite evidence metrics", () => {
  for (const invalidValue of [
    NaN,
    Infinity,
    -Infinity,
  ]) {
    const invalidEvidence = evidence();

    invalidEvidence.metrics.clicks = invalidValue;

    assert.throws(
      () => serializeSeoEvidence(invalidEvidence),
      /finite/i
    );

    assert.throws(
      () => createSeoEvidenceFingerprint(invalidEvidence),
      /finite/i
    );
  }
});