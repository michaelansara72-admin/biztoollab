import test from "node:test";
import assert from "node:assert/strict";
import { createElement, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";

import Home from "../src/app/page";

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
