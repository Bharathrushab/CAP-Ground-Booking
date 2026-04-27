# Copilot Instructions — CAP Ground Booking

## Project Overview

CAP Ground Booking is a cricket ground and batting cage reservation system for the Cricket Association of Peoria (CAP). Team captains book practice slots across multiple grounds and facilities. Administrators ("masters") have elevated privileges to reserve and manage slots.

## Tech Stack

- **Frontend**: React 18.2 (Create React App, react-scripts 5.0.1)
- **Backend/DB**: Firebase 10.14 — Firestore (NoSQL), Firebase Auth, Firebase Hosting
- **Email**: EmailJS 4.4.1 (not yet configured)
- **Language**: JavaScript (no TypeScript)
- **Package Manager**: npm

## Architecture

- Single-page app with tab-based navigation (Ground Booking / Batting Cages)
- `src/App.js` is the main orchestrator (~700 lines): handles auth, state management, booking logic, and tab routing
- Child components (`SlotCard`, `CageSlotCard`, `TeamModal`) receive action callbacks as props
- No external state management — all state is local via `useState` hooks
- Real-time Firestore listeners and snapshots for data fetching

## Firestore Collections

| Collection | Purpose | Key Fields |
|------------|---------|------------|
| `slots` | Ground practice bookings | `date`, `time`, `ground`, `booked_by_teams[]`, `reserved`, `reserved_by` |
| `cage_slots` | Batting cage bookings | `date`, `time`, `cage`, `is_weekend`, `booked_by` |
| `users` | User profiles & roles | `role` (`captain` / `master` / `user`), `name`, `email` |

- Dates are stored as `YYYY-MM-DD` strings
- All booking writes **must** use `runTransaction()` for atomicity

## Booking Rules

### Ground Slots (`slots`)
- Maximum 2 teams per slot
- One slot per team (no team can book two slots)
- Masters can reserve slots (blocks them from regular booking)

### Cage Slots (`cage_slots`)
- One booking per cage per time slot
- One slot per user per weekend/weekday type
- One slot per team per weekend/weekday type
- Masters bypass duplicate booking checks

## Authentication

- Firebase Auth with email/password and Google OAuth
- User doc created in `users` collection on first login
- `role` field controls permissions: `captain` (book), `master` (book + reserve + admin), `user` (view only)

## Predefined Teams

AYF · Bradley Bulls · Challengers · CMCC · Fearless XI · Gladiators · GodFather's XI · Hurricanes · MKCC · PCC · Peoria Knights · Peoria United · RCP · Red Devils · Super Strikers · SuperKings XI

## Code Conventions

- Functional components with React hooks (`useState`, `useEffect`)
- No class components
- CSS in `src/App.css` and `src/styles.css` (no CSS modules or styled-components)
- No TypeScript — plain JavaScript throughout
- No automated test framework currently in use

## Do NOT

- Modify anything in `dataconnect/` or `src/dataconnect-generated/` — these are unused Firebase Data Connect templates unrelated to the booking app
- Add new npm dependencies without explicit approval
- Use class components or external state management libraries (Redux, Zustand, etc.)
- Modify the `build/` directory — it is a production build output
- Change Firebase project configuration in `firebase.json` without approval
