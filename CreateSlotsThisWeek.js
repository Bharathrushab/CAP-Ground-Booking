import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, deleteDoc, query, where, getDocs, doc } from "firebase/firestore";
import firebaseConfig from "./firebase-config.js";
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
// ⏱ Slot timings
const times = [
 "5:00-7:30PM"
];
// 📅 Generate slots for THIS week (Mon-Fri)
function generateDates() {
 const dates = [];
 const today = new Date();
 const dayOfWeek = today.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat

 // Calculate days SINCE this Monday (go backward)
 const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

 // Generate Monday through Friday of this week
 for (let i = 0; i < 5; i++) {
   const date = new Date(today);
   date.setDate(today.getDate() - daysSinceMonday + i);
   const year = date.getFullYear();
   const month = String(date.getMonth() + 1).padStart(2, '0');
   const day = String(date.getDate()).padStart(2, '0');
   dates.push(`${year}-${month}-${day}`);
 }
 return dates;
}
// Function to check if a slot already exists
async function slotExists(date, time, ground, category) {
  const existingSlotQuery = query(
    collection(db, "slots"),
    where("date", "==", date),
    where("time", "==", time),
    where("ground", "==", ground),
    where("category", "==", category)
  );
  const snapshot = await getDocs(existingSlotQuery);
  return !snapshot.empty;
}
// Function to create slots for this week
async function createThisWeekSlots() {
  const dates = generateDates();
  for (let i = 0; i < dates.length; i++) {
    const date = dates[i];
    const [y, m, d] = date.split('-');
    const dayOfWeek = new Date(y, m - 1, d).getDay(); // 1=Mon, 5=Fri
    const isMondayOrFriday = (dayOfWeek === 1 || dayOfWeek === 5);

    for (const time of times) {
      for (const ground of ["CAP Ground", "Mossville"]) {
        // Skip Mossville on Mon/Fri for men's — those belong to women's
        if (isMondayOrFriday && ground === "Mossville") continue;

        const exists = await slotExists(date, time, ground, "mens");
        if (exists) {
          console.log(`Slot already exists: ${date} ${time} for ${ground} (mens)`);
          continue;
        }
        const note = (dayOfWeek === 5 && ground === "CAP Ground")
          ? "⚠️ Note: Practice begins at 5:30 PM due to mowing"
          : "";
        await addDoc(collection(db, "slots"), {
          date,
          time,
          ground,
          booked_by_teams: [],
          note,
          category: "mens",
        });
        console.log(`Created mens slot: ${date} ${time} for ${ground}`);
      }

      // Create women's Mossville slot on Mon/Fri
      if (isMondayOrFriday) {
        const exists = await slotExists(date, time, "Mossville", "womens");
        if (exists) {
          console.log(`Slot already exists: ${date} ${time} for Mossville (womens)`);
          continue;
        }
        await addDoc(collection(db, "slots"), {
          date,
          time,
          ground: "Mossville",
          booked_by_teams: [],
          note: "",
          category: "womens",
        });
        console.log(`Created womens slot: ${date} ${time} for Mossville`);
      }
    }
  }
  console.log("✅ This week's slots created!");
}
createThisWeekSlots();
