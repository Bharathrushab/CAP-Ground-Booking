import { maintenanceDatabase, collection, addDoc, deleteDoc, query, where, getDocs, doc } from "./scripts/authenticate-automation.mjs";
const db = await maintenanceDatabase();
// ⏱ Slot timings
const times = [
 "5:00-7:30PM"
];
const ymd = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

// Upcoming Monday, or today if it's Monday (covers a weekend run that GitHub delays past midnight)
function targetMonday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + (8 - date.getDay()) % 7);
  return date;
}

// 📅 Mon-Fri of the target week
function generateDates(monday) {
  return Array.from({ length: 5 }, (_, i) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    return ymd(date);
  });
}

async function deleteSlotsBefore(dateStr) {
  const snapshot = await getDocs(query(collection(db, "slots"), where("date", "<", dateStr)));
  for (const docSnap of snapshot.docs) {
    await deleteDoc(doc(db, "slots", docSnap.id));
    console.log(`Deleted old slot: ${docSnap.id}`);
  }
}

async function slotExists(date, time, ground) {
  const snapshot = await getDocs(query(
    collection(db, "slots"),
    where("date", "==", date),
    where("time", "==", time),
    where("ground", "==", ground)
  ));
  return !snapshot.empty;
}

async function updateNextWeekSlots() {
  const monday = targetMonday();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysAhead = Math.round((monday - today) / 86400000);
  // Weekend/Monday runs clear the finished week; a mid-week manual run only clears past days
  await deleteSlotsBefore(ymd(daysAhead <= 2 ? monday : today));
  const dates = generateDates(monday);
  for (let i = 0; i < dates.length; i++) {
    const date = dates[i];
    const [y, m, d] = date.split('-');
    const dayOfWeek = new Date(y, m - 1, d).getDay(); // 1=Mon, 5=Fri

    for (const time of times) {
      for (const ground of ["CAP Ground", "Mossville"]) {
        if (await slotExists(date, time, ground)) {
          console.log(`Slot already exists: ${date} ${time} for ${ground}`);
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
        });
        console.log(`Created slot: ${date} ${time} for ${ground}`);
      }
    }
  }
  console.log("✅ Next week's slots updated!");
}
updateNextWeekSlots();