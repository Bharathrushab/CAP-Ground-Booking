import { lazy, Suspense, useEffect, useState } from 'react';
import { Link, NavLink, Route, Routes, useLocation, useParams } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, Menu, X, Search, CalendarDays, MapPin, BookOpen, Printer, ChevronLeft, ChevronRight, ShieldCheck, Mail } from 'lucide-react';
import { collection, getDocs, limit, orderBy, query, where } from 'firebase/firestore';
import { useSite } from './lib/store';
import { db } from './lib/firebase';
import { displayDate, isPublic, localDate, practiceUrl, resources, safeUrl, registrationOpen } from './lib/content';
import { categories, laws, mccHub, preamble } from './data/laws';
import verifiedLinks from './data/mcc-links.json';
import Hero from './components/Hero';
import RichContent, { Contents } from './components/RichContent';
import capLogo from '../../Designer.png';

const Admin = lazy(() => import('./pages/Admin'));
const cricClubsUrl = 'https://cricclubs.com/CricketAssociationofPeoria/';
const cricClubsRegisterUrl = 'https://cricclubs.com/CricketAssociationofPeoria/register';
const statusLabels = { reference: '2026 rulebook', upcoming: 'Coming up', registration_open: 'Registration open', in_progress: 'In season', completed: 'Completed' };
const publicItems = (items = []) => items.filter((record) => isPublic(record));

function useSettings() {
  const { content } = useSite();
  return publicItems(content.settings).find((item) => item.id === 'main') || {};
}

function Layout({ children }) {
  const { preview, notice, setNotice } = useSite();
  const settings = useSettings();
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  useEffect(() => {
    setMenuOpen(false);
    if (!location.hash) window.scrollTo({ top: 0 });
    document.title = `CAP | ${location.pathname === '/' ? 'Cricket Association of Peoria' : location.pathname.split('/')[1].replace(/^./, (letter) => letter.toUpperCase())}`;
  }, [location]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(''), 5000);
    return () => clearTimeout(timer);
  }, [notice, setNotice]);
  return <>
    <a className="skip-link" href="#main">Skip to content</a>
    {preview && <div className="preview-bar">Local preview <span>Sample announcements. No live registrations or Firebase writes.</span><Link to="/admin">Preview CMS <ArrowUpRight size={13} /></Link></div>}
    <header className="site-header">
      <div className="wrap header-inner">
        <Link className="brand" to="/" aria-label="CAP home"><img className="brand-logo" src={capLogo} alt="CAP crest" width="64" height="64" /><span className="brand-name">CRICKET ASSOCIATION<br />OF PEORIA</span></Link>
        <button className="icon-button mobile-menu" title={menuOpen ? 'Close menu' : 'Open menu'} aria-label={menuOpen ? 'Close menu' : 'Open menu'} aria-expanded={menuOpen} aria-controls="site-nav" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X /> : <Menu />}</button>
        <nav id="site-nav" className={menuOpen ? 'nav open' : 'nav'} aria-label="Main navigation">
          <NavLink to="/leagues">Leagues</NavLink><NavLink to="/tournaments">Tournaments</NavLink><NavLink to="/announcements">News</NavLink><NavLink to="/rules">Rules & laws</NavLink><NavLink to="/about">About CAP</NavLink>
          <a className="button small" href={safeUrl(settings.practiceBookingUrl) || practiceUrl} target="_blank" rel="noopener noreferrer">Book practice <ArrowUpRight size={16} /></a>
        </nav>
      </div>
    </header>
    <main id="main">{children}</main>
    <footer className="site-footer"><div className="wrap footer-grid"><div><Link to="/" className="footer-brand" aria-label="CAP home"><img className="footer-logo" src={capLogo} alt="CAP crest" width="120" height="120" loading="lazy" /></Link><p>Cricket Association of Peoria<br />Peoria, Illinois</p></div><div><h2>Stay in the game</h2><Link to="/leagues">Leagues</Link><Link to="/announcements">Announcements</Link><a href={cricClubsRegisterUrl} target="_blank" rel="noopener noreferrer">Register with CAP <ArrowUpRight size={14} /></a><a href={cricClubsUrl} target="_blank" rel="noopener noreferrer">CricClubs scores & matches <ArrowUpRight size={14} /></a><a href={practiceUrl} target="_blank" rel="noopener noreferrer">Practice booking <ArrowUpRight size={14} /></a></div><div><h2>The association</h2><Link to="/about">Contact & committee</Link><Link to="/laws">MCC Laws reference</Link><Link to="/admin">Administrator sign-in</Link></div></div><div className="wrap footer-bottom"><span>© {new Date().getFullYear()} Cricket Association of Peoria</span><span>Play with purpose. Play with respect.</span></div></footer>
    {notice && <div className="toast" role="status">{notice}<button className="icon-button" onClick={() => setNotice('')} aria-label="Dismiss notification"><X size={16} /></button></div>}
  </>;
}

