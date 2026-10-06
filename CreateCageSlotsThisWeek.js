import { maintenanceDatabase, collection, addDoc, deleteDoc, query, where, getDocs, doc } from "./scripts/authenticate-automation.mjs";
const db = await maintenanceDatabase();

const cages = ["Cage 1", "Cage 2"];
const weekdayTimes = ["5:00-6:30 PM", "6:30-8:00 PM"];
const weekendTimes = ["10:00 AM-12:00 PM", "12:00-2:00 PM", "2:00-4:00 PM", "4:00-6:00 PM", "6:00-8:00 PM"];

// 📅 Remaining days of THIS week (today through Sunday)
function generateDates() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysSinceMonday = (today.getDay() + 6) % 7;
  return Array.from({ length: 7 - daysSinceMonday }, (_, i) => {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    return { dateStr, dayOfWeek: date.getDay() };
  });
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

async function createThisWeekCageSlots() {
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
          booked_by: null,
        });
        console.log(`Created cage slot: ${dateStr} ${time} for ${cage}`);
      }
    }
  }
  console.log("✅ This week's cage slots created!");
}

createThisWeekCageSlots();
