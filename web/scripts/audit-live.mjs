import { liveClients, documents, project } from './firebase-live-client.mjs';

const clients = await liveClients();
const profiles = await documents(clients.firestore, 'users');
const privileged = profiles.filter((record) => ['captain', 'master'].includes(record.fields?.role?.stringValue));
const emails = [...new Set(privileged.map((record) => record.fields?.email?.stringValue).filter(Boolean).concat('bharathrushab@gmail.com'))];
const response = await clients.identity.post(`/projects/${project}/accounts:lookup`, { email: emails }, { skipLog: { body: true, resBody: true } });
const accounts = response.body.users || [];
const grants = privileged.map((record) => {
  const id = record.name.split('/').at(-1);
  const account = accounts.find((user) => user.email === record.fields.email?.stringValue && id.endsWith(`_${user.localId}`));
  return { email: record.fields.email?.stringValue, role: record.fields.role.stringValue, uid: account?.localId, verified: Boolean(account?.emailVerified && !account.disabled), profile: id };
});
console.log(JSON.stringify({ operator: clients.email, profileCount: profiles.length, grants, websiteAdmin: accounts.filter((user) => user.email === 'bharathrushab@gmail.com').map((user) => ({ uid: user.localId, email: user.email, verified: user.emailVerified, disabled: Boolean(user.disabled) })), existingCmsGrants: (await documents(clients.firestore, 'cap_admins')).length, existingBookingGrants: (await documents(clients.firestore, 'booking_roles')).length }, null, 2));