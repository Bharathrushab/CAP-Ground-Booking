# AGENTS.md — CAP Ground Booking

## Overview

Cricket ground and batting cage reservation system for the Cricket Association of Peoria (CAP). React 18 frontend with Firebase (Firestore, Auth, Hosting) backend.

## Build & Run

```bash
npm install          # Install dependencies
npm start            # Dev server on localhost:3000
npm run build        # Production build → build/
firebase deploy      # Deploy to Firebase Hosting
```

## Slot Generation (standalone scripts)

```bash
node CreateSlots.js      # Generate ground slots for next Mon–Fri
node CreateCageSlots.js  # Generate cage slots for next Mon–Sun
```

These scripts import Firebase config and write directly to Firestore. Run them manually or on a schedule — they are not part of the React app.

## Key Files (read before making changes)

| File | Purpose |
|------|---------|
| `src/App.js` | Main orchestrator (~700 lines): auth, state, booking logic, tab routing |
| `src/firebase.js` | Firebase app initialization (Firestore, Auth, Analytics) |
| `src/components/SlotCard.js` | Ground slot card — displays booking status, book/cancel/reserve buttons |
| `src/components/CageSlotCard.js` | Cage slot card — single-booking variant |
| `src/components/TeamModal.js` | Team selection dropdown (16 predefined teams) |
| `src/emailService.js` | EmailJS integration (not yet configured) |
| `CreateSlots.js` | Standalone: generates ground practice slots in Firestore |
| `CreateCageSlots.js` | Standalone: generates cage booking slots in Firestore |

## Firestore Transaction Pattern

All booking writes **must** use `runTransaction()`. Inside each transaction:

1. Read the current slot document
2. Check business rules (slot full? team already booked? user already booked?)
3. Write the update only if all checks pass

Example pattern from `App.js`:
```js
await runTransaction(db, async (transaction) => {
  const slotDoc = await transaction.get(slotRef);
  const slotData = slotDoc.data();
  // ... validate booking rules ...
  transaction.update(slotRef, { booked_by_teams: updatedTeams });
});
```

Never use `updateDoc()` or `setDoc()` directly for booking mutations — always wrap in a transaction to prevent race conditions.

## Booking Rules Summary

### Ground Slots (`slots` collection)
- Max 2 teams per slot (`booked_by_teams` array, max length 2)
- One slot per team across all ground slots
- Masters can reserve slots (`reserved: true`, `reserved_by: name`) — blocks regular booking

### Cage Slots (`cage_slots` collection)
- One booking per cage per time slot (`booked_by` is a single object or null)
- One slot per user per weekend/weekday type
- One slot per team per weekend/weekday type
- Masters bypass duplicate booking checks

## Database Schema

### `slots`
```
{ date: "YYYY-MM-DD", time: "5:00-7:30PM", ground: "CAP Ground"|"Mossville",
  booked_by_teams: [{ team, uid, name }], reserved: bool, reserved_by: string|null }
```

### `cage_slots`
```
{ date: "YYYY-MM-DD", time: "10:00 AM-12:00 PM", cage: "Cage 1"|"Cage 2",
  is_weekend: bool, booked_by: { team, uid, name }|null }
```

### `users`
```
{ role: "captain"|"master"|"user", name: string, email: string }
```

## Predefined Teams

AYF · Bradley Bulls · Challengers · CMCC · Fearless XI · Gladiators · GodFather's XI · Hurricanes · MKCC · PCC · Peoria Knights · Peoria United · RCP · Red Devils · Super Strikers · SuperKings XI

## Verification

There are no automated tests. After making changes:

1. Run `npm start` and test the feature in the browser
2. Test with different roles (captain, master, regular user)
3. Verify Firestore data integrity in the Firebase Console
4. Check the browser console for errors

## Guardrails

- **Do NOT** add npm dependencies without explicit approval
- **Do NOT** modify `firebase.json` hosting configuration without approval
- **Do NOT** touch the `build/` directory (production build output)
- **Do NOT** modify `dataconnect/` or `src/dataconnect-generated/` (unused Firebase Data Connect templates — not part of the booking app)
- **Do NOT** use class components or external state management (Redux, Zustand, etc.)
- **Do NOT** introduce TypeScript — this is a plain JavaScript project

## Known TODOs

- Remove test user hardcoding in `App.js` before production deployment
- Uncomment real Firebase Auth `onAuthStateChanged` listener
- Configure EmailJS service/template IDs in `emailService.js`
- Batting cages UI is currently disabled with a "Coming Soon" overlay