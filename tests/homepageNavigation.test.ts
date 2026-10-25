import test from "node:test";
import assert from "node:assert/strict";
import { createElement, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";

import Home from "../src/app/page";
import CalculatorsPage from "../src/app/calculators/page";
import SiteFooter from "../src/app/components/SiteFooter";

function render(node: ReactElement) {
  return renderToStaticMarkup(
    createElement(AppRouterContext.Provider, { value: {} as never }, node),
  );
}

test("homepage header navigation stays available on small screens", () => {
  const html = render(createElement(Home));

  assert.match(html, /aria-label="Primary"/);
  assert.doesNotMatch(html, /aria-label="Primary"[^>]*hidden/);
  assert.match(html, /href="\/calculators"/);
  assert.match(html, />All Calculators</);
  assert.match(html, /href="\/blog"/);
  assert.match(html, />Insights</);
  assert.match(html, /href="#tools"/);
  assert.match(html, /href="#categories"/);
  assert.match(html, /href="#about"/);
});

test("homepage category cards link to the calculator directory", () => {
  const html = render(createElement(Home));
  const categorySection = html.slice(
    html.indexOf('id="categories"'),
    html.indexOf('id="tools"'),
  );
  const categoryNames = [
    "Business Calculators",
    "Industry Calculators",
    "Startup Tools",
    "Finance Tools",
  ];

  assert.equal(categorySection.split('href="/calculators"').length - 1, 4);

  for (const name of categoryNames) {
    assert.match(
      categorySection,
      new RegExp(`<a [^>]*href="/calculators"[^>]*>[\\s\\S]*?${name}</h3>`),
      name,
    );
  }
});

test("insights is linked from the homepage, footer, and calculator directory", () => {
  const home = render(createElement(Home));
  const directory = render(createElement(CalculatorsPage));
  const footer = renderToStaticMarkup(createElement(SiteFooter));

  assert.match(home, /href="\/blog"/);
  assert.match(footer, /href="\/blog"/);
  assert.match(footer, />Insights</);
  assert.match(directory, /href="\/blog"/);
  assert.match(directory, /Read BizToolLab Insights/);
  assert.equal(directory.split('href="/calculators/').length - 1, 9);
});
