/**
 * Renders a course's Markdown cheat sheets to A4 PDFs in the site's paper-and-ink style.
 *
 *   npx tsx scripts/course-content/cheatsheets-to-pdf.tsx teach-a-small-ai-to-think
 *
 * Reads public/courses/<slug>/cheatsheets/*.md and writes a .pdf next to each.
 * Uses the locally installed Playwright Chromium; no network needed except Google Fonts.
 */
import fs from 'node:fs';
import path from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { chromium } from 'playwright';

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=JetBrains+Mono:wght@400;500&family=Newsreader:opsz,wght@6..72,500&display=swap');
@page { size: A4; margin: 14mm 14mm 16mm; }
* { box-sizing: border-box; }
body { margin: 0; background: #F6F3EC; color: #111214; font: 9.6pt/1.45 Inter, system-ui, sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
header { display: flex; justify-content: space-between; align-items: baseline; border-bottom: 1.5px solid #111214; padding-bottom: 6px; margin-bottom: 10px; }
header .eyebrow { color: #C8321A; font-weight: 700; font-size: 7.5pt; letter-spacing: .16em; text-transform: uppercase; }
header .site { font-family: 'JetBrains Mono', monospace; font-size: 8pt; }
h1 { font-family: Newsreader, Georgia, serif; font-weight: 500; font-size: 21pt; line-height: 1.1; margin: 0 0 8px; }
h2 { font-family: Newsreader, Georgia, serif; font-weight: 500; font-size: 13pt; margin: 12px 0 4px; border-left: 3px solid #C8321A; padding-left: 7px; break-after: avoid; }
h3 { font-size: 10pt; margin: 9px 0 3px; break-after: avoid; }
p, li { margin: 3px 0; }
ul, ol { padding-left: 16px; margin: 3px 0; }
strong { font-weight: 700; }
a { color: #C8321A; text-decoration: none; }
code { font-family: 'JetBrains Mono', monospace; font-size: 8.4pt; background: #FFFEFB; border: 1px solid #E2DCCF; border-radius: 4px; padding: 0 3px; }
pre { background: #FFFEFB; border: 1px solid #E2DCCF; border-radius: 8px; padding: 7px 9px; white-space: pre-wrap; break-inside: avoid; }
pre code { border: 0; padding: 0; background: none; }
table { width: 100%; border-collapse: collapse; margin: 6px 0; font-size: 8.6pt; break-inside: avoid; background: #FFFEFB; }
th, td { border: 1px solid #E2DCCF; padding: 3px 6px; text-align: left; vertical-align: top; }
th { background: #EFEAE0; font-weight: 700; }
blockquote { margin: 6px 0; padding: 5px 9px; border-left: 3px solid #C8321A; background: #FFFEFB; }
footer { position: fixed; bottom: -9mm; left: 0; right: 0; font-size: 7pt; color: #6B6A66; display: flex; justify-content: space-between; }
`;

async function main() {
  const slug = process.argv[2];
  if (!slug) throw new Error('Pass the course slug');
  const dir = path.join(process.cwd(), 'public', 'courses', slug, 'cheatsheets');
  const course = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'content', 'courses', slug, 'course.json'), 'utf8')) as { title: string };
  const browser = await chromium.launch();
  try {
    for (const file of fs.readdirSync(dir).filter((name) => name.endsWith('.md'))) {
      const markdown = fs.readFileSync(path.join(dir, file), 'utf8');
      const body = renderToStaticMarkup(<ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>);
      const html = `<!doctype html><html><head><meta charset="utf-8"><style>${CSS}</style></head><body>
        <header><span class="eyebrow">Cheat sheet · ${course.title}</span><span class="site">unicodesnwrites.tech</span></header>
        ${body}
        <footer><span>${course.title}</span><span>unicodesnwrites.tech</span></footer>
      </body></html>`;
      if (process.env.DUMP_HTML) fs.writeFileSync(path.join(process.env.DUMP_HTML, file.replace(/\.md$/, '.html')), html);
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle' });
      const out = path.join(dir, file.replace(/\.md$/, '.pdf'));
      await page.pdf({ path: out, format: 'A4', printBackground: true, preferCSSPageSize: true });
      await page.close();
      console.log(`wrote ${path.relative(process.cwd(), out)}`);
    }
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
