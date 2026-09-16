import { parse } from 'node-html-parser';
import { readFile, writeFile } from 'node:fs/promises';
import { laws, mccHub } from '../src/data/laws.js';

const fileArgument = process.argv.indexOf('--index-file');
let html;
if (fileArgument !== -1) html = await readFile(process.argv[fileArgument + 1], 'utf8');
else {
  const response = await fetch(mccHub, { signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`MCC index returned ${response.status}`);
  html = await response.text();
}
const root = parse(html);
const links = {};
for (const anchor of root.querySelectorAll('a')) {
  const match = anchor.text.replace(/\s+/g, ' ').match(/LAW\s*(\d+)\b/i);
  const href = anchor.getAttribute('href');
  if (match && href) {
    const url = new URL(href, mccHub);
    if (url.hostname === 'www.lords.org' && url.pathname.startsWith('/mcc/the-laws/')) links[Number(match[1])] = url.href;
  }
}
const verified = {};
for (const law of laws) {
  const url = links[law.number];
  if (!url) throw new Error(`No official link found for Law ${law.number}`);
  if (!process.argv.includes('--discover-only')) {
    const page = await fetch(url, { signal: AbortSignal.timeout(30000) });
    if (!page.ok) throw new Error(`Law ${law.number}: HTTP ${page.status}`);
    const pageHtml = await page.text();
    if (!pageHtml.toLowerCase().includes('the law')) throw new Error(`Unexpected content for Law ${law.number}`);
  }
  verified[law.number] = url;
}
const checkedAt = process.argv.includes('--discover-only') ? null : new Date().toISOString();
await writeFile(new URL('../src/data/mcc-links.json', import.meta.url), `${JSON.stringify({ checkedAt, links: verified }, null, 2)}\n`);
console.log(`${checkedAt ? 'Verified' : 'Discovered'} ${Object.keys(verified).length} official Law links. No MCC Law text copied.`);