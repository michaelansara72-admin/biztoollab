import test from "node:test";
import assert from "node:assert/strict";
import { createElement, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";

import OperatingOutlookCalculator from "../src/app/calculators/operating-outlook/OperatingOutlookCalculator";
import OperatingOutlookPage from "../src/app/calculators/operating-outlook/page";
import OperatingResilienceCalculator from "../src/app/calculators/operating-resilience/OperatingResilienceCalculator";
import OperatingResiliencePage from "../src/app/calculators/operating-resilience/page";

/**
 * Server markup for the initialization gate.
 * useEffect does not run here, so this is the hydration HTML:
 * blank fields, no example results, and no live region around results.
 * Restoration, Back/Forward, and Strict Mode stay in the browser check
 * because this project has no DOM test runner.
 */

function render(node: ReactElement) {
  return renderToStaticMarkup(
    createElement(AppRouterContext.Provider, { value: {} as never }, node),
  );
}

function assertLoadingShell(html: string) {
  assert.match(html, /Preparing these fields\./);
  assert.match(html, /role="status"/);
  assert.match(html, /aria-busy="true"/);
  assert.match(html, /for="monthlyRevenue-input"/);
  assert.match(html, /id="monthlyRevenue-input"/);
  assert.match(html, /aria-describedby="monthlyRevenue-help"/);
  assert.match(html, /id="variableCostRatePercent-input"/);
  assert.match(html, /id="monthlyFixedCosts-input"/);
  assert.match(html, /Sales for one month, before costs\./);
  assert.match(html, /disabled=""/);
  assert.doesNotMatch(html, /aria-live/);
  assert.doesNotMatch(html, /role="alert"/);
  assert.doesNotMatch(html, /aria-invalid/);
  assert.doesNotMatch(html, /\$2,000\.00/);
  assert.doesNotMatch(html, /\$10,000\.00/);
  assert.doesNotMatch(html, /\$5,000\.00/);
  assert.doesNotMatch(html, /\$3,000\.00/);
  assert.doesNotMatch(html, /value="10000"/);
  assert.doesNotMatch(html, /value="30"/);
  assert.doesNotMatch(html, /value="5000"/);
  assert.doesNotMatch(html, /Monthly scenarios/);
  assert.doesNotMatch(html, />This month</);
  assert.doesNotMatch(html, /What these figures suggest/);
  assert.doesNotMatch(html, /Explore operating resilience/);
  assert.doesNotMatch(html, /Return to Operating Outlook/);
}

test("outlook server HTML waits for initialization", () => {
  assertLoadingShell(render(createElement(OperatingOutlookCalculator)));
});

test("resilience server HTML waits for initialization", () => {
  assertLoadingShell(render(createElement(OperatingResilienceCalculator)));
});

test("outlook page keeps the worked example outside the calculator", () => {
  const html = render(createElement(OperatingOutlookPage));

  assert.match(html, /Preparing these fields\./);
  assert.match(html, /A worked example/);
  assert.match(html, /Suppose monthly revenue is \$10,000/);
  assert.doesNotMatch(html, /\$2,000\.00/);
  assert.doesNotMatch(html, /\$10,000\.00/);
});

test("resilience page keeps the worked example outside the calculator", () => {
  const html = render(createElement(OperatingResiliencePage));

  assert.match(html, /Preparing these fields\./);
  assert.match(html, /A worked example/);
  assert.match(html, /Suppose monthly revenue is \$10,000/);
  assert.match(html, /approximately \$2,857\.14/);
  assert.doesNotMatch(html, /\$2,000\.00/);
});
