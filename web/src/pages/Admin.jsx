import { useEffect, useState } from 'react';
import { Link, NavLink, useNavigate, useParams, Route, Routes } from 'react-router-dom';
import { ArrowLeft, ArrowUpRight, Bold, Italic, List, ListOrdered, Heading2, Heading3, Quote, Link as LinkIcon, Undo2, Redo2, Table2, Plus, Trash2, Save, Eye, Upload, LogIn, LogOut, RotateCcw, Columns3, Rows3, Unlink } from 'lucide-react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { TableKit } from '@tiptap/extension-table';
import { Extension } from '@tiptap/core';
import { useSite } from '../lib/store';
import { freshRecord, resources, slugify, safeUrl, displayDate, validateBody } from '../lib/content';
import { importedRules } from '../data/seed';
import RichContent from '../components/RichContent';

const calloutTone = Extension.create({
  name: 'calloutTone',
  addGlobalAttributes() {
    return [{ types: ['blockquote'], attributes: { tone: { default: 'info', parseHTML: (element) => element.getAttribute('data-tone'), renderHTML: (attributes) => ({ 'data-tone': attributes.tone }) } } }];
  },
});

function RichEditor({ value, onChange }) {
  const [linkOpen, setLinkOpen] = useState(false);
  const [href, setHref] = useState('');
  const editor = useEditor({
    extensions: [StarterKit.configure({ heading: { levels: [2, 3, 4] }, codeBlock: false, link: { openOnClick: false, protocols: ['https'], isAllowedUri: (url) => Boolean(safeUrl(url)) } }), TableKit.configure({ table: { resizable: false } }), calloutTone],
    content: value,
    editorProps: { attributes: { 'aria-label': 'Document body', class: 'prose editor-content' } },
    onUpdate: ({ editor: instance }) => onChange(instance.getJSON()),
  });
  if (!editor) return null;
  const tools = [
    ['Bold', Bold, () => editor.chain().focus().toggleBold().run(), editor.isActive('bold')],
    ['Italic', Italic, () => editor.chain().focus().toggleItalic().run(), editor.isActive('italic')],
    ['Section heading', Heading2, () => editor.chain().focus().toggleHeading({ level: 2 }).run(), editor.isActive('heading', { level: 2 })],
    ['Subheading', Heading3, () => editor.chain().focus().toggleHeading({ level: 3 }).run(), editor.isActive('heading', { level: 3 })],
    ['Bullet list', List, () => editor.chain().focus().toggleBulletList().run(), editor.isActive('bulletList')],
    ['Numbered list', ListOrdered, () => editor.chain().focus().toggleOrderedList().run(), editor.isActive('orderedList')],
    ['Callout', Quote, () => editor.chain().focus().toggleBlockquote().run(), editor.isActive('blockquote')],
    ['Add link', LinkIcon, () => { setHref(editor.getAttributes('link').href || ''); setLinkOpen(!linkOpen); }, editor.isActive('link')],
    ['Remove link', Unlink, () => editor.chain().focus().unsetLink().run()],
    ['Insert table', Table2, () => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()],
    ['Add row', Rows3, () => editor.chain().focus().addRowAfter().run()],
    ['Add column', Columns3, () => editor.chain().focus().addColumnAfter().run()],
    ['Delete table', Trash2, () => editor.chain().focus().deleteTable().run()],
    ['Undo', Undo2, () => editor.chain().focus().undo().run()],
    ['Redo', Redo2, () => editor.chain().focus().redo().run()],
  ];
  return <div className="rich-editor"><div className="editor-toolbar" role="toolbar" aria-label="Text formatting">{tools.map(([label, Icon, action, active]) => <button className={`icon-button ${active ? 'selected' : ''}`} type="button" key={label} title={label} aria-label={label} aria-pressed={Boolean(active)} onClick={action}><Icon size={17} /></button>)}{editor.isActive('blockquote') && <select aria-label="Callout style" value={editor.getAttributes('blockquote').tone || 'info'} onChange={(event) => editor.chain().focus().updateAttributes('blockquote', { tone: event.target.value }).run()}><option value="info">Information</option><option value="warning">Warning</option><option value="danger">Important</option></select>}</div>{linkOpen && <div className="editor-link"><input aria-label="Link URL" value={href} onChange={(event) => setHref(event.target.value)} placeholder="https://" /><button type="button" className="button small" disabled={!safeUrl(href)} onClick={() => { editor.chain().focus().extendMarkRange('link').setLink({ href: safeUrl(href) }).run(); setLinkOpen(false); }}>Apply link</button></div>}<EditorContent editor={editor} /></div>;
}

