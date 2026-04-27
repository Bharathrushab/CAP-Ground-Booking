import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, deleteDoc, query, where, getDocs, doc } from "firebase/firestore";
import firebaseConfig from "./firebase-config.js";
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
// ⏱ Slot timings
const times = [
 "5:00-7:30PM"
];
// 📅 Generate slots for next week (Mon-Fri)
function generateDates() {
 const dates = [];
 const today = new Date();
 const dayOfWeek = today.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat

 // Calculate days until next Monday
 const daysUntilNextMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;

 // Generate Monday through Friday of next week
 for (let i = 0; i < 5; i++) {
   const date = new Date(today);
   date.setDate(today.getDate() + daysUntilNextMonday + i);
   const year = date.getFullYear();
   const month = String(date.getMonth() + 1).padStart(2, '0');
   const day = String(date.getDate()).padStart(2, '0');
   dates.push(`${year}-${month}-${day}`);
 }
 return dates;
}
// Function to delete previous week's slots
async function deletePreviousWeekSlots() {
  const today = new Date();
  const lastWeekDate = new Date();
  lastWeekDate.setDate(today.getDate() - 7); // Go back 7 days
  const formattedLastWeekDate = lastWeekDate.toISOString().split("T")[0];

  const oldSlotsQuery = query(
    collection(db, "slots"),
    where("date", "<", formattedLastWeekDate)
  );

  const snapshot = await getDocs(oldSlotsQuery);
  for (const docSnap of snapshot.docs) {
    await deleteDoc(doc(db, "slots", docSnap.id));
    console.log(`Deleted old slot: ${docSnap.id}`);
  }
}
// Function to check if a slot already exists
async function slotExists(date, time) {
  const existingSlotQuery = query(
    collection(db, "slots"),
    where("date", "==", date),
    where("time", "==", time)
  );
  const snapshot = await getDocs(existingSlotQuery);
  return !snapshot.empty; // Returns true if a slot already exists
}
// Function to update slots for the next week
async function updateNextWeekSlots() {
  await deletePreviousWeekSlots(); // Delete previous week's slots first
  const dates = generateDates();
  for (const date of dates) {
    for (const time of times) {
      for (const ground of ["CAP Ground", "Mossville"]) { // Add two grounds
        await addDoc(collection(db, "slots"), {
          date,
          time,
          ground, // Add ground field
          booked_by_teams: [], // Initialize as an empty array without placeholders
        });
        console.log(`Created slot: ${date} ${time} for ${ground}`);
      }
    }
  }
  console.log("✅ Next week's slots updated!");
}
updateNextWeekSlots();