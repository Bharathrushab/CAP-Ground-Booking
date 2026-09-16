import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { liveClients, documents, fields, project, databaseRoot } from './firebase-live-client.mjs';

// One-off operator script: grant website CMS ("master") admin access to specific, already-approved emails.
// Usage: node scripts/add-cms-admins.mjs email1 email2 ... [--apply]
// Without --apply this only reports what would happen (dry run).
const apply = process.argv.includes('--apply');
const emails = process.argv.slice(2).filter((arg) => arg !== '--apply');
if (!emails.length) throw new Error('Provide one or more email addresses to grant CMS admin access.');

const clients = await liveClients();
if (clients.email !== 'bharathrushab@gmail.com') throw new Error('Use the approved project-owner account.');

const documentRoot = `${databaseRoot.slice(1)}/documents`;
const lookup = await clients.identity.post(`/projects/${project}/accounts:lookup`, { email: emails }, { skipLog: { body: true, resBody: true } });
const accounts = lookup.body.users || [];
const existingGrants = await documents(clients.firestore, 'cap_admins');

const results = emails.map((email) => {
  const account = accounts.find((user) => user.email === email);
  const alreadyGranted = account && existingGrants.some((grant) => grant.name.endsWith(`/${account.localId}`));
  const eligible = Boolean(account?.emailVerified && !account.disabled && !alreadyGranted);
  return { email, uid: account?.localId || null, found: Boolean(account), verified: Boolean(account?.emailVerified), disabled: Boolean(account?.disabled), alreadyGranted: Boolean(alreadyGranted), eligible };
});

console.log(JSON.stringify({ mode: apply ? 'LIVE APPLY' : 'DRY RUN', operator: clients.email, results }, null, 2));

const grantable = results.filter((result) => result.eligible);
if (!grantable.length) {
  console.log('Nothing to grant: no eligible accounts (must exist, be email-verified, enabled, and not already granted).');
} else if (apply) {
  const backupDirectory = new URL(`../../.deployment-backups/${new Date().toISOString().replace(/[:.]/g, '-')}-cms-admins/`, import.meta.url);
  await mkdir(backupDirectory, { recursive: true });
  await writeFile(new URL('before.json', backupDirectory), JSON.stringify({ existingGrants, results }, null, 2));
  const writes = grantable.map((result) => ({
    update: { name: `${documentRoot}/cap_admins/${result.uid}`, fields: fields({ enabled: true, role: 'master', approvedBy: clients.email, email: result.email }) },
    currentDocument: { exists: false },
  }));
  await clients.firestore.post(`${databaseRoot}/documents:commit`, { writes }, { skipLog: { body: true, resBody: true } });
  await writeFile(new URL('applied.json', backupDirectory), JSON.stringify({ granted: grantable.map((result) => ({ email: result.email, uid: result.uid })) }, null, 2));
  console.log(`Granted CMS master admin to: ${grantable.map((result) => result.email).join(', ')}`);
} else {
  console.log(`Dry run only. Re-run with --apply to grant: ${grantable.map((result) => result.email).join(', ')}`);
}
