import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import SearchConsoleComparisonPanel from "../src/app/admin/components/SearchConsoleComparisonPanel";

const storedSnapshot = {
  id: 4,
  siteUrl: "sc-domain:biztoollab.com",
  evidenceStart: "2026-09-10",
  evidenceEnd: "2026-10-07",
  collectedAt: "2026-10-07T12:00:00.000Z",
};

test("a snapshot query failure is not reported as zero stored rows", () => {
  const html = renderToStaticMarkup(
    createElement(SearchConsoleComparisonPanel, {
      snapshots: [],
      snapshotLoad: "unavailable",
    })
  );

  assert.match(html, /could not be loaded/);
  assert.match(html, /does not mean the evidence table is empty/);
  assert.doesNotMatch(html, /currently has/);
  assert.doesNotMatch(html, />0</);
});

test("a successful empty snapshot query reports zero stored rows", () => {
  const html = renderToStaticMarkup(
    createElement(SearchConsoleComparisonPanel, {
      snapshots: [],
      snapshotLoad: "ready",
    })
  );

  assert.match(html, /currently has/);
  assert.match(html, />0</);
  assert.match(html, /stored Search Console snapshots/);
  assert.doesNotMatch(html, /could not be loaded/);
});

test("one stored snapshot is shown as a genuine count", () => {
  const html = renderToStaticMarkup(
    createElement(SearchConsoleComparisonPanel, {
      snapshots: [storedSnapshot],
      snapshotLoad: "ready",
    })
  );

  assert.match(html, />1</);
  assert.match(html, /stored Search Console snapshot\./);
  assert.match(html, /Snapshot #4/);
});
