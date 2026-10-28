import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
  compareSearchConsoleSnapshots,
} from "../src/lib/searchConsoleComparison";
import {
  compareHistoricalSearchConsoleEvidence,
  normalizeStoredPageUrl,
  storedSearchConsoleRowLimit,
  type HistoricalSearchConsoleBreakdown,
} from "../src/lib/searchConsoleHistoricalBreakdown";
import { HistoricalImpressionBreakdown } from "../src/app/admin/components/SearchConsoleComparisonPanel";

const apex = "https://biztoollab.com/calculators";
const www = "https://www.biztoollab.com/calculators";
const slashed = "https://biztoollab.com/calculators/";

function page(url: string, impressions: number) {
  return { page: url, impressions };
}

function query(text: string, impressions: number) {
  return { query: text, impressions };
}

function compare(input: {
  baselinePages?: unknown;
  comparisonPages?: unknown;
  baselineQueries?: unknown;
  comparisonQueries?: unknown;
  baselineImpressions?: number;
  comparisonImpressions?: number;
}) {
  return compareHistoricalSearchConsoleEvidence({
    baselinePages: input.baselinePages ?? [],
    comparisonPages: input.comparisonPages ?? [],
    baselineQueries: input.baselineQueries ?? [],
    comparisonQueries: input.comparisonQueries ?? [],
    baselineImpressions: input.baselineImpressions ?? 0,
    comparisonImpressions: input.comparisonImpressions ?? 0,
  });
}

test("matches pages across periods and ranks impression changes", () => {
  const result = compare({
    baselinePages: [
      page(apex, 800),
      page(www, 400),
      page("https://biztoollab.com/about", 32),
    ],
    comparisonPages: [
      page(apex, 50),
      page(www, 450),
      page("https://biztoollab.com/about", 0),
    ],
    baselineImpressions: 1232,
    comparisonImpressions: 500,
  });

  assert.equal(result.pages.state, "ready");
  assert.deepEqual(result.pages.losses[0], {
    label: apex,
    baselineImpressions: 800,
    comparisonImpressions: 50,
    change: -750,
  });
  assert.equal(result.pages.losses[1].label, "https://biztoollab.com/about");
  assert.equal(result.pages.losses[1].comparisonImpressions, 0);
  assert.equal(result.pages.losses[1].change, -32);
  assert.deepEqual(result.pages.gains[0], {
    label: www,
    baselineImpressions: 400,
    comparisonImpressions: 450,
    change: 50,
  });
});

test("keeps www, apex, and trailing-slash URLs distinct", () => {
  assert.notEqual(normalizeStoredPageUrl(apex), normalizeStoredPageUrl(www));
  assert.notEqual(
    normalizeStoredPageUrl(apex),
    normalizeStoredPageUrl(slashed)
  );
  assert.equal(
    normalizeStoredPageUrl("HTTPS://BizToolLab.com/calculators"),
    normalizeStoredPageUrl(apex)
  );

  const result = compare({
    baselinePages: [page(apex, 10), page(www, 7), page(slashed, 3)],
    comparisonPages: [page(apex, 1), page(www, 7), page(slashed, 9)],
  });
  const labels = [
    ...result.pages.losses,
    ...result.pages.gains,
  ].map((row) => row.label);

  assert.equal(labels.filter((label) => label === apex).length, 1);
  assert.equal(labels.filter((label) => label === www).length, 0);
  assert.equal(labels.filter((label) => label === slashed).length, 1);
});

test("matches queries by their exact string", () => {
  const result = compare({
    baselineQueries: [query("car wash", 20), query("Car Wash", 5)],
    comparisonQueries: [query("car wash", 4), query("Car Wash", 9)],
  });

  assert.equal(result.queries.losses[0].label, "car wash");
  assert.equal(result.queries.losses[0].change, -16);
  assert.equal(result.queries.gains[0].label, "Car Wash");
  assert.equal(result.queries.gains[0].change, 4);
});

test("shows a one-period row as not stored rather than zero", () => {
  const result = compare({
    baselinePages: [page(apex, 80)],
    comparisonPages: [page("https://biztoollab.com/blog", 15)],
  });
  const loss = result.pages.losses[0];
  const gain = result.pages.gains[0];

  assert.equal(loss.comparisonImpressions, null);
  assert.equal(loss.change, -80);
  assert.equal(gain.baselineImpressions, null);
  assert.equal(gain.change, 15);
});

test("reports missing and empty JSON without inventing rows", () => {
  const missing = compare({
    baselinePages: null,
    comparisonPages: "not-json",
    baselineQueries: "{}",
    comparisonQueries: "null",
  });

  assert.equal(missing.pages.state, "missing");
  assert.equal(missing.queries.state, "missing");
  assert.equal(missing.pages.losses.length, 0);
  assert.match(
    missing.messages.join(" "),
    /Historical page JSON is missing/
  );
  assert.match(
    missing.messages.join(" "),
    /Historical query JSON is missing/
  );

  const empty = compare({
    baselinePages: "[]",
    comparisonPages: [],
    baselineQueries: [],
    comparisonQueries: [],
  });

  assert.equal(empty.pages.state, "empty");
  assert.equal(empty.queries.state, "empty");
  assert.match(empty.messages.join(" "), /stored page lists are empty/);
  assert.match(empty.messages.join(" "), /stored query lists are empty/);
});

