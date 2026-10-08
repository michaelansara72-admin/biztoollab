import test from "node:test";
import assert from "node:assert/strict";

import {
  createSeoEvidenceFingerprint,
} from "../src/lib/seoEvidence";
import {
  createEvidenceFromSnapshot,
  describeSeoEvidenceState,
  evidenceCoverageFor,
  resolveAdminSeoOpportunityEvidence,
  resolveSeoOpportunityEvidence,
  seoEvidenceCoverageDescription,
  seoEvidencePageRowLimit,
  seoEvidenceQueryRowLimit,
  seoOpportunityEvidencePrompt,
  type SeoSearchConsoleQuery,
  type SeoSnapshotSaveRecord,
  type SnapshotEvidenceRecord,
} from "../src/lib/seoOpportunityEvidence";

function snapshot(
  overrides: Partial<SnapshotEvidenceRecord> = {}
): SnapshotEvidenceRecord {
  return {
    id: 7,
    site_url: "sc-domain:biztoollab.com",
    evidence_start: "2026-09-10",
    evidence_end: "2026-10-07",
    clicks: 25,
    impressions: 2500,
    ctr: 0.01,
    position: 42.5,
    queries_json: [
      {
        query: "business calculator",
        clicks: 10,
        impressions: 1000,
        ctr: 0.01,
        position: 35,
      },
    ],
    pages_json: [
      {
        page: "https://biztoollab.com/",
        clicks: 15,
        impressions: 1500,
        ctr: 0.01,
        position: 30,
      },
    ],
    collected_at: "2026-10-07T15:00:00.000Z",
    ...overrides,
  };
}

test("a reused snapshot is labeled and keeps its collection time", async () => {
  const stored = snapshot();
  let captured = false;

  const resolution = await resolveSeoOpportunityEvidence({
    existingSnapshot: stored,
    captureAndSave: async () => {
      captured = true;
      return snapshot({ id: 99, clicks: 1 });
    },
  });

  assert.equal(captured, false);
  assert.equal(resolution.evidenceState, "stored-snapshot");
  assert.equal(
    resolution.collectedAt,
    "2026-10-07T15:00:00.000Z"
  );
  assert.equal(resolution.snapshot.id, 7);
  assert.equal(resolution.evidence.metrics.clicks, 25);
  assert.equal(
    resolution.evidenceFingerprint,
    createSeoEvidenceFingerprint(
      createEvidenceFromSnapshot(stored)
    )
  );
  assert.match(
    describeSeoEvidenceState({
      evidenceState: resolution.evidenceState,
      collectedAt: resolution.collectedAt,
    }),
    /reuses a stored Search Console snapshot collected at 2026-10-07T15:00:00.000Z/
  );
  assert.match(
    describeSeoEvidenceState({
      evidenceState: resolution.evidenceState,
      collectedAt: resolution.collectedAt,
    }),
    /not a new Google pull/
  );
});

function googleQuery(): SeoSearchConsoleQuery {
  return async (_token, _start, _end, dimensions, rowLimit) => {
    if (!dimensions) {
      return {
        rows: [
          {
            clicks: 99,
            impressions: 990,
            ctr: 0.1,
            position: 4,
          },
        ],
      };
    }

    assert.equal(rowLimit, 1000);

    if (dimensions[0] === "query") {
      return {
        rows: [
          {
            keys: ["losing query"],
            clicks: 99,
            impressions: 990,
            ctr: 0.1,
            position: 4,
          },
        ],
      };
    }

    return {
      rows: [
        {
          keys: ["https://losing.example/"],
          clicks: 99,
          impressions: 990,
          ctr: 0.1,
          position: 4,
        },
      ],
    };
  };
}

