import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parse } from 'node-html-parser';
import { validateBody, bodyText } from '../src/lib/content.js';

const documents = JSON.parse(readFileSync(new URL('../src/data/imported-rules.json', import.meta.url), 'utf8'));
function nodesOfType(node, type) { return (node.type === type ? 1 : 0) + (node.content || []).reduce((count, child) => count + nodesOfType(child, type), 0); }
for (const document of documents) test(`${document.id}: headings, tables, lists and callouts survive migration`, () => {
  const source = parse(readFileSync(new URL(`../../${document.sourceFile}`, import.meta.url), 'utf8'));
  source.querySelectorAll('.cover, .toc, .no-print, .footer, footer, style, script').forEach((node) => node.remove());
  assert.equal(nodesOfType(document.body, 'heading'), source.querySelectorAll('h1,h2,h3,h4,h5,h6').length);
  assert.equal(nodesOfType(document.body, 'table'), source.querySelectorAll('table').length);
  assert.equal(nodesOfType(document.body, 'listItem'), source.querySelectorAll('li').length);
  assert.equal(nodesOfType(document.body, 'blockquote'), source.querySelectorAll('.callout,.callout-red,.callout-blue').length);
  assert.equal(document.status, 'draft');
  validateBody(document.body);
  const plain = source.querySelector('body').text.replace(/\s+/g, '');
  assert.equal(bodyText(document.body).replace(/\s+/g, ''), plain);
});