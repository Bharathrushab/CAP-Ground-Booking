# CAP Ground Booking

A cricket ground and batting cage reservation system for the **Cricket Association of Peoria (CAP)**. Team captains book practice slots across multiple grounds and batting cages. Administrators (masters) have elevated privileges to reserve and manage slots.

🔗 **Live App**: [cap-practice-booking.web.app](https://cap-practice-booking.web.app)

---

## Features

### Ground Booking
- Book practice slots at **CAP Ground** or **Mossville**
- Up to **2 teams per slot** (Mon–Fri, 5:00–7:30 PM)
- One slot per team — no double-booking
- Masters can **reserve slots** to block them from regular booking

### Batting Cage Booking
- Book batting cage sessions at **Cage 1** or **Cage 2**
- **Weekday slots**: 5:00–7:00 PM
- **Weekend slots**: 10 AM–12 PM, 12–2 PM, 2–4 PM, 4–6 PM
- One cage booking per user per weekend/weekday
- One cage booking per team per weekend/weekday

### User Roles
| Role | Permissions |
|------|------------|
| **Captain** | Book and cancel slots for their team |
| **Master** | Book, cancel, reserve slots, and manage all bookings |
| **User** | View-only access |

### Other
- Real-time updates via Firestore listeners
- Mobile-friendly responsive design
- Google OAuth and email/password sign-in

---

## Tech Stack

- **Frontend**: React 18 (Create React App)
- **Backend/DB**: Firebase — Firestore, Auth, Hosting
- **Language**: JavaScript (no TypeScript)

---

## Setup

### 1. Clone the repo
```bash
git clone https://github.com/Bharathrushab/CAP-Ground-Booking.git
cd CAP-Ground-Booking
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure Firebase
Copy the example config and add your own Firebase credentials:
```bash
cp firebase-config.example.js firebase-config.js
```
Edit `firebase-config.js` with your Firebase project details. Contact [@Bharathrushab](https://github.com/Bharathrushab) for access to the existing project, or create your own Firebase project.

### 4. Run locally
```bash
npm start
```
App runs at `http://localhost:3000`

---

## Slot Generation

Ground and cage slots are generated weekly using standalone scripts:

```bash
node CreateSlots.js      # Generate ground slots for next Mon–Fri
node CreateCageSlots.js  # Generate cage slots for next Mon–Sun
```

These scripts write directly to Firestore. They run on a schedule (Saturday 8 AM for grounds, Sunday 6 PM for cages) or can be run manually.

---

## Predefined Teams

AYF · Bradley Bulls · Challengers · CMCC · Fearless XI · Gladiators · GodFather's XI · Hurricanes · MKCC · PCC · Peoria Knights · Peoria United · RCP · Red Devils · Super Strikers · SuperKings XI

---

## Deploy

```bash
npm run build
firebase deploy
```

---

## License

Private project for the Cricket Association of Peoria.

---

## CAP Association Website

The `cap-website` branch adds an independent Vite/React application in `web/`.
It does not change the existing booking application's build or deployment.

### Local Preview

```powershell
cd web
npm ci
npm run dev -- --port 5174 --strictPort
```

Open `http://127.0.0.1:5174/` for the website and `/admin` for its CMS.
Without Firebase configuration, the app uses a labeled local preview. Sample
announcements are not live events. Preview edits persist in browser local
storage; use **Reset preview** in the admin overview to discard them.

Features include league/tournament directories, registration links, announcements,
committee/contact editing, rich-text rules with tables and callouts, print/PDF,
all 42 original CAP Laws summaries plus the Preamble, and a lazy-loaded Three.js
cricket ball. Mobile and reduced-motion views use a static cricket illustration.

### Firebase Connection and Access

Use the existing `cap-practice-booking` Firebase project, with a second Hosting
site. Enter its web app configuration in `web/.env.local` using `web/.env.example`
as the field reference, then restart Vite. No production config is supplied by
default. Firebase web API keys identify the project; security depends on rules,
not on hiding those keys. Never put service-account credentials in client code.

The CMS uses `cap_announcements`, `cap_leagues`, `cap_tournaments`, `cap_rules`,
`cap_committee`, `cap_settings`, and an append-only `cap_revisions` history.
All live content saves/deletes use transactions with revision conflict checks.
Published pages are public after their publication timestamp. Public queries
refresh their publication cutoff each minute; reload to refresh practice
availability. Expired content is hidden from public pages but is not confidential:
it was previously published and may remain readable or cached.

Website administrators sign in with Google. A trusted Firebase project owner
must explicitly create `cap_admins/{firebase-auth-uid}` with
`{ "enabled": true, "role": "master" }`. The browser cannot create or edit grants.
Reuse the same Auth account, but do not derive privileges from a display name.
Existing practice `master` roles are NOT automatically website grants: review
and provision them explicitly. Users sign in separately on different origins.

The shared production policy is now in `web/firestore.rules`. It protects both
booking and CMS collections and replaces the audited unrestricted wildcard.
Run the combined emulator role tests before any rules deployment. Use the separate
`web/firebase.security.json` for intentional security releases; website Hosting
deployments do not change rules. Add missing indexes without deleting existing ones.

Booking authorization uses protected `booking_roles/{firebase-auth-uid}` documents
with `role: "captain"` or `role: "master"`. The existing booking UI still reads its
legacy `users/{displayName}_{uid}` profile. A trusted project owner must update
both records when changing booking roles; client applications cannot grant roles.
The initial 54 booking grants were explicitly approved by the project owner.
Website CMS grants remain separate, with only the approved website administrator.

Ground capacity, reservations, booking ownership and cage exclusivity are enforced
by rules. Cross-slot team/user quotas remain client-side checks in the existing
booking app and are not race-proof; enforcing those globally requires a separate
transactional booking-index migration. Current cage code allows two bookings per
weekday/weekend type, despite the older one-slot overview above.

Maintenance scripts use the installed Firebase CLI's authenticated REST client.
Run `firebase login` under the same OS account as the scheduled task, using a
project-authorized booking master. Scripts check the protected master grant before
access, allow only slot collections, and use transactions for creates/deletes.
They no longer rely on anonymous database writes or `firebase-config.js`.
Set `FIREBASE_CLI_DIRECTORY` to the CLI's `lib` directory outside the default
Windows global npm location. Keep the CLI version stable and rerun maintenance
tests after upgrades because this integration uses its internal client API.

Production connection settings live in ignored `web/.env.production.local`.
Development remains in local-preview mode unless separately configured.
Public CMS queries use a one-minute clock margin and refresh every minute, so
scheduled publication can appear approximately one to two minutes after its time.
Ignored `.deployment-backups/` contains sensitive pre-migration data and recovery
records. Keep it private; never restore the old unrestricted rule as a rollback.

Practice availability is read-only. If current rules require authentication, the
homepage links visitors to the booking app instead of widening database access.
No new booking writes, user-role mutations, Storage, payments or uploads are added.

### Rules Import and MCC Sources

```powershell
npm run import:rules
npm test
npm run verify:mcc
```

On Windows networks where Node HTTPS requests are reset, run
`.\scripts\verify-mcc.ps1` instead. It uses Windows networking and checks all
43 official destinations, including the Preamble, before recording success.

The import converts the three original CAP HTML files into
`web/src/data/imported-rules.json`, preserving their text, headings, lists, tables
and callouts. It never writes to Firebase and never moves/deletes the originals.
An authorized administrator can use **Import 2026 drafts** under **League rules**
to create missing draft documents. Existing documents are skipped, not overwritten.
Review the adopted MCC edition, vague ICC references, team names, dates and fees
before publishing. Imports do not automatically create league listings; create
the matching league and set its rules-document slug in the CMS.

MCC text and media are not republished. The link-check script discovers official
per-Law destinations and verifies them before generating a local URL manifest.
If it cannot complete, the site uses the verified official MCC index rather than
guessing per-Law URLs. MCC's downloads include the 2017 Code, 4th Edition 2026;
confirm its effective date and the version CAP actually adopts before attributing
an edition to the summaries. Do not equate a website's copyright year with its
Law edition. The summaries need a cricket-knowledgeable editorial review before
public launch.

### Verification and Deployment Gates

```powershell
npm test
npm run build
npm run test:browser
npm run test:rules
```

Browser tests expect the dev server on port 5174 and Microsoft Edge installed.
They check desktop/mobile layouts, canvas pixels and movement, Laws navigation,
CMS CRUD/persistence and print output. Screenshots and PDF output go to the ignored
`web/test-results/` directory. Rules tests need Firebase CLI and a supported Java
runtime on PATH, and use only the `demo-cap-website` emulator project. For full
emulator UI testing, set `VITE_USE_EMULATORS=true` and a demo-project web config;
start Auth and Firestore emulators using `web/firebase.emulators.json`.

For production, create the second Hosting site in the Firebase Console, add its
domain to Auth authorized domains, and bind `main` to its actual site ID. Run
these commands **from `web/`**, only after live rules/indexes and admin grants have
been reviewed and configured:

```powershell
firebase target:apply hosting main YOUR_NEW_SITE_ID --project cap-practice-booking
npm run build
firebase deploy --only hosting:main --project cap-practice-booking
```

The `main` target is bound to `cricket-peoria`. Run
`node scripts/verify-live.mjs` from `web/` to verify published queries, anonymous
access denial, the approved administrator grant, Google provider settings, and
index readiness. Complete the real Google popup sign-in manually in the browser;
Firebase CLI OAuth credentials cannot substitute for website OAuth credentials.
`launch-live.mjs` is a guarded, one-time migration, not a routine deployment command.

`web/firebase.json` contains only the new Hosting target; the root hosting config
and `build/` stay untouched. Do not run a blanket `firebase deploy`. Set a real
contact email and practice URL in Site settings, publish reviewed content, and
smoke-test published/draft/scheduled visibility with signed-out users, captains,
and admins. Add a reciprocal link in the practice app after the new public URL is
known. A custom domain, Lighthouse performance/accessibility audit, live Firebase
role tests, and independent editorial/model review remain release gates rather
than implied completed work.