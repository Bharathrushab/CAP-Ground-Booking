import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { liveClients, documents, project, databaseRoot } from './firebase-live-client.mjs';

const clients = await liveClients();
const directory = process.env.FIREBASE_CLI_DIRECTORY || join(process.env.APPDATA, 'npm/node_modules/firebase-tools/lib');
const require = createRequire(join(directory, 'index.js'));
const { Client } = require('./apiv2');
const publicClient = new Client({ urlPrefix: 'https://firestore.googleapis.com', apiVersion: 'v1', auth: false });
const documentRoot = `${databaseRoot.slice(1)}/documents`;
const grants = await documents(clients.firestore, 'cap_admins');
assert.equal(grants.length, 1);
const adminUid = grants[0].name.split('/').at(-1);

async function denied(operation, description) {
  try { await operation(); }
  catch (error) {
    assert.match(error.message, /permission|403|insufficient/i, description);
    console.log(`PASS: ${description}`);
    return;
  }
  throw new Error(`Unexpected permission: ${description}`);
}

for (const name of ['cap_settings', 'cap_leagues', 'cap_rules']) {
  const result = await publicClient.post(`${databaseRoot}/documents:runQuery`, { structuredQuery: {
    from: [{ collectionId: name }],
    where: { compositeFilter: { op: 'AND', filters: [
      { fieldFilter: { field: { fieldPath: 'status' }, op: 'EQUAL', value: { stringValue: 'published' } } },
      { fieldFilter: { field: { fieldPath: 'publishAtMs' }, op: 'LESS_THAN_OR_EQUAL', value: { integerValue: String(Date.now() - 60000) } } },
    ] } },
  } }, { skipLog: { resBody: true } }).catch((error) => {
    const details = JSON.stringify(error.context?.body);
    if (details?.includes('currently building')) {
      console.log(`PENDING: ${name} index is building`);
      return null;
    }
    throw error;
  });
  if (!result) continue;
  assert.ok(result.body.some((entry) => entry.document), `Published ${name} must be readable`);
  console.log(`PASS: published ${name} is readable`);
}
await denied(() => publicClient.get(`${databaseRoot}/documents/users`, { skipLog: { resBody: true } }), 'anonymous profile listing denied');
await denied(() => publicClient.get(`${databaseRoot}/documents/cap_admins/${adminUid}`, { skipLog: { resBody: true } }), 'anonymous admin grant read denied');
await denied(() => publicClient.post(`${databaseRoot}/documents:runQuery`, { structuredQuery: { from: [{ collectionId: 'cap_rules' }] } }), 'unfiltered CMS query denied');
await denied(() => publicClient.post(`${databaseRoot}/documents:commit`, { writes: [{ update: {
  name: `${documentRoot}/cap_settings/main`, fields: { title: { stringValue: 'Unauthorized' } },
}, updateMask: { fieldPaths: ['title'] }, currentDocument: { exists: true } }] }), 'anonymous CMS mutation denied');

assert.equal(grants[0].fields.enabled.booleanValue, true);
assert.equal(grants[0].fields.role.stringValue, 'master');
const identity = await clients.identity.post(`/projects/${project}/accounts:lookup`, { localId: [adminUid] }, { skipLog: { body: true, resBody: true } });
assert.equal(identity.body.users[0].email, 'bharathrushab@gmail.com');
assert.equal(identity.body.users[0].emailVerified, true);
assert.ok(!identity.body.users[0].disabled);
const provider = await clients.identityConfig.get(`/projects/${project}/defaultSupportedIdpConfigs/google.com`, { skipLog: { resBody: true } });
assert.equal(provider.body.enabled, true);
const config = await clients.identityConfig.get(`/projects/${project}/config`, { skipLog: { resBody: true } });
for (const domain of ['cricket-peoria.com', 'cricket-peoria.web.app']) assert.ok(config.body.authorizedDomains.includes(domain));
console.log('PASS: Google provider, authorized domains, and the approved CMS grant are configured');
console.log('MANUAL CHECK: sign in through the website with the approved Google account; CLI OAuth tokens have a different audience.');
const indexes = (await clients.firestore.get(`${databaseRoot}/collectionGroups/-/indexes`)).body.indexes || [];
const cmsIndexes = indexes.filter((entry) => entry.name.includes('/collectionGroups/cap_'));
assert.equal(cmsIndexes.length, 6);
assert.ok(cmsIndexes.every((entry) => entry.state === 'READY'), 'CMS indexes are still building');
console.log('PASS: all six CMS indexes are READY');