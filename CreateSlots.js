import { maintenanceDatabase, collection, addDoc, deleteDoc, query, where, getDocs, doc } from "./scripts/authenticate-automation.mjs";
const db = await maintenanceDatabase();
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
// Function to delete ALL existing slots
async function deleteAllSlots() {
  const snapshot = await getDocs(collection(db, "slots"));
  for (const docSnap of snapshot.docs) {
    await deleteDoc(doc(db, "slots", docSnap.id));
    console.log(`Deleted slot: ${docSnap.id}`);
  }
}
// Function to update slots for the next week
async function updateNextWeekSlots() {
  await deleteAllSlots(); // Delete ALL existing slots first
  const dates = generateDates();
  for (let i = 0; i < dates.length; i++) {
    const date = dates[i];
    const [y, m, d] = date.split('-');
    const dayOfWeek = new Date(y, m - 1, d).getDay(); // 1=Mon, 5=Fri

    for (const time of times) {
      for (const ground of ["CAP Ground", "Mossville"]) {
        const note = (dayOfWeek === 5 && ground === "CAP Ground")
          ? "⚠️ Note: Practice begins at 5:30 PM due to mowing"
          : "";
        await addDoc(collection(db, "slots"), {
          date,
          time,
          ground,
          booked_by_teams: [],
          note,
        });
        console.log(`Created slot: ${date} ${time} for ${ground}`);
      }
    }
  }
  console.log("✅ Next week's slots updated!");
}
updateNextWeekSlots();