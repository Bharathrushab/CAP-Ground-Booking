import { randomUUID } from 'node:crypto';
import { liveClients, fields, project, databaseRoot } from '../web/scripts/firebase-live-client.mjs';

const allowedCollections = new Set(['slots', 'cage_slots']);
const privateRequest = { skipLog: { body: true, resBody: true } };

function decode(value) {
  if ('nullValue' in value) return null;
  if ('stringValue' in value) return value.stringValue;
  if ('booleanValue' in value) return value.booleanValue;
  if ('integerValue' in value) return Number(value.integerValue);
  if ('doubleValue' in value) return value.doubleValue;
  if ('arrayValue' in value) return (value.arrayValue.values || []).map(decode);
  if ('mapValue' in value) return Object.fromEntries(Object.entries(value.mapValue.fields || {}).map(([key, entry]) => [key, decode(entry)]));
  throw new Error('Unsupported field type in slot data.');
}

export async function maintenanceDatabase() {
  const clients = await liveClients();
  const response = await clients.identity.post(`/projects/${project}/accounts:lookup`, { email: [clients.email] }, privateRequest);
  const user = response.body.users?.find((entry) => entry.email === clients.email && entry.emailVerified && !entry.disabled);
  if (!user) throw new Error('A verified Firebase account is required.');
  const lookup = await clients.firestore.post(`${databaseRoot}/documents:batchGet`, {
    documents: [`${databaseRoot.slice(1)}/documents/booking_roles/${user.localId}`],
  }, privateRequest);
  const grant = lookup.body.find((entry) => entry.found)?.found;
  if (grant?.fields?.role?.stringValue !== 'master') {
    throw new Error('The CLI account does not have an approved booking master grant.');
  }
  return { client: clients.firestore, terminate: async () => {} };
}

export function collection(database, name) {
  if (!allowedCollections.has(name)) throw new Error('Maintenance is limited to booking collections.');
  return { database, name, filters: [] };
}
export function doc(database, name, id) {
  if (!id || id.includes('/')) throw new Error('Invalid slot ID.');
  return { ...collection(database, name), id, path: `${databaseRoot.slice(1)}/documents/${name}/${id}` };
}
export function where(field, operator, value) {
  const operators = { '==': 'EQUAL', '<': 'LESS_THAN' };
  if (!operators[operator]) throw new Error('Unsupported maintenance query operator.');
  return { fieldFilter: { field: { fieldPath: field }, op: operators[operator], value: fields({ value }).value } };
}
export const query = (reference, ...filters) => ({ ...reference, filters: [...reference.filters, ...filters] });
export async function getDocs(reference) {
  const structuredQuery = { from: [{ collectionId: reference.name }] };
  if (reference.filters.length) structuredQuery.where = reference.filters.length === 1
    ? reference.filters[0] : { compositeFilter: { op: 'AND', filters: reference.filters } };
  const response = await reference.database.client.post(`${databaseRoot}/documents:runQuery`, { structuredQuery }, privateRequest);
  const docs = response.body.filter((entry) => entry.document).map(({ document }) => ({
    id: document.name.split('/').at(-1),
    data: () => decode({ mapValue: { fields: document.fields } }),
  }));
  return { docs, empty: !docs.length, size: docs.length, forEach: (callback) => docs.forEach(callback) };
}

async function runTransaction(database, operation) {
  const response = await database.client.post(`${databaseRoot}/documents:beginTransaction`, { options: { readWrite: {} } }, privateRequest);
  const transaction = response.body.transaction;
  try {
    const writes = await operation(transaction);
    await database.client.post(`${databaseRoot}/documents:commit`, { transaction, writes }, privateRequest);
  } catch (error) {
    await database.client.post(`${databaseRoot}/documents:rollback`, { transaction }, privateRequest).catch(() => {});
    throw error;
  }
}

export async function addDoc(reference, data) {
  const destination = doc(reference.database, reference.name, randomUUID());
  await runTransaction(reference.database, async () => [{
    update: { name: destination.path, fields: fields(data) }, currentDocument: { exists: false },
  }]);
  return destination;
}
export async function deleteDoc(reference) {
  await runTransaction(reference.database, async (transaction) => {
    const response = await reference.database.client.post(`${databaseRoot}/documents:batchGet`, { documents: [reference.path], transaction }, privateRequest);
    const found = response.body.find((entry) => entry.found)?.found;
    return found ? [{ delete: reference.path, currentDocument: { updateTime: found.updateTime } }] : [];
  });
}