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