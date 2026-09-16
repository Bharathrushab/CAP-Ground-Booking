import test from 'node:test';
import assert from 'node:assert/strict';
import { safeUrl, slugify, validateRecord, validateBody, isPublic, freshRecord, localDate, registrationOpen } from '../src/lib/content.js';

test('external links reject executable and credential-bearing URLs', () => {
  for (const value of ['javascript:alert(1)', 'data:text/html,test', 'http://example.com', 'https://user:pass@example.com', '/local']) assert.equal(safeUrl(value), '');
  assert.equal(safeUrl('https://forms.google.com/registration'), 'https://forms.google.com/registration');
});
test('slugs cannot route outside a resource', () => {
  assert.equal(slugify("Women's Premier League 2026"), 'women-s-premier-league-2026');
  assert.throws(() => validateRecord({ ...freshRecord(), id: '../admin', title: 'Test' }));
});
test('drafts, scheduled posts and expired posts stay out of public listings', () => {
  const base = { status: 'published', publishAt: '2026-01-01T00:00:00Z' };
  const now = new Date('2026-09-15T00:00:00Z');
  assert.equal(isPublic(base, now), true);
  assert.equal(isPublic({ ...base, status: 'draft' }, now), false);
  assert.equal(isPublic({ ...base, publishAt: '2027-01-01' }, now), false);
  assert.equal(isPublic({ ...base, expiresAt: '2026-09-01' }, now), false);
});
test('unreviewed imports cannot be published', () => {
  assert.throws(() => validateRecord({ ...freshRecord(), id: 'rules', title: 'Rules', reviewRequired: true, status: 'published' }), /Review/);
});
test('rich text rejects unknown nodes and unsafe links', () => {
  assert.throws(() => validateBody({ type: 'doc', content: [{ type: 'script' }] }));
  assert.throws(() => validateBody({ type: 'doc', content: [{ type: 'text', text: 'Click', marks: [{ type: 'link', attrs: { href: 'javascript:alert(1)' } }] }] }));
});
test('practice dates use Peoria time at UTC midnight', () => {
  assert.equal(localDate(new Date('2026-09-15T01:00:00Z')), '2026-09-14');
});

test('expired registration links are not offered', () => {
  const record = { stage: 'registration_open', registrationUrl: 'https://forms.google.com/cap', registrationDeadline: '2026-09-14' };
  assert.equal(registrationOpen(record, new Date('2026-09-15T01:00:00Z')), true);
  assert.equal(registrationOpen(record, new Date('2026-09-15T20:00:00Z')), false);
  assert.equal(registrationOpen({ ...record, registrationUrl: 'javascript:alert(1)' }), false);
});

test('expiry and related rules URLs are validated', () => {
  const record = { ...freshRecord(), title: 'Announcement', id: 'announcement' };
  assert.throws(() => validateRecord({ ...record, expiresAt: 'invalid' }), /Expiry/);
  assert.throws(() => validateRecord({ ...record, rulesSlug: '../admin' }), /slug/);
});