function Dashboard() {
  const { content, preview, resetPreview } = useSite();
  return <><div className="admin-heading"><div><span className="eyebrow">Content workspace</span><h1>Good cricket starts here.</h1></div>{preview && <button className="button small outline" onClick={() => { if (window.confirm('Reset all local preview edits?')) resetPreview(); }}><RotateCcw size={16} /> Reset preview</button>}</div><div className="admin-stats">{Object.entries(resources).filter(([resource]) => resource !== 'settings').map(([resource, config]) => <Link key={resource} to={`/admin/${resource}`}><span>{config.label}</span><strong>{content[resource].length}</strong><small>{content[resource].filter((item) => item.status === 'draft').length} drafts <ArrowUpRight size={14} /></small></Link>)}</div><section className="admin-recent"><h2>Publishing checklist</h2><p>Confirm dates, eligibility, registration destinations and league playing conditions before publication. Published content is visible to everyone.</p><Link className="button" to="/admin/announcements/new"><Plus size={17} /> New announcement</Link></section></>;
}

function ResourceList() {
  const { resource } = useParams();
  const { content, errors, pending, save, remove } = useSite();
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const config = resources[resource];
  if (!config) return <p>Unknown content type.</p>;
  const records = content[resource].filter((item) => `${item.title} ${item.status}`.toLowerCase().includes(search.toLowerCase()));
  async function importDrafts() {
    setBusy(true); setError('');
    try {
      for (const record of importedRules) if (!content.rules.some((item) => item.id === record.id)) await save('rules', record);
    } catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }
  async function deleteRecord(record) {
    if (!window.confirm(`Delete "${record.title}"? This will remove its public page.`)) return;
    setBusy(true); setError('');
    try { await remove(resource, record); } catch (failure) { setError(failure.message); } finally { setBusy(false); }
  }
  return <><div className="admin-heading"><div><span className="eyebrow">Content management</span><h1>{config.label}</h1></div><div className="admin-actions">{resource === 'rules' && <button className="button small outline" disabled={busy} onClick={importDrafts}><Upload size={16} /> Import 2026 drafts</button>}<Link className="button small" to={`/admin/${resource}/new`}><Plus size={16} /> New {config.singular.toLowerCase()}</Link></div></div><label className="admin-search"><span className="sr-only">Search content</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search title or status" /></label>{(error || errors[resource]) && <p className="alert error" role="alert">{error || errors[resource]}</p>}{pending.includes(resource) && <p role="status">Loading...</p>}<div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Title</th><th>Status</th><th>Updated</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{records.map((record) => <tr key={record.id}><td><Link to={`/admin/${resource}/${record.id}`}>{record.title}</Link><small>/{resource}/{record.id}</small></td><td><span className={`publish-state ${record.status}`}>{record.status}</span></td><td>{record.updatedAt ? displayDate(record.updatedAt) : 'Not edited'}</td><td><button className="icon-button danger" title={`Delete ${record.title}`} aria-label={`Delete ${record.title}`} disabled={busy} onClick={() => deleteRecord(record)}><Trash2 size={17} /></button></td></tr>)}</tbody></table></div>{!records.length && !pending.includes(resource) && <p className="empty-state">No documents found.</p>}</>;
}

function Field({ label, value, onChange, type = 'text', required = false, disabled = false, ...rest }) {
  return <label className="form-field"><span>{label}</span><input type={type} value={value || ''} onChange={(event) => onChange(event.target.value)} required={required} disabled={disabled} {...rest} /></label>;
}

