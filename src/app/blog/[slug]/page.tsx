import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import MarkdownArticle from '@/components/blog/MarkdownArticle';
import { articles, blogUrl, getArticle, readArticle } from '@/lib/blog';
type Props = { params: Promise<{ slug: string }> };
export function generateStaticParams() { return articles.map(({ slug }) => ({ slug })); }
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) return { title: 'Article Not Found', robots: { index: false } };
  return { title: article.title, description: article.description, alternates: { canonical: blogUrl(slug) }, openGraph: { title: article.title, description: article.description, url: blogUrl(slug), type: 'article', siteName: 'BizToolLab' } };
}
export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) notFound();
  const markdown = readArticle(slug);
  if (!markdown) notFound();
  const schema = { '@context': 'https://schema.org', '@type': 'Article', headline: article.title, description: article.description, mainEntityOfPage: { '@type': 'WebPage', '@id': blogUrl(slug) }, author: { '@type': 'Organization', name: 'BizToolLab' }, publisher: { '@type': 'Organization', name: 'BizToolLab', url: 'https://biztoollab.com' } };
  return <main className="min-h-screen bg-slate-50 text-slate-900">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, '\\u003c') }} />
    <header className="border-b bg-white"><nav aria-label="Article navigation" className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-4 px-6 py-5"><Link href="/" className="text-xl font-bold">BizToolLab</Link><div className="flex gap-5 text-sm font-semibold"><Link href="/blog">Insights</Link><Link href="/calculators">Calculators</Link></div></nav></header>
    <article className="mx-auto max-w-4xl px-6 py-12 sm:py-16"><Link href="/blog" className="text-sm font-semibold text-blue-700 hover:underline">← All insights</Link><p className="mt-10 text-xs font-bold uppercase tracking-widest text-blue-700">{article.category}</p><h1 className="mt-3 text-4xl font-bold leading-tight tracking-tight sm:text-5xl">{article.title}</h1><p className="mt-5 text-lg leading-8 text-slate-600">{article.description}</p><p className="mt-4 text-sm text-slate-500">Published by <Link href="/about" className="font-semibold text-slate-700 underline">BizToolLab</Link>. Questions or corrections: <Link href="/contact" className="font-semibold text-slate-700 underline">Contact</Link>.</p><div className="mt-10 rounded-2xl border bg-white px-6 py-8 shadow-sm sm:px-10"><MarkdownArticle markdown={markdown} /></div><aside className="mt-10 rounded-2xl bg-slate-900 p-7 text-white sm:p-9"><h2 className="text-2xl font-bold">Put the numbers to work</h2><p className="mt-3 leading-7 text-slate-200">Explore your own assumptions with a free calculator. Results are estimates, not guarantees.</p><Link href={article.calculator} className="mt-6 inline-flex min-h-11 items-center rounded-lg bg-white px-5 font-semibold text-slate-900 hover:bg-slate-100">{article.calculatorLabel} →</Link></aside></article>
    <footer className="border-t bg-white px-6 py-8 text-center text-sm text-slate-600">Educational content only. <Link href="/about" className="underline">About</Link> · <Link href="/contact" className="underline">Contact</Link> · <Link href="/blog" className="underline">More BizToolLab Insights</Link></footer>
  </main>;
}
