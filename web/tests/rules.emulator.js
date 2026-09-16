import { readFile } from 'node:fs/promises';
import { test, before, after } from 'node:test';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, setDoc, getDoc, getDocs, collection, query, where, updateDoc } from 'firebase/firestore';

let environment;
before(async () => {
  environment = await initializeTestEnvironment({ projectId: 'demo-cap-website', firestore: { host: '127.0.0.1', port: 8080, rules: await readFile(new URL('../firestore.rules', import.meta.url), 'utf8') } });
  await environment.withSecurityRulesDisabled(async (context) => {
    const database = context.firestore();
    await setDoc(doc(database, 'cap_admins', 'master'), { enabled: true, role: 'master' });
    await setDoc(doc(database, 'booking_roles', 'captain'), { role: 'captain' });
    await setDoc(doc(database, 'booking_roles', 'booking-master'), { role: 'master' });
    await setDoc(doc(database, 'slots', 'practice'), { date: '2026-09-16', time: '5:00-7:30PM', ground: 'CAP Ground', booked_by_teams: [] });
    await setDoc(doc(database, 'cage_slots', 'practice'), { date: '2026-09-16', time: '5:00-6:30 PM', cage: 'Cage 1', is_weekend: false, booked_by: null });
    for (const [id, status, time] of [['public', 'published', 0], ['draft', 'draft', 0], ['scheduled', 'published', Date.now() + 86400000]]) await setDoc(doc(database, 'cap_announcements', id), { id, title: id, status, publishAtMs: time, revision: 1 });
  });
});
after(async () => { await environment?.cleanup(); });

test('booking profiles cannot self-promote and grant documents are private', async () => {
  const database = environment.authenticatedContext('new-user', { name: 'New User', email: 'new@example.test' }).firestore();
  const profile = doc(database, 'users', 'New User_new-user');
  await assertSucceeds(setDoc(profile, { name: 'New User', email: 'new@example.test', role: 'user' }));
  await assertSucceeds(getDoc(profile));
  await assertFails(updateDoc(profile, { role: 'master' }));
  await assertFails(setDoc(doc(database, 'users', 'Other_captain'), { role: 'master' }));
  await assertFails(setDoc(doc(database, 'booking_roles', 'new-user'), { role: 'master' }));
  await assertFails(getDoc(doc(database, 'booking_roles', 'captain')));
  await assertFails(getDocs(collection(database, 'users')));
});

test('ground bookings enforce ownership, capacity, metadata and reservations', async () => {
  const anonymous = environment.unauthenticatedContext().firestore();
  const captain = environment.authenticatedContext('captain').firestore();
  const master = environment.authenticatedContext('booking-master').firestore();
  const regular = environment.authenticatedContext('user').firestore();
  const booking = { team: 'AYF', uid: 'captain', name: 'Captain' };
  await assertSucceeds(getDocs(collection(anonymous, 'slots')));
  for (const database of [anonymous, regular]) await assertFails(updateDoc(doc(database, 'slots', 'practice'), { booked_by_teams: [booking] }));
  await assertFails(updateDoc(doc(captain, 'slots', 'practice'), { booked_by_teams: [{ ...booking, uid: 'other' }] }));
  await assertSucceeds(updateDoc(doc(captain, 'slots', 'practice'), { booked_by_teams: [booking] }));
  await assertFails(updateDoc(doc(regular, 'slots', 'practice'), { booked_by_teams: [] }));
  await assertFails(updateDoc(doc(captain, 'slots', 'practice'), { date: '2030-01-01' }));
  const second = { team: 'PCC', uid: 'booking-master', name: 'Master' };
  await assertSucceeds(updateDoc(doc(master, 'slots', 'practice'), { booked_by_teams: [booking, second] }));
  await assertFails(updateDoc(doc(master, 'slots', 'practice'), { booked_by_teams: [booking, second, second] }));
  await assertFails(updateDoc(doc(captain, 'slots', 'practice'), { booked_by_teams: [{ ...booking, team: 'PCC' }] }));
  await assertSucceeds(updateDoc(doc(captain, 'slots', 'practice'), { booked_by_teams: [second] }));
  await assertSucceeds(updateDoc(doc(master, 'slots', 'practice'), { booked_by_teams: [] }));
  await assertFails(updateDoc(doc(captain, 'slots', 'practice'), { reserved: true, reserved_by: 'Captain' }));
  await assertSucceeds(updateDoc(doc(master, 'slots', 'practice'), { reserved: true, reserved_by: 'Master' }));
  await assertFails(updateDoc(doc(captain, 'slots', 'practice'), { booked_by_teams: [booking] }));
  await assertSucceeds(updateDoc(doc(master, 'slots', 'practice'), { reserved: false, reserved_by: null }));
});

