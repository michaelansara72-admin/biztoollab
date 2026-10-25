import Link from 'next/link';
import type { ReactNode } from 'react';

// Deliberately restricted Markdown: headings, paragraphs, bullet lists, bold and internal links.
// React escapes all text; HTML and external links are never interpreted.
function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\(\/[^)\s]*\))/g).map((part, index) => {
    const bold = /^\*\*([^*]+)\*\*$/.exec(part);
    if (bold) return <strong key={index}>{bold[1]}</strong>;
    const link = /^\[([^\]]+)\]\((\/[^)\s]*)\)$/.exec(part);
    if (link) return <Link key={index} href={link[2]} className="font-semibold underline underline-offset-4 hover:text-blue-700">{link[1]}</Link>;
    return part;
  });
}
export default function MarkdownArticle({ markdown }: { markdown: string }) {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const blocks: ReactNode[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();
    if (!line) { i++; continue; }
    if (line.startsWith('## ')) { blocks.push(<h2 key={i} className="mt-10 mb-4 text-2xl font-bold">{inline(line.slice(3))}</h2>); i++; continue; }
    if (line.startsWith('### ')) { blocks.push(<h3 key={i} className="mt-7 mb-3 text-xl font-semibold">{inline(line.slice(4))}</h3>); i++; continue; }
    if (line.startsWith('- ')) {
      const start = i;
      const items: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('- ')) { items.push(lines[i].trim().slice(2)); i++; }
      blocks.push(<ul key={start} className="my-5 list-disc space-y-2 pl-6">{items.map((item, n) => <li key={n}>{inline(item)}</li>)}</ul>);
      continue;
    }
    const start = i;
    const para: string[] = [];
    while (i < lines.length && lines[i].trim() && !/^(## |### |- )/.test(lines[i].trim())) { para.push(lines[i].trim()); i++; }
    blocks.push(<p key={start} className="my-5 leading-8">{inline(para.join(' '))}</p>);
  }
  return <div className="text-slate-700">{blocks}</div>;
}
