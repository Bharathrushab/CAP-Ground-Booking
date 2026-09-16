import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { liveClients, documents, fields, project, databaseRoot } from './firebase-live-client.mjs';

const approvalPath = process.argv[2];
if (!approvalPath) throw new Error('Provide the JSON role audit explicitly approved by the project owner.');
const apply = process.argv.includes('--apply');
const documentRoot = `${databaseRoot.slice(1)}/documents`;
const approval = JSON.parse(await readFile(approvalPath, 'utf8'));
const expectedRuleset = `projects/${project}/rulesets/5f5f287f-065f-4a2a-826c-35a1910e3e9f`;
const clients = await liveClients();
if (clients.email !== 'bharathrushab@gmail.com') throw new Error('Use the approved project-owner account.');
const admin = approval.websiteAdmin.find((account) => account.email === clients.email && account.verified && !account.disabled);
if (!admin || approval.grants.some((grant) => !grant.uid || !grant.verified)) throw new Error('The approved audit contains unverified accounts.');
const releaseName = `projects/${project}/releases/cloud.firestore`;
const currentRelease = (await clients.rules.listAllReleases(project)).find((release) => release.name === releaseName);
if (currentRelease?.rulesetName !== expectedRuleset) throw new Error('The live rules changed since the audit. Re-audit before proceeding.');
const collections = ['users', 'slots', 'cage_slots', 'booking_roles', 'cap_admins', 'cap_announcements', 'cap_leagues', 'cap_tournaments', 'cap_rules', 'cap_committee', 'cap_settings', 'cap_revisions'];
const snapshot = {};
for (const name of collections) snapshot[name] = await documents(clients.firestore, name);
if (snapshot.booking_roles.length || snapshot.cap_admins.length) throw new Error('Grant collections are no longer empty; manual reconciliation is required.');
const privileged = snapshot.users.filter((record) => ['captain', 'master'].includes(record.fields?.role?.stringValue));
if (privileged.length !== approval.grants.length) throw new Error('Role count changed after approval.');
for (const record of privileged) {
  const approved = approval.grants.find((grant) => record.name.endsWith(`/${grant.profile}`));
  if (!approved || approved.role !== record.fields.role.stringValue || approved.email !== record.fields.email.stringValue) throw new Error('A role changed after approval.');
}
const authLookup = await clients.identity.post(`/projects/${project}/accounts:lookup`, { localId: approval.grants.map((grant) => grant.uid) }, { skipLog: { body: true, resBody: true } });
for (const grant of approval.grants) {
  const account = authLookup.body.users?.find((user) => user.localId === grant.uid);
  if (!account?.emailVerified || account.disabled || account.email !== grant.email) throw new Error('An approved Auth identity changed.');
}
const source = await readFile(new URL('../firestore.rules', import.meta.url), 'utf8');
const authConfig = (await clients.identityConfig.get(`/projects/${project}/config`, { skipLog: { resBody: true } })).body;
const indexes = (await clients.firestore.get(`${databaseRoot}/collectionGroups/-/indexes`)).body.indexes || [];
const backupDirectory = new URL(`../../.deployment-backups/${new Date().toISOString().replace(/[:.]/g, '-')}/`, import.meta.url);
await mkdir(backupDirectory, { recursive: true });
await writeFile(new URL('before.json', backupDirectory), JSON.stringify({ currentRelease, source: await clients.rules.getRulesetContent(expectedRuleset), snapshot, authorizedDomains: authConfig.authorizedDomains, indexes }, null, 2));
const writes = approval.grants.map((grant) => ({ update: { name: `${documentRoot}/booking_roles/${grant.uid}`, fields: fields({ role: grant.role, approvedBy: admin.uid }) }, currentDocument: { exists: false } }));
writes.push({ update: { name: `${documentRoot}/cap_admins/${admin.uid}`, fields: fields({ enabled: true, role: 'master' }) }, currentDocument: { exists: false } });
for (const profile of privileged) writes.push({ verify: profile.name, currentDocument: { updateTime: profile.updateTime } });
const vite = await createServer({ root: fileURLToPath(new URL('../', import.meta.url)), server: { middlewareMode: true }, appType: 'custom' });
const contentCounts = {};
try {
  const { initialContent } = await vite.ssrLoadModule('/src/data/seed.js');
  const { validateRecord } = await vite.ssrLoadModule('/src/lib/content.js');
  for (const resource of ['leagues', 'rules', 'settings']) {
    contentCounts[resource] = 0;
    for (const record of initialContent[resource]) {
      if (snapshot[`cap_${resource}`].some((existing) => existing.name.endsWith(`/${record.id}`))) continue;
      const prepared = { ...record, status: 'published', reviewed: true, revision: 1, updatedBy: admin.uid, updatedAt: new Date().toISOString(), publishAtMs: new Date(record.publishAt).getTime() };
      validateRecord(prepared);
      writes.push({ update: { name: `${documentRoot}/cap_${resource}/${record.id}`, fields: fields(prepared) }, currentDocument: { exists: false } });
      contentCounts[resource]++;
    }
  }
} finally { await vite.close(); }
const wantedIndexes = JSON.parse(await readFile(new URL('../firestore.indexes.json', import.meta.url), 'utf8')).indexes;
const missingIndexes = wantedIndexes.filter((wanted) => !indexes.some((existing) => existing.name.includes(`/collectionGroups/${wanted.collectionGroup}/`) && existing.queryScope === wanted.queryScope && JSON.stringify(existing.fields.filter((field) => field.fieldPath !== '__name__')) === JSON.stringify(wanted.fields)));
console.log(JSON.stringify({ mode: apply ? 'LIVE APPLY' : 'DRY RUN', bookingGrants: approval.grants.length, websiteAdmin: admin.email, contentCounts, missingIndexes: missingIndexes.length, backup: fileURLToPath(backupDirectory) }, null, 2));
if (apply) {
  for (const index of missingIndexes) await clients.firestore.post(`${databaseRoot}/collectionGroups/${index.collectionGroup}/indexes`, { queryScope: index.queryScope, fields: index.fields });
  const latestConfig = (await clients.identityConfig.get(`/projects/${project}/config`, { skipLog: { resBody: true } })).body;
  const domains = [...new Set([...latestConfig.authorizedDomains, 'cricket-peoria.web.app', 'cricket-peoria.firebaseapp.com', 'cricket-peoria.com', 'www.cricket-peoria.com'])];
  await clients.identityConfig.patch(`/projects/${project}/config`, { authorizedDomains: domains }, { queryParams: { updateMask: 'authorizedDomains' } });
  const latestRelease = (await clients.rules.listAllReleases(project)).find((release) => release.name === releaseName);
  if (latestRelease.rulesetName !== expectedRuleset) throw new Error('Live rules changed during preparation.');
  const ruleset = await clients.rules.createRuleset(project, [{ name: 'firestore.rules', content: source }]);
  await writeFile(new URL('prepared.json', backupDirectory), JSON.stringify({ ruleset, writes, authorizedDomains: domains }, null, 2));
  await clients.rules.updateRelease(project, ruleset, 'cloud.firestore');
  await clients.firestore.post(`${databaseRoot}/documents:commit`, { writes }, { skipLog: { body: true, resBody: true } });
  await writeFile(new URL('applied.json', backupDirectory), JSON.stringify({ ruleset, createdDocuments: writes.filter((write) => write.update).map((write) => write.update.name), authorizedDomains: domains }, null, 2));
  console.log('Applied restricted rules, approved grants, and reviewed CMS content. Booking documents and Hosting releases were not modified.');
}