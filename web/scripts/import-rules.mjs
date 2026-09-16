import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { parse } from 'node-html-parser';
import { validateBody, safeUrl } from '../src/lib/content.js';

const sources = [
  ['CAP_Premier_League_2026_Rules.html', 'cap-premier-league-2026', 'CAP Premier League 2026'],
  ['CAP_T20_Fall_League_2026_Rules.html', 'cap-t20-fall-league-2026', 'CAP T20 Fall League 2026'],
  ['CAP_Womens_Premier_League_2026_Rules.html', 'cap-womens-premier-league-2026', "CAP Women's Premier League 2026"],
];
const blockTags = { P: 'paragraph', UL: 'bulletList', OL: 'orderedList', LI: 'listItem', BLOCKQUOTE: 'blockquote', TABLE: 'table', TR: 'tableRow', TD: 'tableCell', TH: 'tableHeader', HR: 'horizontalRule' };
const markTags = { STRONG: 'bold', B: 'bold', EM: 'italic', I: 'italic', U: 'underline' };

function convert(node, marks = []) {
  if (node.nodeType === 3) return node.text ? [{ type: 'text', text: node.text, ...(marks.length ? { marks } : {}) }] : [];
  const tag = node.tagName;
  if (['STYLE', 'SCRIPT', 'BUTTON', 'IMG'].includes(tag)) return [];
  if (tag === 'BR') return [{ type: 'hardBreak' }];
  let nextMarks = marks;
  if (markTags[tag]) nextMarks = [...marks, { type: markTags[tag] }];
  if (tag === 'A' && safeUrl(node.getAttribute('href'))) nextMarks = [...marks, { type: 'link', attrs: { href: safeUrl(node.getAttribute('href')) } }];
  const children = (node.childNodes || []).flatMap((child) => convert(child, nextMarks));
  if (/^H[1-6]$/.test(tag)) return [{ type: 'heading', attrs: { level: Math.max(2, Math.min(4, Number(tag[1]))) }, content: children }];
  const type = blockTags[tag];
  if (type) {
    let content = children;
    if (['listItem', 'tableCell', 'tableHeader'].includes(type)) content = wrapInline(children);
    if (['table', 'tableRow', 'bulletList', 'orderedList'].includes(type)) content = children.filter((child) => child.type !== 'text' && child.type !== 'hardBreak');
    const attrs = ['tableCell', 'tableHeader'].includes(type) ? { colspan: Number(node.getAttribute('colspan')) || 1, rowspan: Number(node.getAttribute('rowspan')) || 1 } : undefined;
    return [{ type, ...(attrs ? { attrs } : {}), ...(content.length ? { content } : {}) }];
  }
  const classes = (node.getAttribute?.('class') || '').split(/\s+/);
  if (classes.some((name) => name.startsWith('callout'))) return [{ type: 'blockquote', attrs: { tone: classes.includes('callout-red') ? 'danger' : classes.includes('callout-blue') ? 'info' : 'warning' }, content: wrapInline(children) }];
  return children;
}

function wrapInline(children) {
  const result = [];
  let inline = [];
  const flush = () => {
    if (inline.some((node) => node.type !== 'text' || node.text.trim())) result.push({ type: 'paragraph', content: inline });
    inline = [];
  };
  for (const child of children) {
    if (child.type === 'text' || child.type === 'hardBreak') inline.push(child);
    else { flush(); result.push(child); }
  }
  flush();
  return result.length ? result : [{ type: 'paragraph' }];
}

const documents = [];
for (const [filename, id, title] of sources) {
  const html = await readFile(new URL(`../../${filename}`, import.meta.url), 'utf8');
  const root = parse(html);
  for (const node of root.querySelectorAll('.cover, .toc, .no-print, .footer, footer, style, script')) node.remove();
  const body = { type: 'doc', content: wrapInline(convert(root.querySelector('body'))) };
  validateBody(body);
  const headings = body.content.filter((node) => node.type === 'heading');
  if (headings.length < 8) throw new Error(`Import lost sections: ${filename}`);
  documents.push({ id, title, summary: '2026 league playing conditions. Imported from the CAP source document.', body, status: 'draft', publishAt: '2026-01-01T00:00:00.000Z', revision: 0, season: '2026', sourceFile: filename, reviewRequired: true, reviewed: false, reviewNote: 'Confirm the adopted MCC edition, vague ICC references, dates, fees and team names before publishing.' });
  console.log(`${filename}: ${headings.length} headings imported; source preserved.`);
}
const destination = new URL('../src/data/imported-rules.json', import.meta.url);
await mkdir(new URL('../src/data/', import.meta.url), { recursive: true });
await writeFile(destination, `${JSON.stringify(documents, null, 2)}\n`);
console.log(`Local draft bundle: ${fileURLToPath(destination)}. No Firebase writes performed.`);