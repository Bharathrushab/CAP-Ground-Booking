# Cricket Association of Peoria Website

The official web platform for the **Cricket Association of Peoria (CAP)**. It combines CAP's public website, league and rules information, announcements, content administration, and practice-ground booking in one responsive application.

**Live website:** [cricket-peoria.com](https://cricket-peoria.com)  
**Practice booking:** [cricket-peoria.com/practice-booking](https://cricket-peoria.com/practice-booking)

## Features

### Public Website

- CAP association information and volunteer-led community overview
- League, tournament, committee, ground, and registration information
- Searchable cricket laws and CAP league rules
- News and announcements with image support
- CricClubs registration, scores, and match links
- Responsive layouts for desktop and mobile

### Content Management

- Google-authenticated administration area at `/admin`
- Create, edit, schedule, publish, and archive website content
- Rich-text rules, tables, callouts, and print-friendly pages
- Direct announcement image upload to Firebase Storage
- Revision history and transaction-based conflict protection
- Explicit CMS administrator grants through `cap_admins`

### Practice Booking

- Ground and batting-cage reservations under `/practice-booking`
- Real-time availability through Firestore listeners
- Atomic booking updates using Firestore transactions
- Captain, master, and view-only user roles
- Master controls for reservations, booking roles, and team lists
- Mobile-friendly booking and administration screens

## Technology

| Area | Stack |
|------|-------|
| Public website and CMS | React 18, Vite, React Router |
| Practice booking | React 18, Create React App |
| Data and authentication | Firebase Firestore and Firebase Auth |
| Announcement images | Firebase Storage |
| Hosting | Firebase Hosting |
| Testing | Node test runner and Playwright |

The Vite website lives in `web/`. The booking application remains at the repository root and is merged into `web/dist/practice-booking` during a production website build.

## Local Development

### Public Website and CMS

```powershell
cd web
npm install
npm run dev
```

Open `http://127.0.0.1:5173/` for the website and `/admin` for the CMS. Copy `web/.env.example` to `web/.env.local` and add the Firebase web configuration to connect to live services. Without it, the site runs in clearly labeled local-preview mode.

### Practice Booking

```powershell
npm install
npm start
```

The booking app runs at `http://localhost:3000`.

## Verification

Run website checks from `web/`:

```powershell
npm test
npm run test:browser
npm run build
```

Browser tests require Microsoft Edge. Firestore rules tests additionally require Java and the Firebase CLI:

```powershell
npm run test:rules
```

Build the standalone booking app from the repository root:

```powershell
npm run build
```

## Production Build and Deployment

Build the booking app first, then build and deploy the complete website:

```powershell
# Repository root
npm run build

# web/
cd web
npm run build
npx firebase-tools deploy --only hosting:main --project cap-practice-booking
```

The `web` production build automatically copies the booking build into `/practice-booking`.

Firestore and Storage security rules are deployed separately and should be tested before release:

```powershell
cd web
npx firebase-tools deploy --only firestore:rules,storage --config firebase.security.json --project cap-practice-booking
```

## Slot Maintenance

Standalone scripts generate ground and cage availability in Firestore:

```powershell
node CreateSlots.js
node CreateCageSlots.js
```

Additional one-week and maintenance scripts are available in the repository root. Run them only with an authenticated, authorized Firebase account.

## Security Model

- Booking writes use Firestore transactions.
- Booking permissions are stored in `booking_roles/{uid}`.
- CMS permissions are stored separately in `cap_admins/{uid}`.
- Website content writes are restricted to enabled CMS masters.
- Announcement images are publicly readable but writable only by CMS masters.
- Client applications cannot grant themselves administrative access.

## Repository Layout

```text
src/                     Practice-booking application
web/src/                 Public website and CMS
web/tests/               Unit, browser, and security-rule tests
web/firestore.rules      Shared Firestore security policy
web/storage.rules        Announcement image security policy
web/scripts/             Content, verification, and deployment utilities
CreateSlots*.js          Ground slot generation scripts
CreateCageSlots*.js      Cage slot generation scripts
```

## License

Private project for the Cricket Association of Peoria.