test("the route capture path fingerprints the persisted snapshot, not the losing Google response", async () => {
  const stored = snapshot({
    id: 4,
    clicks: 25,
    queries_json: [
      {
        query: "stored query",
        clicks: 3,
        impressions: 30,
        ctr: 0.1,
        position: 8,
      },
    ],
    pages_json: [
      {
        page: "https://biztoollab.com/stored",
        clicks: 4,
        impressions: 40,
        ctr: 0.1,
        position: 9,
      },
    ],
    collected_at: "2026-10-07T12:00:00.000Z",
  });
  const saved: SeoSnapshotSaveRecord[] = [];

  const resolution = await resolveAdminSeoOpportunityEvidence({
    siteUrl: "sc-domain:biztoollab.com",
    startDate: "2026-09-10",
    endDate: "2026-10-07",
    loadExistingSnapshot: async () => null,
    getAccessToken: async () => "token",
    querySearchConsole: googleQuery(),
    saveSnapshot: async (record) => {
      saved.push(record);
      return { id: stored.id };
    },
    reloadSnapshot: async () => stored,
  });

  const prompt = seoOpportunityEvidencePrompt(resolution.evidence);
  const losingFingerprint = createSeoEvidenceFingerprint({
    siteUrl: "sc-domain:biztoollab.com",
    period: {
      startDate: "2026-09-10",
      endDate: "2026-10-07",
    },
    metrics: {
      clicks: saved[0].clicks,
      impressions: saved[0].impressions,
      ctr: saved[0].ctr,
      position: saved[0].position,
    },
    queries: saved[0].queries,
    pages: saved[0].pages,
  });

  assert.equal(saved[0].clicks, 99);
  assert.equal(saved[0].queries[0].query, "losing query");
  assert.equal(saved[0].pages[0].page, "https://losing.example/");
  assert.equal(resolution.evidenceState, "fresh-capture");
  assert.equal(
    resolution.collectedAt,
    "2026-10-07T12:00:00.000Z"
  );
  assert.equal(resolution.snapshot.id, 4);
  assert.equal(resolution.evidence.metrics.clicks, 25);
  assert.equal(resolution.evidence.queries[0].query, "stored query");
  assert.equal(
    resolution.evidence.pages[0].page,
    "https://biztoollab.com/stored"
  );
  assert.match(prompt, /stored query/);
  assert.match(prompt, /https:\/\/biztoollab.com\/stored/);
  assert.doesNotMatch(prompt, /losing query/);
  assert.doesNotMatch(prompt, /losing\.example/);
  assert.equal(
    resolution.evidenceFingerprint,
    createSeoEvidenceFingerprint(resolution.evidence)
  );
  assert.equal(
    resolution.evidenceFingerprint,
    createSeoEvidenceFingerprint(
      createEvidenceFromSnapshot(stored)
    )
  );
  assert.notEqual(
    resolution.evidenceFingerprint,
    losingFingerprint
  );
  assert.match(
    describeSeoEvidenceState({
      evidenceState: resolution.evidenceState,
      collectedAt: resolution.collectedAt,
    }),
    /captured for this request at 2026-10-07T12:00:00.000Z/
  );
});

test("a stored snapshot is reused without calling Google", async () => {
  const stored = snapshot({
    collected_at: new Date("2026-10-07T16:30:00.000Z"),
  });
  let captured = false;

  const resolution = await resolveAdminSeoOpportunityEvidence({
    siteUrl: stored.site_url,
    startDate: "2026-09-10",
    endDate: "2026-10-07",
    loadExistingSnapshot: async () => stored,
    getAccessToken: async () => {
      captured = true;
      return "token";
    },
    querySearchConsole: async () => {
      captured = true;
      return { rows: [] };
    },
    saveSnapshot: async () => {
      captured = true;
      return { id: 99 };
    },
    reloadSnapshot: async () => {
      captured = true;
      return snapshot({ id: 99, clicks: 1 });
    },
  });

  assert.equal(captured, false);
  assert.equal(resolution.evidenceState, "stored-snapshot");
  assert.equal(
    resolution.collectedAt,
    "2026-10-07T16:30:00.000Z"
  );
  assert.equal(resolution.evidence.metrics.clicks, 25);
  assert.match(
    describeSeoEvidenceState({
      evidenceState: resolution.evidenceState,
      collectedAt: resolution.collectedAt,
    }),
    /reuses a stored Search Console snapshot collected at 2026-10-07T16:30:00.000Z/
  );
});

test("a missing collection timestamp is not invented", async () => {
  const resolution = await resolveSeoOpportunityEvidence({
    existingSnapshot: snapshot({
      collected_at: null,
    }),
    captureAndSave: async () => {
      throw new Error("stored snapshot should not be recaptured");
    },
  });

  assert.equal(resolution.collectedAt, null);
  assert.match(
    describeSeoEvidenceState({
      evidenceState: resolution.evidenceState,
      collectedAt: resolution.collectedAt,
    }),
    /No collection timestamp was stored/
  );
  assert.doesNotMatch(
    describeSeoEvidenceState({
      evidenceState: resolution.evidenceState,
      collectedAt: resolution.collectedAt,
    }),
    /\d{4}-\d{2}-\d{2}T/
  );
});