function EditForm({ resource, source, id }) {
  const { save, preview } = useSite();
  const navigate = useNavigate();
  const [record, setRecord] = useState(() => structuredClone(source || { ...freshRecord(), ...(resource === 'settings' ? { id: 'main', title: 'Cricket Association of Peoria' } : {}) }));
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('edit');
  const config = resources[resource];
  function update(key, value) { setDirty(true); setRecord((previous) => ({ ...previous, [key]: value })); }
  useEffect(() => {
    if (!dirty) return;
    const prevent = (event) => { event.preventDefault(); event.returnValue = ''; };
    const guardLink = (event) => {
      const link = event.target.closest('a[href]');
      if (link && !link.target && !link.getAttribute('href').startsWith('#') && !window.confirm('Leave this page and discard unsaved changes?')) { event.preventDefault(); event.stopPropagation(); }
    };
    window.addEventListener('beforeunload', prevent);
    document.addEventListener('click', guardLink, true);
    return () => { window.removeEventListener('beforeunload', prevent); document.removeEventListener('click', guardLink, true); };
  }, [dirty]);
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const result = await save(resource, record, id === 'new' ? undefined : id);
      setRecord(result); setDirty(false);
      if (id === 'new') navigate(`/admin/${resource}/${result.id}`, { replace: true });
    } catch (failure) { setError(failure.message); } finally { setBusy(false); }
  }
  const dateTime = (value) => {
    if (!value) return '';
    const date = new Date(value);
    return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  };
  return <form onSubmit={submit}><Link className="back-link" to={`/admin/${resource}`}><ArrowLeft size={15} /> {config.label}</Link><div className="admin-heading"><div><span className="eyebrow">{id === 'new' ? 'New document' : `Revision ${record.revision}`}{dirty ? ' / Unsaved changes' : ''}</span><h1>{config.singular}</h1></div><button className="button" type="submit" disabled={busy}><Save size={17} /> {busy ? 'Saving...' : 'Save changes'}</button></div>{error && <p className="alert error" role="alert">{error}</p>}{record.reviewRequired && <div className="alert"><p>{record.reviewNote || 'Review source playing conditions before publishing.'}</p><label className="checkbox-label"><input type="checkbox" checked={Boolean(record.reviewed)} onChange={(event) => update('reviewed', event.target.checked)} /> I have reviewed the adopted Laws, ICC references and league-specific details.</label></div>}<div className="admin-form-grid"><div><Field label={resource === 'committee' ? 'Full name' : 'Title'} value={record.title} required maxLength={160} onChange={(value) => { setDirty(true); setRecord((previous) => ({ ...previous, title: value, ...(id === 'new' && !previous.id ? { id: slugify(value) } : {}) })); }} /><Field label="URL slug" value={record.id} required disabled={id !== 'new' || resource === 'settings'} onChange={(value) => update('id', value)} /><label className="form-field"><span>{resource === 'committee' ? 'Committee role' : 'Summary'}</span><textarea rows={3} maxLength={600} value={record.summary || ''} onChange={(event) => update('summary', event.target.value)} /></label><div className="editor-tabs" role="tablist" aria-label="Document view"><button type="button" role="tab" aria-selected={tab === 'edit'} onClick={() => setTab('edit')}>Edit</button><button type="button" role="tab" aria-selected={tab === 'preview'} onClick={() => setTab('preview')}><Eye size={15} /> Preview</button></div><div hidden={tab !== 'edit'}><RichEditor value={record.body} onChange={(value) => update('body', value)} /></div>{tab === 'preview' && <div className="editor-preview"><RichContent body={record.body} /></div>}</div><aside className="publish-panel"><h2>Publication</h2><label className="form-field"><span>Visibility</span><select value={record.status} onChange={(event) => update('status', event.target.value)}><option value="draft">Draft</option><option value="published">Published</option></select></label><Field label="Publish at (your local time)" type="datetime-local" required value={dateTime(record.publishAt)} onChange={(value) => update('publishAt', value ? new Date(value).toISOString() : '')} /><Field label="Expires at (optional)" type="datetime-local" value={dateTime(record.expiresAt)} onChange={(value) => update('expiresAt', value ? new Date(value).toISOString() : '')} />{resource === 'announcements' && <><Field label="Category" value={record.category} onChange={(value) => update('category', value)} /><label className="checkbox-label"><input type="checkbox" checked={Boolean(record.pinned)} onChange={(event) => update('pinned', event.target.checked)} /> Pin announcement</label></>}{['leagues', 'tournaments'].includes(resource) && <><h2>Competition</h2><label className="form-field"><span>Status</span><select value={record.stage || 'upcoming'} onChange={(event) => update('stage', event.target.value)}><option value="upcoming">Upcoming</option><option value="registration_open">Registration open</option><option value="in_progress">In progress</option><option value="completed">Completed</option><option value="reference">Reference rulebook</option></select></label><Field label="Season" value={record.season} onChange={(value) => update('season', value)} /><Field label="Format" value={record.format} onChange={(value) => update('format', value)} /><Field label="Start date" type="date" value={record.startDate} onChange={(value) => update('startDate', value)} /><Field label="End date" type="date" value={record.endDate} onChange={(value) => update('endDate', value)} /><Field label="Venues" value={record.venues} onChange={(value) => update('venues', value)} /><Field label="Registration link" type="url" placeholder="https://" value={record.registrationUrl} onChange={(value) => update('registrationUrl', value)} /><Field label="Registration deadline" type="date" value={record.registrationDeadline} onChange={(value) => update('registrationDeadline', value)} /><Field label="Fee" value={record.feeText} onChange={(value) => update('feeText', value)} /><Field label="Rules document slug" value={record.rulesSlug} onChange={(value) => update('rulesSlug', value)} /></>}{resource === 'committee' && <Field label="Display order" type="number" value={record.order ?? 0} onChange={(value) => update('order', Number(value))} />}{resource === 'settings' && <><Field label="Contact email" type="email" value={record.contactEmail} onChange={(value) => update('contactEmail', value)} /><Field label="Practice booking URL" type="url" value={record.practiceBookingUrl} onChange={(value) => update('practiceBookingUrl', value)} /></>}<p className="muted small-text">{preview ? 'Preview changes stay in this browser.' : 'Published pages are public. Drafts require administrator access.'}</p></aside></div></form>;
}