export function ResourceState({ resource }) {
  const { errors, pending } = useSite();
  if (errors[resource]) return <p className="alert error" role="alert">{errors[resource]} Please try again later.</p>;
  if (pending.includes(resource)) return <p className="empty-state" role="status">Loading {resources[resource].label.toLowerCase()}...</p>;
  return null;
}

function LeagueGrid({ items }) {
  return <div className="league-grid">{items.map((league, index) => <article className={`league-item league-${index % 3}`} key={league.id}>
    <div className="league-meta"><span>{league.season || 'CAP'}</span><span>{league.format || 'Cricket'}</span></div>
    <div className="league-art" aria-hidden="true"><div className="stumps"><i /><i /><i /></div><div className="crease" /><span>{String(index + 1).padStart(2, '0')}</span></div>
    <span className="status-label">{statusLabels[league.stage] || 'League'}</span>
    <h3><Link to={`/leagues/${league.id}`}>{league.title}</Link></h3><p>{league.summary}</p>
    <Link className="item-link" to={`/leagues/${league.id}`}>Explore league <ArrowUpRight size={20} /></Link>
  </article>)}</div>;
}

function PracticePanel() {
  const { preview } = useSite();
  const [slots, setSlots] = useState([]);
  const [state, setState] = useState(preview ? 'preview' : 'loading');
  useEffect(() => {
    if (!db) return;
    let active = true;
    getDocs(query(collection(db, 'slots'), where('date', '>=', localDate()), orderBy('date'), limit(40))).then((snapshot) => {
      if (!active) return;
      setSlots(snapshot.docs.map((record) => ({ id: record.id, ...record.data() })).filter((slot) => !slot.reserved && (slot.booked_by_teams || []).length < 2).slice(0, 3));
      setState('ready');
    }).catch(() => { if (active) setState('restricted'); });
    return () => { active = false; };
  }, []);
  return <section className="practice-band"><div className="wrap practice-grid"><div><span className="eyebrow">Make time for your game</span><h2>Your next innings<br />starts at practice.</h2><p>Grounds and batting cages, all in one place.</p><a className="button" href={practiceUrl} target="_blank" rel="noopener noreferrer">Open practice booking <ArrowUpRight size={17} /></a></div><div className="practice-details"><h3><CalendarDays size={19} /> Ground availability</h3>{state === 'loading' ? <p>Checking available slots...</p> : slots.length ? slots.map((slot) => <a className="slot-row" href={practiceUrl} target="_blank" rel="noopener noreferrer" key={slot.id}><span><strong>{slot.ground}</strong><small>{displayDate(slot.date)} / {slot.time}</small></span><ArrowUpRight size={18} /></a>) : <p>{state === 'preview' ? 'Live availability is shown on the practice booking site.' : state === 'restricted' ? 'Sign in on the practice site to check availability.' : 'No open ground slots found in the upcoming schedule.'}</p>}<span className="muted small-text">Availability is confirmed when your booking completes.</span></div></div></section>;
}

function AnnouncementRow({ item, showCategory = false, headingLevel = 3 }) {
  const Heading = `h${headingLevel}`;
  return <Link className={`news-row ${item.imageUrl ? 'has-image' : ''}`} to={`/announcements/${item.id}`}>
    <span className="news-date">{displayDate(item.publishAt)}</span>
    {item.imageUrl && <img className="news-thumb" src={item.imageUrl} alt={item.imageAlt || ''} loading="lazy" />}
    <span>{showCategory && <small className="eyebrow">{item.category || 'Association'}</small>}<Heading>{item.title}</Heading><p>{item.summary}</p></span>
    <ArrowUpRight />
  </Link>;
}

