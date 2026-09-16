import { createRequire } from 'node:module';
import { join } from 'node:path';

export const project = 'cap-practice-booking';
export const databaseRoot = `/projects/${project}/databases/(default)`;

export async function liveClients() {
  const directory = process.env.FIREBASE_CLI_DIRECTORY || join(process.env.APPDATA, 'npm/node_modules/firebase-tools/lib');
  const require = createRequire(join(directory, 'index.js'));
  const account = require('./auth').getGlobalDefaultAccount();
  if (!account) throw new Error('Run firebase login before using this operator script.');
  await require('./requireAuth').requireAuth({ project, ...account });
  const { Client } = require('./apiv2');
  return {
    firestore: new Client({ urlPrefix: 'https://firestore.googleapis.com', apiVersion: 'v1' }),
    identity: new Client({ urlPrefix: 'https://identitytoolkit.googleapis.com', apiVersion: 'v1' }),
    identityConfig: new Client({ urlPrefix: 'https://identitytoolkit.googleapis.com', apiVersion: 'v2' }),
    rules: require('./gcp/rules'),
    email: account.user.email,
  };
}

export async function documents(client, collection) {
  const records = [];
  let pageToken;
  do {
    const result = await client.get(`${databaseRoot}/documents/${collection}`, {
      queryParams: { pageSize: 300, ...(pageToken ? { pageToken } : {}) },
      skipLog: { resBody: true },
    });
    records.push(...(result.body.documents || []));
    pageToken = result.body.nextPageToken;
  } while (pageToken);
  return records;
}

export function fields(record) {
  const value = (item) => {
    if (item === null) return { nullValue: null };
    if (typeof item === 'string') return { stringValue: item };
    if (typeof item === 'boolean') return { booleanValue: item };
    if (typeof item === 'number') return Number.isInteger(item) ? { integerValue: String(item) } : { doubleValue: item };
    if (Array.isArray(item)) return { arrayValue: { values: item.map(value) } };
    if (typeof item === 'object') return { mapValue: { fields: fields(item) } };
    throw new Error('Unsupported Firestore value.');
  };
  return Object.fromEntries(Object.entries(record).map(([key, item]) => [key, value(item)]));
}