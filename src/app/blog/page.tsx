import type { Metadata } from 'next';
import Link from 'next/link';
import { articles, blogUrl } from '@/lib/blog';
export const metadata: Metadata = {
  title: { absolute: 'BizToolLab Insights | Business Guides' },
  description: 'Clear, practical guides to business break-even points, laundromat profitability, and profit margins, with free calculators.',
  alternates: { canonical: blogUrl() },
  openGraph: {
    title: { absolute: 'BizToolLab Insights | Business Guides' },
    description: 'Clear, practical guides to business break-even points, laundromat profitability, and profit margins, with free calculators.',
    url: blogUrl(),
    type: 'website',
  },
};
export default function BlogHome() {
  return <main className="min-h-screen bg-slate-50 text-slate-900">
    <header className="border-b bg-white"><nav aria-label="Insights navigation" className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-5"><Link href="/" className="text-xl font-bold">BizToolLab</Link><div className="flex gap-5 text-sm font-semibold"><Link href="/calculators">Calculators</Link><Link href="/blog" aria-current="page">Insights</Link></div></nav></header>
    <section className="border-b bg-white"><div className="mx-auto max-w-6xl px-6 py-16 sm:py-20"><p className="text-sm font-bold uppercase tracking-widest text-blue-700">BizToolLab Insights</p><h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">Practical insights for better business decisions</h1><p className="mt-5 max-w-3xl text-lg leading-8 text-slate-600">Learn the numbers behind your business, then test your assumptions with free calculators.</p></div></section>
    <section aria-label="Articles" className="mx-auto max-w-6xl px-6 py-14"><div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">{articles.map(a => <article key={a.slug} className="flex flex-col rounded-2xl border bg-white p-7 shadow-sm"><p className="text-xs font-bold uppercase tracking-wider text-blue-700">{a.category}</p><h2 className="mt-3 text-2xl font-bold leading-snug"><Link href={`/blog/${a.slug}`} className="hover:text-blue-700">{a.title}</Link></h2><p className="mt-4 flex-1 leading-7 text-slate-600">{a.description}</p><Link href={`/blog/${a.slug}`} className="mt-7 font-semibold text-blue-700 hover:underline">Read guide →</Link></article>)}</div></section>
    <footer className="border-t bg-white px-6 py-8 text-center text-sm text-slate-600">Educational content, not financial advice. <Link href="/about" className="underline">About BizToolLab</Link></footer>
  </main>;
}
