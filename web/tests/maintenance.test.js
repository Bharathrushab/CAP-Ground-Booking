import { test } from 'node:test';
import assert from 'node:assert/strict';
import { collection, doc, query, where, getDocs, addDoc, deleteDoc } from '../../scripts/authenticate-automation.mjs';

function databaseWith(responses) {
  const calls = [];
  return { calls, client: { async post(path, body) {
    calls.push({ path, body });
    const response = responses.shift();
    if (response instanceof Error) throw response;
    return { body: response };
  } } };
}

test('maintenance queries preserve filters and decode slot snapshots', async () => {
  const database = databaseWith([[{ document: { name: 'projects/demo/databases/(default)/documents/slots/one', fields: { date: { stringValue: '2026-09-16' }, booked_by_teams: { arrayValue: {} }, reserved: { booleanValue: false } } } }]]);
  const result = await getDocs(query(collection(database, 'slots'), where('date', '==', '2026-09-16'), where('ground', '==', 'CAP Ground')));
  assert.equal(result.size, 1);
  assert.equal(result.empty, false);
  assert.deepEqual(result.docs[0].data(), { date: '2026-09-16', booked_by_teams: [], reserved: false });
  assert.equal(database.calls[0].body.structuredQuery.where.compositeFilter.filters.length, 2);
  assert.throws(() => collection(database, 'users'));
  assert.throws(() => doc(database, 'slots', '../users'));
});

test('maintenance creates use a transaction and cannot overwrite an existing document', async () => {
  const database = databaseWith([{ transaction: 'test-transaction' }, {}]);
  await addDoc(collection(database, 'slots'), { date: '2026-09-16', booked_by_teams: [] });
  const commit = database.calls[1].body;
  assert.equal(commit.transaction, 'test-transaction');
  assert.equal(commit.writes[0].currentDocument.exists, false);
  assert.match(commit.writes[0].update.name, /^projects\/cap-practice-booking\/databases\/\(default\)\/documents\/slots\//);
});

test('maintenance deletes use a transaction read and version precondition', async () => {
  const database = databaseWith([{ transaction: 'test-transaction' }, [{ found: { updateTime: '2026-09-16T00:00:00Z' } }], {}]);
  await deleteDoc(doc(database, 'slots', 'one'));
  assert.equal(database.calls[1].body.transaction, 'test-transaction');
  assert.equal(database.calls[2].body.writes[0].currentDocument.updateTime, '2026-09-16T00:00:00Z');
});

test('failed maintenance commits roll back and surface the error', async () => {
  const database = databaseWith([{ transaction: 'test-transaction' }, new Error('conflict'), {}]);
  await assert.rejects(addDoc(collection(database, 'cage_slots'), { booked_by: null }), /conflict/);
  assert.match(database.calls[2].path, /:rollback$/);
});