test('cage bookings reject replacement, spoofing and unauthorized cancellation', async () => {
  const captain = environment.authenticatedContext('captain').firestore();
  const regular = environment.authenticatedContext('user').firestore();
  const master = environment.authenticatedContext('booking-master').firestore();
  const booking = { team: 'AYF', uid: 'captain', name: 'Captain' };
  await assertFails(updateDoc(doc(regular, 'cage_slots', 'practice'), { booked_by: booking }));
  await assertFails(updateDoc(doc(captain, 'cage_slots', 'practice'), { booked_by: { ...booking, uid: 'other' } }));
  await assertSucceeds(updateDoc(doc(captain, 'cage_slots', 'practice'), { booked_by: booking }));
  await assertFails(updateDoc(doc(master, 'cage_slots', 'practice'), { booked_by: { ...booking, uid: 'booking-master' } }));
  await assertFails(updateDoc(doc(regular, 'cage_slots', 'practice'), { booked_by: null }));
  await assertFails(updateDoc(doc(captain, 'cage_slots', 'practice'), { is_weekend: true }));
  await assertSucceeds(updateDoc(doc(captain, 'cage_slots', 'practice'), { booked_by: null }));
  await assertSucceeds(updateDoc(doc(captain, 'cage_slots', 'practice'), { booked_by: booking }));
  await assertSucceeds(updateDoc(doc(master, 'cage_slots', 'practice'), { booked_by: null }));
});

test('anonymous users read published content but not drafts or future content', async () => {
  const database = environment.unauthenticatedContext().firestore();
  await assertSucceeds(getDoc(doc(database, 'cap_announcements', 'public')));
  await assertFails(getDoc(doc(database, 'cap_announcements', 'draft')));
  await assertFails(getDoc(doc(database, 'cap_announcements', 'scheduled')));
  await assertSucceeds(getDocs(query(collection(database, 'cap_announcements'), where('status', '==', 'published'), where('publishAtMs', '<=', Date.now() - 60000))));
  await assertFails(getDocs(query(collection(database, 'cap_announcements'), where('status', '==', 'published'), where('publishAtMs', '<=', Date.now() + 86400000))));
  await assertFails(getDocs(collection(database, 'cap_announcements')));
});
test('captains and users cannot publish or self-promote', async () => {
  for (const uid of ['captain', 'user']) {
    const database = environment.authenticatedContext(uid).firestore();
    await assertFails(setDoc(doc(database, 'cap_admins', uid), { enabled: true, role: 'master' }));
    await assertFails(setDoc(doc(database, 'cap_announcements', 'attack'), { title: 'Attack' }));
    await assertFails(setDoc(doc(database, 'users', uid), { role: 'master' }));
  }
});
test('only provisioned admins can write valid versioned content', async () => {
  const database = environment.authenticatedContext('master').firestore();
  const ref = doc(database, 'cap_rules', 'new-rules');
  const record = { id: 'new-rules', title: 'Rules', status: 'draft', publishAtMs: 0, body: { type: 'doc', content: [] }, revision: 1, updatedBy: 'master', reviewRequired: true, reviewed: false };
  await assertSucceeds(setDoc(ref, record));
  await assertFails(updateDoc(ref, { status: 'published', revision: 2 }));
  await assertSucceeds(updateDoc(ref, { status: 'published', reviewed: true, revision: 2 }));
  await assertFails(updateDoc(ref, { revision: 4 }));
  await assertFails(updateDoc(doc(database, 'cap_admins', 'master'), { enabled: false }));
});