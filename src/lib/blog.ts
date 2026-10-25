import fs from 'node:fs';
import path from 'node:path';
import { canonicalApplicationOrigin } from './applicationOrigin';

export const BLOG_ORIGIN = canonicalApplicationOrigin;
export const articles = [
  { slug: 'how-to-calculate-business-break-even-point', title: 'How to Calculate Your Business Break-Even Point', description: 'Learn the break-even formula, calculate your sales target, and understand what changes your break-even point.', category: 'Business Planning', calculator: '/calculators/break-even-calculator', calculatorLabel: 'Break-Even Calculator' },
  { slug: 'how-much-profit-can-a-laundromat-make', title: 'How Much Profit Can a Laundromat Make?', description: 'Explore laundromat revenue, operating expenses, profitability, and the assumptions behind a realistic forecast.', category: 'Industry Guides', calculator: '/calculators/laundromat-profit-calculator', calculatorLabel: 'Laundromat Profit Calculator' },
  { slug: 'understanding-business-profit-margins', title: 'Understanding Business Profit Margins', description: 'Understand gross, operating, and net profit margins with examples and practical ways to interpret your results.', category: 'Financial Fundamentals', calculator: '/calculators/profit-margin-calculator', calculatorLabel: 'Profit Margin Calculator' },
] as const;
export const getArticle = (slug: string) => articles.find(a => a.slug === slug);
export const blogUrl = (slug?: string) => `${BLOG_ORIGIN}/blog${slug ? `/${slug}` : ''}`;
export function readArticle(slug: string) {
  if (!getArticle(slug)) return null;
  return fs.readFileSync(path.join(process.cwd(), 'content', 'blog', `${slug}.md`), 'utf8');
}
