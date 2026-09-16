import { createContext, useContext, useEffect, useState } from 'react';
import { collection, doc, getDoc, onSnapshot, query, runTransaction, where } from 'firebase/firestore';
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { auth, db, configured } from './firebase';
import { initialContent } from '../data/seed';
import { resources, validateRecord } from './content';

const Store = createContext(null);
const storageKey = 'cap-website-preview-v1';
function previewContent() {
  try {
    const cached = JSON.parse(localStorage.getItem(storageKey));
    if (cached && Object.keys(resources).every((name) => Array.isArray(cached[name]))) {
      Object.values(cached).flat().forEach((record) => validateRecord({ ...record, reviewed: true }));
      return cached;
    }
  } catch { /* Invalid preview data must not prevent the site from loading. */ }
  return structuredClone(initialContent);
}

export function SiteProvider({ children }) {
  const [content, setContent] = useState(() => configured ? Object.fromEntries(Object.keys(resources).map((name) => [name, []])) : previewContent());
  const [user, setUser] = useState(null);
  const [isAdmin, setAdmin] = useState(false);
  const [authReady, setAuthReady] = useState(!configured);
  const [errors, setErrors] = useState({});
  const [pending, setPending] = useState(() => configured ? Object.keys(resources) : []);
  const [notice, setNotice] = useState('');
  const [cutoff, setCutoff] = useState(() => Date.now() - 60000);

  useEffect(() => {
    if (!configured || isAdmin) return;
    const timer = setInterval(() => setCutoff(Date.now() - 60000), 60000);
    return () => clearInterval(timer);
  }, [isAdmin]);

  useEffect(() => {
    if (!configured) return;
    let unsubscribeGrant;
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      unsubscribeGrant?.();
      setUser(currentUser);
      setAdmin(false);
      setAuthReady(!currentUser);
      if (currentUser) unsubscribeGrant = onSnapshot(doc(db, 'cap_admins', currentUser.uid), (snapshot) => {
        setAdmin(snapshot.exists() && snapshot.data().enabled === true && snapshot.data().role === 'master');
        setAuthReady(true);
      }, () => { setAuthReady(true); setAdmin(false); });
    });
    return () => { unsubscribeGrant?.(); unsubscribeAuth(); };
  }, []);

  useEffect(() => {
    if (!configured) return;
    setContent(Object.fromEntries(Object.keys(resources).map((name) => [name, []])));
    setPending(Object.keys(resources));
    const unsubscribes = Object.keys(resources).map((name) => {
      const ref = collection(db, `cap_${name}`);
      const source = isAdmin ? ref : query(ref, where('status', '==', 'published'), where('publishAtMs', '<=', cutoff));
      return onSnapshot(source, (snapshot) => {
        setContent((previous) => ({ ...previous, [name]: snapshot.docs.map((record) => ({ ...record.data(), id: record.id })) }));
        setErrors((previous) => ({ ...previous, [name]: '' }));
        setPending((previous) => previous.filter((resource) => resource !== name));
      }, (error) => {
        setErrors((previous) => ({ ...previous, [name]: `Unable to load ${resources[name].label.toLowerCase()}. ${error.code || ''}` }));
        setPending((previous) => previous.filter((resource) => resource !== name));
      });
    });
    return () => unsubscribes.forEach((unsubscribe) => unsubscribe());
  }, [isAdmin, cutoff]);

  async function save(resource, record, originalId) {
    if (!resources[resource]) throw new Error('Unknown content type.');
    validateRecord(record);
    if (originalId && record.id !== originalId) throw new Error('Published URLs cannot be renamed. Create a new document instead.');
    const updated = { ...record, title: record.title.trim(), publishAtMs: new Date(record.publishAt).getTime(), revision: record.revision + 1, updatedAt: new Date().toISOString(), updatedBy: user?.uid || 'local-preview' };
    if (!configured) {
      const currentContent = previewContent();
      const existing = currentContent[resource].find((item) => item.id === record.id);
      if (existing && !originalId) throw new Error('That URL already exists. Choose a unique slug.');
      if (existing && existing.revision !== record.revision) throw new Error('This document changed. Reload before saving.');
      const next = { ...currentContent, [resource]: [...currentContent[resource].filter((item) => item.id !== record.id), updated] };
      localStorage.setItem(storageKey, JSON.stringify(next));
      setContent(next);
    } else {
      if (!isAdmin) throw new Error('Website administrator access is required.');
      const ref = doc(db, `cap_${resource}`, record.id);
      await runTransaction(db, async (transaction) => {
        const current = await transaction.get(ref);
        if (current.exists() && !originalId) throw new Error('That URL already exists.');
        if ((current.data()?.revision || 0) !== record.revision) throw new Error('This document changed. Reload before saving.');
        transaction.set(ref, updated);
        transaction.set(doc(collection(db, 'cap_revisions')), { resource, documentId: record.id, action: 'save', previous: current.data() || null, updatedAt: updated.updatedAt, actor: user.uid });
      });
    }
    setNotice(configured ? 'Changes saved.' : 'Preview saved on this device.');
    return updated;
  }

  async function remove(resource, record) {
    if (!configured) {
      const currentContent = previewContent();
      const next = { ...currentContent, [resource]: currentContent[resource].filter((item) => item.id !== record.id) };
      localStorage.setItem(storageKey, JSON.stringify(next));
      setContent(next);
    } else {
      if (!isAdmin) throw new Error('Website administrator access is required.');
      const ref = doc(db, `cap_${resource}`, record.id);
      await runTransaction(db, async (transaction) => {
        const current = await transaction.get(ref);
        if (!current.exists() || current.data().revision !== record.revision) throw new Error('This document changed. Reload before deleting.');
        transaction.delete(ref);
        transaction.set(doc(collection(db, 'cap_revisions')), { resource, documentId: record.id, action: 'delete', previous: current.data(), actor: user.uid, updatedAt: new Date().toISOString() });
      });
    }
    setNotice('Document deleted.');
  }

  async function login() { await signInWithPopup(auth, new GoogleAuthProvider()); }
  async function logout() { await signOut(auth); }
  function resetPreview() { localStorage.removeItem(storageKey); setContent(structuredClone(initialContent)); setNotice('Preview reset.'); }

  return <Store.Provider value={{ content, errors, pending, user, isAdmin, authReady, preview: !configured, save, remove, login, logout, notice, setNotice, resetPreview }}>{children}</Store.Provider>;
}

export const useSite = () => useContext(Store);

export async function verifyConnection() {
  return db ? getDoc(doc(db, 'cap_settings', 'main')) : null;
}