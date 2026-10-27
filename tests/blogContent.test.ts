import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { articles, blogUrl, getArticle, readArticle } from '../src/lib/blog';

test('each article has a unique slug, calculator link, and content', () => {
  assert.equal(articles.length, 4);
  assert.equal(new Set(articles.map(a => a.slug)).size, 4);
  for (const a of articles) {
    assert.equal(getArticle(a.slug), a);
    assert.match(blogUrl(a.slug), /^https:\/\/biztoollab\.com\/blog\//);
    assert.match(a.calculator, /^\/calculators\//);
    const body = readArticle(a.slug);
    assert.ok(body && body.length > 1200);
    assert.ok(body.includes(`](${a.calculator})`));
  }
});

test("worked examples, disclaimers, and internal links stay accurate", () => {
  const allowed = new Set<string>([
    ...articles.map((article) => article.calculator),
    ...articles.map((article) => `/blog/${article.slug}`),
    "/calculators/profit-margin-calculator",
    "/calculators/break-even-calculator",
    "/calculators/operating-outlook",
  ]);

  for (const article of articles) {
    const body = readArticle(article.slug);
    assert.ok(body);
    const targets = [...body.matchAll(/\]\((\/[^)\s]*)\)/g)].map((match) => match[1]);
    assert.ok(targets.length > 0, article.slug);
    for (const target of targets) {
      assert.equal(allowed.has(target), true, `${article.slug} -> ${target}`);
    }
  }

  const breakEven = readArticle("how-to-calculate-business-break-even-point");
  assert.match(breakEven ?? "", /\$4,800 ÷ \$24 = \*\*200 units per month\*\*/);
  assert.match(breakEven ?? "", /200 × \$40 = \*\*\$8,000 per month\*\*/);
  assert.match(breakEven ?? "", /\$4,800 ÷ \$28, or approximately 172 units/);
  assert.match(breakEven ?? "", /planning estimate, not a prediction/);

  const margins = readArticle("understanding-business-profit-margins");
  assert.match(
    margins ?? "",
    /Gross profit margin: \$20,000 ÷ \$50,000 × 100 = \*\*40%\*\*/,
  );
  assert.match(margins ?? "", /operating margin is \*\*16%\*\*/);
  assert.match(margins ?? "", /net margin is \*\*12%\*\*/);
  assert.match(margins ?? "", /Markup on cost: \$40 ÷ \$60 = \*\*66\.7%\*\*/);

  const laundromat = readArticle("how-much-profit-can-a-laundromat-make");
  assert.match(laundromat ?? "", /24 × 3 × \$4 × 30 = \*\*\$8,640 per month\*\*/);
  assert.match(laundromat ?? "", /20 × 3 × \$2\.50 × 30 = \*\*\$4,500 per month\*\*/);
  assert.match(laundromat ?? "", /\*\*\$13,140 per month\*\*/);
  assert.match(laundromat ?? "", /Total illustrative monthly revenue becomes \*\*\$14,640\*\*/);
  assert.match(laundromat ?? "", /These total \*\*\$10,600\*\*/);
  assert.match(laundromat ?? "", /leaving \*\*\$4,040\*\*/);
  assert.match(laundromat ?? "", /approximately \*\*27\.6%\*\*/);
  assert.match(laundromat ?? "", /not an industry average/);
  assert.match(laundromat ?? "", /not a guaranteed take-home amount/);
  assert.match(laundromat ?? "", /\*\*Operating profit\*\*/);
  assert.match(laundromat ?? "", /\*\*Owner compensation\*\*/);
  assert.match(laundromat ?? "", /\*\*Cash flow\*\*/);
  assert.match(laundromat ?? "", /not an additional profit on top of that figure/);

  const profitable = readArticle("is-your-business-actually-profitable");
  assert.match(profitable ?? "", /400 × \$50 = \*\*\$20,000\*\*/);
  assert.match(profitable ?? "", /400 × \$18 = \*\*\$7,200\*\*/);
  assert.match(profitable ?? "", /Gross profit: \$20,000 − \$7,200 = \*\*\$12,800\*\*/);
  assert.match(profitable ?? "", /Operating profit is \*\*\$6,200\*\*/);
  assert.match(profitable ?? "", /Net profit is \*\*\$4,720\*\*/);
  assert.match(profitable ?? "", /cash decreased by \*\*\$2,580\*\*/);
  assert.match(profitable ?? "", /\$6,600 ÷ \$32 = \*\*206\.25 units\*\*/);
  assert.match(profitable ?? "", /206 units are not sufficient/);
  assert.match(profitable ?? "", /minimum whole-unit sales required is \*\*207 units\*\*/);
  assert.match(profitable ?? "", /Theoretical break-even revenue is \$6,600 ÷ 0\.64 = \*\*\$10,312\.50\*\*/);
  assert.match(profitable ?? "", /Revenue at 207 units is 207 × \$50 = \*\*\$10,350\*\*/);
  assert.match(profitable ?? "", /not an industry average/);
  assert.match(profitable ?? "", /do not replace professional financial or accounting advice/);
});

test("article pages name BizToolLab and calculators link back to the guides", () => {
  const template = fs.readFileSync("src/app/blog/[slug]/page.tsx", "utf8");
  assert.match(template, /Published by/);
  assert.match(template, /href="\/about"/);
  assert.match(template, /href="\/contact"/);
  assert.match(template, /publisher: \{ '@type': 'Organization', name: 'BizToolLab'/);

  const pairs = [
    ["src/app/calculators/break-even-calculator/page.tsx", "/blog/how-to-calculate-business-break-even-point"],
    ["src/app/calculators/laundromat-profit-calculator/page.tsx", "/blog/how-much-profit-can-a-laundromat-make"],
    ["src/app/calculators/profit-margin-calculator/page.tsx", "/blog/understanding-business-profit-margins"],
  ] as const;
  for (const [file, href] of pairs) {
    assert.match(fs.readFileSync(file, "utf8"), new RegExp(href.replaceAll("/", "\\/")));
  }
});
