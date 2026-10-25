import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import sitemap from "../src/app/sitemap";
import { metadata as homeMetadata } from "../src/app/page";
import { metadata as directoryMetadata } from "../src/app/calculators/page";
import { metadata as aboutMetadata } from "../src/app/about/page";
import { metadata as privacyMetadata } from "../src/app/privacy/page";
import { metadata as termsMetadata } from "../src/app/terms/page";
import { metadata as contactMetadata } from "../src/app/contact/page";
import { metadata as outlookMetadata } from "../src/app/calculators/operating-outlook/page";
import { metadata as resilienceMetadata } from "../src/app/calculators/operating-resilience/page";
import { metadata as laundromatMetadata } from "../src/app/calculators/laundromat-profit-calculator/layout";
import { metadata as vendingMetadata } from "../src/app/calculators/vending-machine-profit-calculator/layout";
import { metadata as carWashMetadata } from "../src/app/calculators/car-wash-profit-roi-calculator/layout";
import { metadata as startupMetadata } from "../src/app/calculators/startup-cost-calculator/layout";
import { metadata as breakEvenMetadata } from "../src/app/calculators/break-even-calculator/layout";
import { metadata as profitMarginMetadata } from "../src/app/calculators/profit-margin-calculator/layout";
import { metadata as roiMetadata } from "../src/app/calculators/roi-calculator/layout";
import {
  publicCanonicalPaths,
  publicCanonicalUrl,
} from "../src/lib/publicCanonical";

const canonicalByUrl = new Map<string, string | undefined>([
  [publicCanonicalUrl("/"), canonicalValue(homeMetadata.alternates?.canonical)],
  [
    publicCanonicalUrl("/calculators"),
    canonicalValue(directoryMetadata.alternates?.canonical),
  ],
  [
    publicCanonicalUrl("/calculators/laundromat-profit-calculator"),
    canonicalValue(laundromatMetadata.alternates?.canonical),
  ],
  [
    publicCanonicalUrl("/calculators/vending-machine-profit-calculator"),
    canonicalValue(vendingMetadata.alternates?.canonical),
  ],
  [
    publicCanonicalUrl("/calculators/car-wash-profit-roi-calculator"),
    canonicalValue(carWashMetadata.alternates?.canonical),
  ],
  [
    publicCanonicalUrl("/calculators/startup-cost-calculator"),
    canonicalValue(startupMetadata.alternates?.canonical),
  ],
  [
    publicCanonicalUrl("/calculators/break-even-calculator"),
    canonicalValue(breakEvenMetadata.alternates?.canonical),
  ],
  [
    publicCanonicalUrl("/calculators/profit-margin-calculator"),
    canonicalValue(profitMarginMetadata.alternates?.canonical),
  ],
  [
    publicCanonicalUrl("/calculators/roi-calculator"),
    canonicalValue(roiMetadata.alternates?.canonical),
  ],
  [
    publicCanonicalUrl("/calculators/operating-outlook"),
    canonicalValue(outlookMetadata.alternates?.canonical),
  ],
  [
    publicCanonicalUrl("/calculators/operating-resilience"),
    canonicalValue(resilienceMetadata.alternates?.canonical),
  ],
  [publicCanonicalUrl("/about"), canonicalValue(aboutMetadata.alternates?.canonical)],
  [
    publicCanonicalUrl("/privacy"),
    canonicalValue(privacyMetadata.alternates?.canonical),
  ],
  [publicCanonicalUrl("/terms"), canonicalValue(termsMetadata.alternates?.canonical)],
  [
    publicCanonicalUrl("/contact"),
    canonicalValue(contactMetadata.alternates?.canonical),
  ],
]);

function canonicalValue(canonical: unknown): string | undefined {
  if (typeof canonical === "string") {
    return canonical;
  }

  if (canonical instanceof URL) {
    return canonical.href;
  }

  return undefined;
}

test("each public sitemap URL canonicalizes only itself", () => {
  const entries = sitemap();
  const urls = entries.map((entry) => entry.url);

  assert.deepEqual(
    urls,
    publicCanonicalPaths.map((path) => publicCanonicalUrl(path)),
  );
  assert.equal(new Set(urls).size, urls.length);
  assert.equal(urls.length, 15);

  for (const url of urls) {
    assert.equal(canonicalByUrl.get(url), url);
    assert.equal(url.startsWith("https://biztoollab.com"), true);
    assert.equal(url.includes("://www."), false);
  }
});

test("sitemap omits lastModified and keeps the existing change signals", () => {
  const entries = sitemap();
  const byUrl = new Map(entries.map((entry) => [entry.url, entry]));

  for (const entry of entries) {
    assert.equal(entry.lastModified, undefined);
  }

  assert.equal(byUrl.get("https://biztoollab.com")?.changeFrequency, "weekly");
  assert.equal(byUrl.get("https://biztoollab.com")?.priority, 1);
  assert.equal(
    byUrl.get("https://biztoollab.com/calculators")?.changeFrequency,
    "weekly",
  );
  assert.equal(byUrl.get("https://biztoollab.com/calculators")?.priority, 0.95);
  assert.equal(byUrl.get("https://biztoollab.com/about")?.priority, 0.6);
  assert.equal(byUrl.get("https://biztoollab.com/privacy")?.priority, 0.4);
  assert.equal(byUrl.get("https://biztoollab.com/terms")?.priority, 0.4);
  assert.equal(byUrl.get("https://biztoollab.com/contact")?.priority, 0.5);
});

test("the root and admin layouts do not publish a canonical", () => {
  const rootLayout = readFileSync("src/app/layout.tsx", "utf8");
  const adminLayout = readFileSync("src/app/admin/layout.tsx", "utf8");

  assert.equal(rootLayout.includes("canonical"), false);
  assert.equal(adminLayout.includes("canonical"), false);
  assert.match(rootLayout, /metadataBase: new URL\("https:\/\/biztoollab\.com"\)/);
  assert.match(adminLayout, /index: false/);
});

test("the homepage canonical is the apex origin and not a path on another page", () => {
  assert.equal(publicCanonicalUrl("/"), "https://biztoollab.com");
  assert.equal(homeMetadata.alternates?.canonical, "https://biztoollab.com");
});