test("excludes malformed rows and does not combine duplicates", () => {
  const result = compare({
    baselinePages: [
      page(apex, 40),
      page("HTTPS://BizToolLab.com/calculators", 99),
      page(apex, -5),
      { page: apex },
      "bad-row",
    ],
    comparisonPages: [page(apex, 10)],
  });

  assert.equal(result.pages.duplicateRecords, 1);
  assert.equal(result.pages.malformedRecords, 3);
  assert.equal(result.pages.losses[0].baselineImpressions, 40);
  assert.equal(result.pages.losses[0].change, -30);
  assert.match(result.messages.join(" "), /Duplicate page records were not combined/);
  assert.match(result.messages.join(" "), /Malformed page records were excluded/);
});

test("does not treat rows omitted by the 1,000-row limit as zero", () => {
  const baselinePages = Array.from(
    { length: storedSearchConsoleRowLimit },
    (_, index) =>
      page(`https://biztoollab.com/page-${index}`, index === 0 ? 90 : 1)
  );
  const result = compare({
    baselinePages,
    comparisonPages: [
      page("https://biztoollab.com/page-0", 20),
    ],
    baselineQueries: [query("kept", 5)],
    comparisonQueries: [query("kept", 5)],
  });

  assert.equal(result.pages.baselineList, "partial");
  assert.equal(result.pages.oneSidedRecordsOmitted, 999);
  assert.equal(result.pages.losses.length, 1);
  assert.equal(result.pages.losses[0].label, "https://biztoollab.com/page-0");
  assert.equal(result.pages.losses[0].comparisonImpressions, 20);
  assert.match(
    result.messages.join(" "),
    /does not prove it had zero impressions/
  );
  assert.equal(
    result.pages.accountsForSitewideImpressionChange,
    false
  );
});

test("limits each ranking to 10 rows and preserves sitewide comparison", () => {
  const baselinePages = Array.from({ length: 12 }, (_, index) =>
    page(`https://biztoollab.com/item-${index}`, 100 - index)
  );
  const comparisonPages = baselinePages.map((row) =>
    page(row.page, row.impressions - 1)
  );
  const baseline = {
    siteUrl: "sc-domain:biztoollab.com",
    evidenceStart: "2026-08-28",
    evidenceEnd: "2026-09-24",
    clicks: 0,
    impressions: 1232,
    ctr: 0,
    position: 45.5,
  };
  const comparison = {
    ...baseline,
    evidenceStart: "2026-09-29",
    evidenceEnd: "2026-10-26",
    impressions: 84,
    position: 14.6,
  };
  const sitewide = compareSearchConsoleSnapshots(baseline, comparison);
  const historical = compare({
    baselinePages,
    comparisonPages,
    baselineImpressions: 1232,
    comparisonImpressions: 84,
  });

  assert.equal(historical.pages.losses.length, 10);
  assert.equal(sitewide.valid, true);
  if (!sitewide.valid) return;
  assert.equal(sitewide.metrics.impressions.before, 1232);
  assert.equal(sitewide.metrics.impressions.after, 84);
  assert.equal(sitewide.metrics.position.difference, 14.6 - 45.5);
  assert.equal(
    historical.pages.accountsForSitewideImpressionChange,
    false
  );
  assert.match(
    historical.messages.join(" "),
    /not a complete explanation of the sitewide impression change/
  );
  assert.match(
    historical.messages.join(" "),
    /does not establish that the same queries ranked higher/
  );
});

test("recognizes when stored page rows account for the sitewide totals", () => {
  const result = compare({
    baselinePages: [page(apex, 30), page(www, 70)],
    comparisonPages: [page(apex, 10), page(www, 5)],
    baselineQueries: [query("profit", 4)],
    comparisonQueries: [query("profit", 1)],
    baselineImpressions: 100,
    comparisonImpressions: 15,
  });

  assert.equal(result.pages.accountsForSitewideImpressionChange, true);
  assert.equal(result.queries.accountsForSitewideImpressionChange, false);
  assert.match(
    result.messages.join(" "),
    /account for the sitewide impression totals/
  );
  assert.doesNotMatch(
    result.messages.join(" "),
    /not a complete explanation of the sitewide impression change/
  );
});

test("renders a recorded zero differently from a missing row", () => {
  const breakdown: HistoricalSearchConsoleBreakdown = compare({
    baselinePages: [page(apex, 0), page(www, 12)],
    comparisonPages: [page(apex, 4)],
    baselineQueries: [],
    comparisonQueries: [],
  });
  const html = renderToStaticMarkup(
    createElement(HistoricalImpressionBreakdown, { breakdown })
  );

  assert.match(html, /Largest page impression gains/);
  assert.match(html, /Not stored/);
  assert.match(html, />0</);
  assert.match(html, /Largest query impression losses/);
  assert.match(html, /stored query lists are empty/);
});
