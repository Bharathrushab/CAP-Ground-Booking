export const resources = {
  announcements: { label: 'Announcements', singular: 'Announcement' },
  leagues: { label: 'Leagues', singular: 'League' },
  tournaments: { label: 'Tournaments', singular: 'Tournament' },
  rules: { label: 'League rules', singular: 'Rules document' },
  committee: { label: 'Committee', singular: 'Committee member' },
  settings: { label: 'Site settings', singular: 'Settings' },
};

export const emptyBody = { type: 'doc', content: [{ type: 'paragraph' }] };
export const practiceUrl = 'https://cap-practice-booking.web.app';
export const textBody = (text) => ({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] });

export function safeUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : '';
  } catch { return ''; }
}

export function slugify(value) {
  return value.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

const nodeTypes = new Set(['doc', 'paragraph', 'text', 'heading', 'bulletList', 'orderedList', 'listItem', 'blockquote', 'hardBreak', 'horizontalRule', 'table', 'tableRow', 'tableCell', 'tableHeader']);
const markTypes = new Set(['bold', 'italic', 'strike', 'underline', 'code', 'link']);

export function validateBody(body) {
  if (!body || body.type !== 'doc' || JSON.stringify(body).length > 350000) throw new Error('Document is missing or too large.');
  let count = 0;
  function visit(node, depth) {
    if (++count > 15000 || depth > 30 || !nodeTypes.has(node.type)) throw new Error('Unsupported document structure.');
    if (node.type === 'text' && typeof node.text !== 'string') throw new Error('Invalid document text.');
    if (node.marks) for (const mark of node.marks) {
      if (!markTypes.has(mark.type)) throw new Error('Unsupported text format.');
      if (mark.type === 'link' && !safeUrl(mark.attrs?.href)) throw new Error('Links must use HTTPS and cannot contain credentials.');
    }
    for (const child of node.content || []) visit(child, depth + 1);
  }
  visit(body, 0);
  return body;
}

export function bodyText(body) {
  return body?.text || (body?.content || []).map(bodyText).join(' ');
}

export function validateRecord(record) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(record.id || '')) throw new Error('Use a lowercase URL slug with letters, numbers, and hyphens.');
  if (!record.title?.trim() || record.title.length > 160) throw new Error('A title of up to 160 characters is required.');
  if (!['draft', 'published'].includes(record.status)) throw new Error('Choose draft or published.');
  if (record.registrationUrl && !safeUrl(record.registrationUrl)) throw new Error('Registration requires a valid HTTPS URL.');
  if (record.practiceBookingUrl && !safeUrl(record.practiceBookingUrl)) throw new Error('Practice booking requires a valid HTTPS URL.');
  if (record.startDate && record.endDate && record.endDate < record.startDate) throw new Error('End date must not precede start date.');
  if (record.status === 'published' && record.reviewRequired && !record.reviewed) throw new Error('Review the imported playing conditions before publication.');
  if (!Number.isFinite(new Date(record.publishAt).getTime())) throw new Error('Choose a valid publication date.');
  if (record.expiresAt && (!Number.isFinite(new Date(record.expiresAt).getTime()) || new Date(record.expiresAt) <= new Date(record.publishAt))) throw new Error('Expiry must be after publication.');
  if (record.rulesSlug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(record.rulesSlug)) throw new Error('Choose a valid rules document slug.');
  validateBody(record.body);
  return record;
}

export function isPublic(record, now = new Date()) {
  return record.status === 'published' && new Date(record.publishAt) <= now && (!record.expiresAt || new Date(record.expiresAt) > now);
}

export function localDate(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

export function displayDate(value) {
  if (!value) return 'Dates to be announced';
  const date = new Date(value.length === 10 ? `${value}T12:00:00` : value);
  return Number.isNaN(date.getTime()) ? 'Date unavailable' : new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
}

export function freshRecord() {
  return { id: '', title: '', summary: '', body: emptyBody, status: 'draft', stage: 'upcoming', season: '2026', publishAt: new Date().toISOString(), expiresAt: '', registrationUrl: '', startDate: '', endDate: '', venues: '', format: '', feeText: '', rulesSlug: '', pinned: false, revision: 0 };
}

export function registrationOpen(record, now = new Date()) {
  return record.stage === 'registration_open' && Boolean(safeUrl(record.registrationUrl))
    && (!record.registrationDeadline || record.registrationDeadline >= localDate(now));
}