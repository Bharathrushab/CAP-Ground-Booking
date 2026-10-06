import { maintenanceDatabase, collection, addDoc, deleteDoc, query, where, getDocs, doc } from "./scripts/authenticate-automation.mjs";
const db = await maintenanceDatabase();

const cages = ["Cage 1", "Cage 2"];
const weekdayTimes = ["5:00-6:30 PM", "6:30-8:00 PM"];
const weekendTimes = ["10:00 AM-12:00 PM", "12:00-2:00 PM", "2:00-4:00 PM", "4:00-6:00 PM", "6:00-8:00 PM"];

const ymd = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

// Upcoming Monday, or today if it's Monday (covers a Sunday run that GitHub delays past midnight)
function targetMonday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + (8 - date.getDay()) % 7);
  return date;
}

function generateDates(monday) {
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    return { dateStr: ymd(date), dayOfWeek: date.getDay() };
  });
}

async function deleteCageSlotsBefore(dateStr) {
  const snapshot = await getDocs(query(collection(db, "cage_slots"), where("date", "<", dateStr)));
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

async function createCageSlots() {
  const monday = targetMonday();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysAhead = Math.round((monday - today) / 86400000);
  // Weekend/Monday runs clear the finished week; a mid-week manual run only clears past days
  await deleteCageSlotsBefore(ymd(daysAhead <= 2 ? monday : today));
  const dates = generateDates(monday);

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
