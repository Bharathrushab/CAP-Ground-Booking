import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, deleteDoc, query, where, getDocs, doc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBuRNNw2S8p3NNY2M8QRQgc0D1KSrceJng",
  authDomain: "cap-practice-booking.firebaseapp.com",
  projectId: "cap-practice-booking",
  storageBucket: "cap-practice-booking.firebasestorage.app",
  messagingSenderId: "49781610428",
  appId: "1:49781610428:web:917a9d2a42e27c9d7e7db9",
  measurementId: "G-BB34REQSK8"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const cages = ["Cage 1", "Cage 2"];
const weekdayTimes = ["5:00-7:00 PM"];
const weekendTimes = ["10:00 AM-12:00 PM", "12:00-2:00 PM", "2:00-4:00 PM", "4:00-6:00 PM"];

function generateDates() {
  const dates = [];
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  const daysUntilNextMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;

  // Generate next week Mon-Sun (7 days)
  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + daysUntilNextMonday + i);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    dates.push({
      dateStr,
      dayOfWeek: date.getDay(),
    });
  }
  return dates;
}

async function deleteOldCageSlots() {
  const today = new Date();
  const lastWeekDate = new Date();
  lastWeekDate.setDate(today.getDate() - 7);
  const formattedDate = lastWeekDate.toISOString().split("T")[0];

  const oldSlotsQuery = query(
    collection(db, "cage_slots"),
    where("date", "<", formattedDate)
  );

  const snapshot = await getDocs(oldSlotsQuery);
  for (const docSnap of snapshot.docs) {
    await deleteDoc(doc(db, "cage_slots", docSnap.id));
    console.log(`Deleted old cage slot: ${docSnap.id}`);
  }
}

async function cageSlotExists(date, time, cage) {
  const q = query(
    collection(db, "cage_slots"),
    where("date", "==", date),
    where("time", "==", time),
    where("cage", "==", cage)
  );
  const snapshot = await getDocs(q);
  return !snapshot.empty;
}

async function deleteAllCageSlots() {
  const snapshot = await getDocs(collection(db, "cage_slots"));
  for (const docSnap of snapshot.docs) {
    await deleteDoc(doc(db, "cage_slots", docSnap.id));
    console.log(`Deleted cage slot: ${docSnap.id}`);
  }
}

async function createCageSlots() {
  await deleteAllCageSlots();
  const dates = generateDates();

  for (const { dateStr, dayOfWeek } of dates) {
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const times = isWeekend ? weekendTimes : weekdayTimes;

    for (const time of times) {
      for (const cage of cages) {
        const exists = await cageSlotExists(dateStr, time, cage);
        if (exists) {
          console.log(`Cage slot already exists: ${dateStr} ${time} ${cage}`);
          continue;
        }
        await addDoc(collection(db, "cage_slots"), {
          date: dateStr,
          time,
          cage,
          is_weekend: isWeekend,
          booked_by: null, // { team, uid, name } or null
        });
        console.log(`Created cage slot: ${dateStr} ${time} for ${cage}`);
      }
    }
  }
  console.log("✅ Cage slots created!");
}

createCageSlots();
