import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import ProfitMarginCalculatorPage from "../src/app/calculators/profit-margin-calculator/page";
import { metadata } from "../src/app/calculators/profit-margin-calculator/layout";

test("default profit margin inputs show operating profit of $8,000 and a 32% margin", () => {
  const html = renderToStaticMarkup(createElement(ProfitMarginCalculatorPage));

  assert.match(html, /Operating Profit/);
  assert.match(html, /Operating Profit Margin/);
  assert.match(html, /\$13,000/);
  assert.match(html, /52\.0%/);
  assert.match(html, /\$8,000/);
  assert.match(html, /32\.0%/);
  assert.match(
    html,
    /Operating profit excludes interest, income taxes, and any costs you did not enter/
  );
  assert.match(html, /href="\/blog\/understanding-business-profit-margins"/);
  assert.doesNotMatch(html, /Net Profit Margin/);
  assert.equal(
    metadata.alternates?.canonical,
    "https://biztoollab.com/calculators/profit-margin-calculator"
  );
});