test("malformed stored evidence fails before a fingerprint is created", async () => {
  const malformed = [
    snapshot({ queries_json: null }),
    snapshot({ pages_json: null }),
    snapshot({ queries_json: "not-json" }),
    snapshot({ pages_json: "{}" }),
    snapshot({ queries_json: "null" }),
    snapshot({
      queries_json: [
        {
          query: "business calculator",
          clicks: null,
          impressions: 1,
          ctr: 0,
          position: 1,
        },
      ],
    }),
    snapshot({
      queries_json: [
        {
          query: "business calculator",
          impressions: 1,
          ctr: 0,
          position: 1,
        },
      ],
    }),
    snapshot({
      pages_json: [
        {
          page: "https://biztoollab.com/",
          clicks: "",
          impressions: 1,
          ctr: 0,
          position: 1,
        },
      ],
    }),
    snapshot({
      queries_json: [
        {
          query: "business calculator",
          clicks: true,
          impressions: 1,
          ctr: 0,
          position: 1,
        },
      ],
    }),
    snapshot({
      queries_json: [
        {
          query: "business calculator",
          clicks: Number.POSITIVE_INFINITY,
          impressions: 1,
          ctr: 0,
          position: 1,
        },
      ],
    }),
    snapshot({
      clicks: null as unknown as number,
    }),
  ];

  for (const stored of malformed) {
    assert.throws(() => createEvidenceFromSnapshot(stored));
  }

  await assert.rejects(
    () =>
      resolveAdminSeoOpportunityEvidence({
        siteUrl: "sc-domain:biztoollab.com",
        startDate: "2026-09-10",
        endDate: "2026-10-07",
        loadExistingSnapshot: async () =>
          snapshot({ queries_json: null }),
        getAccessToken: async () => {
          throw new Error("invalid evidence should not call Google");
        },
        querySearchConsole: async () => {
          throw new Error("invalid evidence should not call Google");
        },
        saveSnapshot: async () => {
          throw new Error("invalid evidence should not be saved");
        },
        reloadSnapshot: async () => {
          throw new Error("invalid evidence should not reload");
        },
      }),
    /query evidence is invalid/
  );

  await assert.rejects(
    () =>
      resolveAdminSeoOpportunityEvidence({
        siteUrl: "sc-domain:biztoollab.com",
        startDate: "2026-09-10",
        endDate: "2026-10-07",
        loadExistingSnapshot: async () => null,
        getAccessToken: async () => "token",
        querySearchConsole: googleQuery(),
        saveSnapshot: async () => ({ id: 4 }),
        reloadSnapshot: async () =>
          snapshot({
            id: 4,
            pages_json: null,
          }),
      }),
    /page evidence is invalid/
  );
});

test("explicit empty arrays and numeric zero remain valid evidence", () => {
  const stored = snapshot({
    clicks: "0.0000",
    impressions: "2500.0000",
    ctr: "0.01000000",
    position: "42.50000000",
    queries_json: [],
    pages_json: "[]",
  });
  const withZero = snapshot({
    queries_json: [
      {
        query: "business calculator",
        clicks: 0,
        impressions: 0,
        ctr: 0,
        position: 0,
      },
    ],
  });

  const empty = createEvidenceFromSnapshot(stored);
  const zero = createEvidenceFromSnapshot(withZero);

  assert.deepEqual(empty.queries, []);
  assert.deepEqual(empty.pages, []);
  assert.equal(empty.metrics.clicks, 0);
  assert.equal(empty.metrics.impressions, 2500);
  assert.equal(zero.queries[0].clicks, 0);
  assert.equal(
    createSeoEvidenceFingerprint(empty),
    createSeoEvidenceFingerprint(
      createEvidenceFromSnapshot(stored)
    )
  );
});

test("coverage metadata requests 1000 rows without calling the lists or totals complete", () => {
  const coverage = evidenceCoverageFor(
    createEvidenceFromSnapshot(snapshot())
  );

  assert.equal(
    seoEvidenceQueryRowLimit,
    1000
  );
  assert.equal(
    seoEvidencePageRowLimit,
    1000
  );
  assert.equal(coverage.maxQueryRowsRequested, 1000);
  assert.equal(coverage.maxPageRowsRequested, 1000);
  assert.equal(coverage.queryRowsReturned, 1);
  assert.equal(coverage.pageRowsReturned, 1);
  assert.equal(
    coverage.queryAndPageListsRepresentCompleteInventory,
    false
  );
  assert.equal(
    coverage.headlineTotalsLimitedToListedRows,
    false
  );
  assert.equal(
    coverage.description,
    seoEvidenceCoverageDescription
  );
  assert.match(coverage.description, /Up to 1,000 query rows/);
  assert.match(coverage.description, /1,000 page rows/);
  assert.match(coverage.description, /not a complete inventory/);
  assert.match(
    coverage.description,
    /Headline totals are separate and are not limited/
  );
});
