import { writeFile } from 'node:fs/promises';
const collections = ['announcements', 'leagues', 'tournaments', 'rules', 'committee', 'settings'];
const indexes = collections.map((name) => ({ collectionGroup: `cap_${name}`, queryScope: 'COLLECTION', fields: [{ fieldPath: 'status', order: 'ASCENDING' }, { fieldPath: 'publishAtMs', order: 'ASCENDING' }] }));
await writeFile(new URL('../firestore.indexes.json', import.meta.url), `${JSON.stringify({ indexes, fieldOverrides: [] }, null, 2)}\n`);