function Home() {
  const { content } = useSite();
  const settings = useSettings();
  const announcements = publicItems(content.announcements).sort((first, second) => Number(second.pinned) - Number(first.pinned) || second.publishAt.localeCompare(first.publishAt));
  const leagues = publicItems(content.leagues);
  const tournaments = publicItems(content.tournaments);
  return <><Hero bookingUrl={safeUrl(settings.practiceBookingUrl) || practiceUrl} />
    {announcements[0] && <Link className="news-strip" to={`/announcements/${announcements[0].id}`}><span className="wrap"><strong>FROM THE ASSOCIATION</strong><span>{announcements[0].title}</span><ArrowRight size={19} /></span></Link>}
    <section className="section wrap" aria-labelledby="cricclubs-heading">
      <div className="section-heading"><div><span className="eyebrow">Registration & match centre</span><h2 id="cricclubs-heading">CAP on CricClubs</h2><p>Live scores, matches, leagues and standings.</p></div></div>
      <div className="filter-bar"><a className="button" href={cricClubsRegisterUrl} target="_blank" rel="noopener noreferrer">Register with CAP <ArrowUpRight size={17} /></a><a className="button outline" href={cricClubsUrl} target="_blank" rel="noopener noreferrer">View scores & matches <ArrowUpRight size={17} /></a></div>
    </section>
    <section className="section wrap"><div className="section-heading"><div><span className="eyebrow">Find your competition</span><h2>A season for everyone.</h2></div><Link className="text-link" to="/leagues">All leagues <ArrowRight size={17} /></Link></div><ResourceState resource="leagues" />{leagues.length ? <LeagueGrid items={leagues.slice(0, 3)} /> : <p className="empty-state">League details will appear here when published.</p>}</section>
    <PracticePanel />
    <section className="section wrap"><div className="section-heading"><div><span className="eyebrow">Around the boundary</span><h2>Latest from CAP.</h2></div><Link className="text-link" to="/announcements">All announcements <ArrowRight size={17} /></Link></div><ResourceState resource="announcements" />{announcements.slice(0, 3).map((item) => <AnnouncementRow item={item} showCategory key={item.id} />)}</section>
    {tournaments.length > 0 && <section className="wrap section tournament-strip"><h2>On the calendar</h2>{tournaments.slice(0, 3).map((item) => <Link className="news-row" to={`/tournaments/${item.id}`} key={item.id}><span>{displayDate(item.startDate)}</span><h3>{item.title}</h3><ArrowUpRight /></Link>)}</section>}
    <section className="laws-promo"><div className="wrap"><BookOpen size={32} strokeWidth={1.3} /><div><span className="eyebrow">Know the game</span><h2>The laws. The spirit.<br />The way we play.</h2></div><Link className="button outline" to="/rules">Explore rules & laws <ArrowRight size={18} /></Link></div></section>
  </>;
}

