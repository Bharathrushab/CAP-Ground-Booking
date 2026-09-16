import importedRules from './imported-rules.json';
import { freshRecord, textBody, practiceUrl } from '../lib/content';

const base = { ...freshRecord(), status: 'published', publishAt: '2026-01-01T00:00:00.000Z' };
export const initialContent = {
  announcements: [
    { ...base, id: '2026-playing-conditions', title: 'One place for your season.', summary: 'Explore the CAP league rulebooks and find your next practice session.', category: 'Association', pinned: true, body: textBody('The CAP reference library brings together the Premier League, T20 Fall League and Women\'s Premier League playing conditions. Contact the committee to confirm current registration dates and eligibility.') },
  ],
  leagues: [
    { ...base, id: 'cap-premier-league-2026', title: 'Premier League', summary: 'Club cricket. Local pride.', season: '2026', format: 'Limited overs', stage: 'reference', rulesSlug: 'cap-premier-league-2026', body: textBody('Explore the 2026 Premier League playing conditions. Season dates and registration details will be published by the CAP committee.') },
    { ...base, id: 'cap-t20-fall-league-2026', title: 'T20 Fall League', summary: 'A new season. A different challenge.', season: '2026', format: 'T20', stage: 'reference', rulesSlug: 'cap-t20-fall-league-2026', body: textBody('Explore the 2026 T20 Fall League format and playing conditions. Confirm dates and registration details with CAP before making arrangements.') },
    { ...base, id: 'cap-womens-premier-league-2026', title: "Women's Premier League", summary: 'The game belongs to everyone.', season: '2026', format: '10 overs', stage: 'reference', rulesSlug: 'cap-womens-premier-league-2026', body: textBody('Explore the women\'s competition and its dedicated playing conditions. The 2026 source specifies 9 players per side, 10 overs and no LBW; the committee must confirm the adopted rules before publication.') },
  ],
  tournaments: [],
  rules: importedRules.map((record) => ({ ...record, status: 'published' })),
  committee: [],
  settings: [{ ...base, id: 'main', title: 'Cricket Association of Peoria', contactEmail: 'cappeoria1@gmail.com', practiceBookingUrl: practiceUrl, summary: 'Peoria, Illinois', body: textBody('Community cricket in Peoria, Illinois.') }],
};

export { importedRules };