import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createElement, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";

import Home from "../src/app/page";
import CalculatorsPage from "../src/app/calculators/page";
import sitemap from "../src/app/sitemap";
import { findCalculatorSearchMatch } from "../src/app/components/ToolSearch";
import {
  metadata as resilienceMetadata,
} from "../src/app/calculators/operating-resilience/page";

const resilienceHref = "/calculators/operating-resilience";
const outlookHref = "/calculators/operating-outlook";
const carWashHref = "/calculators/car-wash-profit-roi-calculator";

const existingHrefs = [
  "/calculators/laundromat-profit-calculator",
  "/calculators/vending-machine-profit-calculator",
  carWashHref,
  "/calculators/startup-cost-calculator",
  "/calculators/break-even-calculator",
  "/calculators/profit-margin-calculator",
  "/calculators/roi-calculator",
  outlookHref,
];

function render(node: ReactElement) {
  return renderToStaticMarkup(
    createElement(AppRouterContext.Provider, { value: {} as never }, node),
  );
}

function countOccurrences(value: string, needle: string) {
  return value.split(needle).length - 1;
}

test("homepage discovery lists Operating Resilience and the existing calculators", () => {
  const html = render(createElement(Home));

  assert.equal(countOccurrences(html, `href="${resilienceHref}"`), 1);
  assert.match(html, /Operating Resilience Assessment/);
  assert.match(
    html,
    /Evaluate a business&#x27;s ability to withstand changes in revenue, costs, or operating conditions\./,
  );

  for (const href of existingHrefs) {
    assert.ok(html.includes(`href="${href}"`), href);
  }
});

test("calculator directory lists Operating Resilience and the existing calculators", () => {
  const html = render(createElement(CalculatorsPage));

  assert.equal(countOccurrences(html, `href="${resilienceHref}"`), 1);
  assert.match(html, /Operating Resilience Assessment/);
  assert.match(html, /not a guaranteed outcome/);

  for (const href of existingHrefs) {
    assert.equal(countOccurrences(html, `href="${href}"`), 1);
  }
});

test("search finds Operating Resilience by name and relevant terms", () => {
  const queries = [
    "operating resilience",
    "Operating Resilience Assessment",
    "business resilience",
    "financial resilience",
    "operating risk",
    "cost pressure",
    "revenue changes",
    "resilience",
  ];

  for (const query of queries) {
    assert.equal(findCalculatorSearchMatch(query)?.href, resilienceHref, query);
  }
});

test("existing search results stay on their current calculators", () => {
  const expected = new Map<string, string>([
    ["laundromat", "/calculators/laundromat-profit-calculator"],
    ["vending", "/calculators/vending-machine-profit-calculator"],
    ["car wash", carWashHref],
    ["carwash", carWashHref],
    ["startup costs", "/calculators/startup-cost-calculator"],
    ["break-even", "/calculators/break-even-calculator"],
    ["break even", "/calculators/break-even-calculator"],
    ["profit margin", "/calculators/profit-margin-calculator"],
    ["roi", "/calculators/roi-calculator"],
    ["operating outlook", outlookHref],
    ["operating profit", outlookHref],
    ["scenario analysis", outlookHref],
    ["operating", outlookHref],
  ]);

  for (const [query, href] of expected) {
    assert.equal(findCalculatorSearchMatch(query)?.href, href, query);
  }

  assert.equal(findCalculatorSearchMatch("   "), null);
});

test("sitemap includes Operating Resilience once and keeps existing entries", () => {
  const entries = sitemap();
  const resilience = entries.filter(
    (entry) => entry.url === "https://biztoollab.com/calculators/operating-resilience",
  );

  assert.equal(resilience.length, 1);
  assert.equal(resilience[0]?.changeFrequency, "monthly");
  assert.equal(resilience[0]?.priority, 0.9);

  const urls = entries.map((entry) => entry.url);
  assert.equal(new Set(urls).size, urls.length);
  assert.ok(urls.includes("https://biztoollab.com/calculators/operating-outlook"));
  assert.ok(
    urls.includes("https://biztoollab.com/calculators/car-wash-profit-roi-calculator"),
  );

  const carWash = entries.find(
    (entry) =>
      entry.url === "https://biztoollab.com/calculators/car-wash-profit-roi-calculator",
  );
  assert.equal(carWash?.changeFrequency, "monthly");
  assert.equal(carWash?.priority, 0.9);

  const about = entries.find((entry) => entry.url === "https://biztoollab.com/about");
  assert.equal(about?.changeFrequency, "monthly");
  assert.equal(about?.priority, 0.6);
});

test("Operating Resilience metadata stays indexable and canonicalizes its own URL", () => {
  assert.equal(resilienceMetadata.title, "Operating Resilience Assessment");
  assert.match(
    String(resilienceMetadata.description),
    /planning estimates, not forecasts/,
  );
  assert.equal(resilienceMetadata.robots, undefined);
  assert.equal(
    resilienceMetadata.alternates?.canonical,
    "https://biztoollab.com/calculators/operating-resilience",
  );
});

test("Financial Journey links remain between Outlook and Resilience", () => {
  const outlook = readFileSync(
    "src/app/calculators/operating-outlook/OperatingOutlookCalculator.tsx",
    "utf8",
  );
  const resilience = readFileSync(
    "src/app/calculators/operating-resilience/OperatingResilienceCalculator.tsx",
    "utf8",
  );

  assert.match(outlook, /href="\/calculators\/operating-resilience"/);
  assert.match(outlook, /router\.push\("\/calculators\/operating-resilience"\)/);
  assert.match(resilience, /href="\/calculators\/operating-outlook"/);
  assert.match(resilience, /router\.push\("\/calculators\/operating-outlook"\)/);
});