function Listing({ resource }) {
  const { content, pending, errors } = useSite();
  const [search, setSearch] = useState('');
  const [stage, setStage] = useState('all');
  const items = publicItems(content[resource]).filter((item) => `${item.title} ${item.summary}`.toLowerCase().includes(search.toLowerCase()) && (stage === 'all' || item.stage === stage));
  return <div className="wrap section"><div className="page-heading"><span className="eyebrow">Cricket Association of Peoria</span><h1>{resource === 'announcements' ? 'News & announcements' : resources[resource].label}</h1></div><div className="filter-bar"><label className="search-input"><Search size={18} /><input aria-label={`Search ${resources[resource].label.toLowerCase()}`} placeholder="Search by name or keyword" value={search} onChange={(event) => setSearch(event.target.value)} /></label>{resource !== 'announcements' && <select aria-label="Filter by status" value={stage} onChange={(event) => setStage(event.target.value)}><option value="all">All statuses</option>{Object.entries(statusLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select>}</div><ResourceState resource={resource} />{items.length ? resource === 'leagues' ? <LeagueGrid items={items} /> : resource === 'announcements' ? items.map((item) => <AnnouncementRow item={item} headingLevel={2} key={item.id} />) : items.map((item) => <Link className="news-row" to={`/${resource}/${item.id}`} key={item.id}><span className="news-date">{displayDate(item.startDate)}</span><span><h2>{item.title}</h2><p>{item.summary}</p></span><ArrowUpRight /></Link>) : !pending.includes(resource) && !errors[resource] && <div className="empty-state"><CalendarDays size={32} /><h2>{search || stage !== 'all' ? 'No matches' : 'Nothing announced yet'}</h2><p>{search || stage !== 'all' ? 'Try a different search or status.' : 'Published updates will appear here.'}</p>{(search || stage !== 'all') && <button className="button" onClick={() => { setSearch(''); setStage('all'); }}>Reset filters</button>}</div>}</div>;
}

function Detail({ resource }) {
  const { slug } = useParams();
  const { content, preview, pending, errors } = useSite();
  const item = publicItems(content[resource]).find((record) => record.id === slug);
  if (pending.includes(resource) || errors[resource]) return <div className="wrap section"><ResourceState resource={resource} /></div>;
  if (!item) return <NotFound />;
  const isRules = resource === 'rules';
  return <div className="wrap section"><Link className="back-link" to={`/${resource}`}><ChevronLeft size={16} /> {resources[resource].label}</Link><div className="page-heading"><span className="eyebrow">{item.season || 'CAP'} / {isRules ? 'Playing conditions' : statusLabels[item.stage] || 'Association'}</span><h1>{item.title}</h1><p>{item.summary}</p></div>
    {resource === 'announcements' && item.imageUrl && <img className="article-cover" src={item.imageUrl} alt={item.imageAlt || ''} />}
    {isRules && <><div className="document-toolbar"><span>Revision {item.revision || 1}{item.updatedAt ? ` / ${displayDate(item.updatedAt)}` : ''}</span><button className="button small outline" onClick={() => window.print()}><Printer size={16} /> Print / PDF</button></div>{preview && <p className="alert">Reference import. Confirm the adopted edition, dates and competition conditions with CAP.</p>}<p className="rule-hierarchy">MCC Laws provide the foundation. CAP competition conditions may vary it; ICC conditions apply only where expressly adopted. <Link to="/laws">MCC reference <ArrowUpRight size={14} /></Link></p></>}
    {!isRules && resource !== 'announcements' && <div className="event-facts"><span><CalendarDays size={19} />{displayDate(item.startDate)}{item.endDate && ` - ${displayDate(item.endDate)}`}</span>{item.venues && <span><MapPin size={19} />{item.venues}</span>}{item.feeText && <span>{item.feeText}</span>}{registrationOpen(item) && <a className="button" href={safeUrl(item.registrationUrl)} target="_blank" rel="noopener noreferrer">Register <ArrowUpRight size={17} /></a>}</div>}
    <div className={isRules ? 'document-layout' : 'article-layout'}>{isRules && <Contents body={item.body} />}<RichContent body={item.body} /></div>
    {item.rulesSlug && <Link className="button outline" to={`/rules/${item.rulesSlug}`}><BookOpen size={17} /> League playing conditions</Link>}
  </div>;
}

function RulesHub() {
  const { content } = useSite();
  return <div className="wrap section"><div className="page-heading"><span className="eyebrow">The way we play</span><h1>Rules & the spirit of cricket.</h1><p>CAP playing conditions and a guide to the official MCC Laws.</p></div><div className="rules-split"><section><h2>CAP league rulebooks</h2><ResourceState resource="rules" />{publicItems(content.rules).map((item) => <Link className="rule-row" to={`/rules/${item.id}`} key={item.id}><BookOpen size={24} strokeWidth={1.4} /><span><strong>{item.title}</strong><small>Playing conditions / {item.season}</small></span><ArrowUpRight size={20} /></Link>)}</section><section className="mcc-intro"><span className="eyebrow">The foundation of the game</span><h2>42 Laws.<br />One shared spirit.</h2><p>Original CAP summaries, with links to the authoritative Laws at Lord's.</p><Link className="button" to="/laws">Browse the Laws <ArrowRight size={17} /></Link><a className="text-link" href={mccHub} target="_blank" rel="noopener noreferrer">Official MCC website <ArrowUpRight size={16} /></a></section></div></div>;
}

function LawsIndex() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const filtered = laws.filter((law) => (category === 'all' || law.category === category) && `${law.number} ${law.title} ${law.summary}`.toLowerCase().includes(search.toLowerCase()));
  return <div className="wrap section"><div className="page-heading"><span className="eyebrow">MCC Laws / CAP reference</span><h1>Know the game.</h1><p>Explore all 42 Laws and the Spirit of Cricket.</p></div><div className="laws-browser"><aside className="laws-sidebar"><div className="field-map" aria-hidden="true"><div className="field-map-inner" /><div className="field-pitch" />{categories.map((label, index) => <span className={category === label ? 'field-dot active' : 'field-dot'} style={{ '--angle': `${index * 60}deg` }} key={label}>{index + 1}</span>)}</div><div className="category-filters" aria-label="Filter Laws by topic"><button className={category === 'all' ? 'selected' : ''} onClick={() => setCategory('all')}>All 42 Laws <span>42</span></button>{categories.map((label, index) => <button className={category === label ? 'selected' : ''} key={label} onClick={() => setCategory(label)}><span>{index + 1}. {label}</span></button>)}</div></aside><div><Link className="spirit-row" to="/laws/preamble"><ShieldCheck size={25} /><span><small>PREAMBLE</small><strong>The Spirit of Cricket</strong></span><ArrowUpRight size={20} /></Link><label className="search-input laws-search"><Search size={18} /><input aria-label="Search Laws" value={search} placeholder="Search by Law, number or keyword" onChange={(event) => setSearch(event.target.value)} /></label><p className="result-count" aria-live="polite">{filtered.length} Laws</p><div className="law-list">{filtered.map((law) => <Link to={`/laws/${law.number}`} key={law.number}><span className="law-number">{String(law.number).padStart(2, '0')}</span><span><strong>{law.title}</strong><small>{law.category}</small></span><ArrowUpRight size={17} /></Link>)}</div>{!filtered.length && <div className="empty-state"><p>No matching Laws.</p><button className="button" onClick={() => { setSearch(''); setCategory('all'); }}>Reset filters</button></div>}</div></div><MccResources /></div>;
}

function MccResources() {
  return <section className="mcc-resources"><h2>From the custodians of the game</h2><p>MCC owns the official Laws. CAP summaries are informal guidance, not a substitute for the adopted Laws and competition conditions.</p><div><a href={mccHub} target="_blank" rel="noopener noreferrer">Official Laws <ArrowUpRight size={15} /></a><a href="https://laws.lords.org/" target="_blank" rel="noopener noreferrer">MCC e-learning <ArrowUpRight size={15} /></a><a href="https://www.lords.org/mcc/about-the-laws-of-cricket" target="_blank" rel="noopener noreferrer">Editions & downloads <ArrowUpRight size={15} /></a><a href="https://apps.lords.org/concussion/story_html5.html?lms=1" target="_blank" rel="noopener noreferrer">Concussion education <ArrowUpRight size={15} /></a></div>{verifiedLinks.checkedAt && <small>Official links checked {displayDate(verifiedLinks.checkedAt)}. Confirm the edition adopted by your competition.</small>}</section>;
}

function LawDetail() {
  const { number } = useParams();
  const law = number === 'preamble' ? preamble : laws.find((item) => String(item.number) === number);
  if (!law) return <NotFound />;
  return <div className="wrap section law-detail"><Link className="back-link" to="/laws"><ChevronLeft size={16} /> All Laws</Link><div className="page-heading"><span className="eyebrow">{law.number ? `Law ${law.number} / ${law.category}` : 'Preamble'}</span><h1>{law.title}</h1></div><div className="law-summary"><h2>In plain English</h2><p>{law.summary}</p><a className="button" href={verifiedLinks.links[law.number] || law.officialUrl} target="_blank" rel="noopener noreferrer">Read the official {law.number ? 'Law' : 'Preamble'} <ArrowUpRight size={17} /></a><h2>At CAP</h2><p>Use the playing conditions for your specific league. Where the adopted Law and local conditions need interpretation, consult the match umpires and CAP committee.</p><Link className="text-link" to="/rules">CAP league rulebooks <ArrowRight size={17} /></Link></div><div className="law-pagination"><Link to={law.number > 1 ? `/laws/${law.number - 1}` : '/laws/preamble'}><ChevronLeft size={17} />{law.number > 1 ? `Law ${law.number - 1}` : 'Preamble'}</Link>{(!law.number || law.number < 42) && <Link to={`/laws/${(law.number || 0) + 1}`}>Law {(law.number || 0) + 1}<ChevronRight size={17} /></Link>}</div><MccResources /></div>;
}

function About() {
  const { content } = useSite();
  const settings = useSettings();
  const email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(settings.contactEmail || '') ? settings.contactEmail : 'cappeoria1@gmail.com';
  return <div className="wrap section"><div className="page-heading"><span className="eyebrow">Our association</span><h1>A community<br />built around cricket.</h1><p>Cricket Association of Peoria / Peoria, Illinois</p></div><div className="about-layout"><section><h2>See you at the ground.</h2><p>CAP is run entirely by a group of cricket enthusiast volunteers who organize leagues, grounds and match days for the community.</p><a className="button" href={`mailto:${email}`}><Mail size={18} /> Contact CAP</a><p className="muted">{email}</p></section><section><h2>Committee</h2><ResourceState resource="committee" />{publicItems(content.committee).length ? publicItems(content.committee).sort((first, second) => (first.order || 0) - (second.order || 0)).map((member) => <div className="committee-row" key={member.id}><span className="initials">{member.title.split(' ').map((part) => part[0]).slice(0, 2).join('')}</span><span><strong>{member.title}</strong><small>{member.summary}</small></span></div>) : <p>For league enquiries, playing conditions and association matters, contact CAP by email.</p>}</section></div><OurLeagues /><TournamentGrounds /></div>;
}

function OurLeagues() {
  const leagues = [
    'CAP Indoor League', 'CAP Spring League', 'CAP Premier League', 'CAP Champions League',
    'CAP Fall League', 'CAP Super 6', "CAP Women's Premier League", "CAP Women's Fall League",
  ];
  return <section className="section" aria-labelledby="our-leagues-heading">
    <div className="section-heading"><div><h2 id="our-leagues-heading">Leagues we run</h2><p>Running from January to October, depending on feasibility each season.</p></div></div>
    <div className="league-list">
      {leagues.map((league) => <div className="committee-row" key={league}><span>{league}</span></div>)}
    </div>
  </section>;
}

function TournamentGrounds() {
  return <section className="section" aria-labelledby="tournament-grounds-heading">
    <div className="section-heading"><div><h2 id="tournament-grounds-heading">Tournament grounds</h2><p>CAP tournaments are played at CAP Ground and Mossville Ground.</p></div></div>
    <div className="about-layout">
      {[
        { name: 'CAP Ground', url: 'https://maps.app.goo.gl/CC84sTuJoYLRCMdQ6' },
        { name: 'Mossville Ground', url: 'https://maps.app.goo.gl/h43GWWLJf64bEfyT9' },
      ].map((ground) => <div key={ground.name}>
        <h3>{ground.name}</h3>
        <a className="text-link" href={ground.url} target="_blank" rel="noopener noreferrer" aria-label={`${ground.name} on Google Maps`}><MapPin size={18} /> Google Maps <ArrowUpRight size={17} /></a>
      </div>)}
    </div>
  </section>;
}

function NotFound() { return <div className="wrap section empty-state"><span className="eyebrow">404</span><h1>Outside the boundary.</h1><p>This page is unavailable or has not been published.</p><Link className="button" to="/">Back to CAP <ArrowRight size={17} /></Link></div>; }

export default function App() {
  return <Layout><Suspense fallback={<div className="wrap section" role="status">Loading...</div>}><Routes><Route path="/" element={<Home />} />{['announcements', 'leagues', 'tournaments'].map((resource) => <Route path={`/${resource}`} key={resource}><Route index element={<Listing resource={resource} />} /><Route path=":slug" element={<Detail resource={resource} />} /></Route>)}<Route path="/rules" element={<RulesHub />} /><Route path="/rules/:slug" element={<Detail resource="rules" />} /><Route path="/laws" element={<LawsIndex />} /><Route path="/laws/:number" element={<LawDetail />} /><Route path="/about" element={<About />} /><Route path="/practice" element={<div className="wrap section"><h1>Practice booking</h1><PracticePanel /></div>} /><Route path="/admin/*" element={<Admin />} /><Route path="*" element={<NotFound />} /></Routes></Suspense></Layout>;
}