function EditRoute() {
  const { resource, id } = useParams();
  const { content, pending, errors } = useSite();
  if (!resources[resource]) return <p>Unknown content type.</p>;
  if (pending.includes(resource)) return <p role="status">Loading document...</p>;
  if (errors[resource]) return <p role="alert" className="alert error">{errors[resource]}</p>;
  const source = content[resource].find((record) => record.id === id);
  if (id !== 'new' && !source) return <p>Document not found.</p>;
  try { if (source) validateBody(source.body); } catch { return <p className="alert error">Document format is unsupported. Contact the administrator.</p>; }
  return <EditForm key={`${resource}/${id}`} resource={resource} id={id} source={source} />;
}

export default function Admin() {
  const { preview, authReady, isAdmin, user, login, logout } = useSite();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function signIn() { setBusy(true); setError(''); try { await login(); } catch (failure) { setError(failure.message); } finally { setBusy(false); } }
  if (!authReady) return <div className="wrap section" role="status">Checking administrator access...</div>;
  if (!preview && !isAdmin) return <div className="wrap section admin-login"><span className="eyebrow">CAP administration</span><h1>{user ? 'Administrator access required.' : 'Welcome back.'}</h1><p>{user ? 'Your account does not have a website administrator grant. Contact the CAP Firebase project owner.' : 'Sign in with your CAP administrator Google account.'}</p>{error && <p className="alert error" role="alert">{error}</p>}{user ? <button className="button" onClick={() => logout().catch((failure) => setError(failure.message))}><LogOut size={17} /> Sign out</button> : <button className="button" disabled={busy} onClick={signIn}><LogIn size={17} /> {busy ? 'Signing in...' : 'Sign in with Google'}</button>}</div>;
  return <div className="admin-shell"><aside className="admin-sidebar"><Link to="/admin" className="admin-wordmark">CAP / Manage</Link><nav aria-label="Admin navigation"><NavLink to="/admin" end>Overview</NavLink>{Object.entries(resources).map(([resource, config]) => <NavLink to={`/admin/${resource}`} key={resource}>{config.label}</NavLink>)}</nav>{!preview && <button className="text-link" onClick={() => logout().catch((failure) => setError(failure.message))}><LogOut size={16} /> Sign out</button>}<Link className="text-link" to="/">View website <ArrowUpRight size={15} /></Link></aside><div className="admin-main">{preview && <p className="admin-preview-note">Preview workspace / Edits are local to this browser, not production.</p>}{error && <p role="alert" className="alert error">{error}</p>}<Routes><Route index element={<Dashboard />} /><Route path=":resource" element={<ResourceList />} /><Route path=":resource/:id" element={<EditRoute />} /><Route path="*" element={<p>Admin page not found.</p>} /></Routes></div></div>;
}