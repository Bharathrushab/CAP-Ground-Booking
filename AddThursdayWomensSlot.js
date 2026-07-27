import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, deleteDoc, doc, query, where, getDocs } from "firebase/firestore";
import firebaseConfig from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const date = "2026-07-16"; // Thursday this week
const time = "5:00-7:30PM";
const ground = "Mossville";

async function addThursdayWomensSlot() {
  // Remove the men's Mossville slot for Thursday (only if unbooked)
  const mensSnap = await getDocs(query(
    collection(db, "slots"),
    where("date", "==", date),
    where("time", "==", time),
    where("ground", "==", ground),
    where("category", "==", "mens")
  ));

  for (const d of mensSnap.docs) {
    const data = d.data();
    const booked = Array.isArray(data.booked_by_teams) ? data.booked_by_teams : [];
    if (booked.length > 0) {
      console.log(`⚠️ Skipped delete — mens Mossville slot is booked by: ${booked.map((b) => b.team).join(", ")}`);
      continue;
    }
    await deleteDoc(doc(db, "slots", d.id));
    console.log(`Deleted mens slot: ${date} ${time} for ${ground}`);
  }

  const existing = await getDocs(query(
    collection(db, "slots"),
    where("date", "==", date),
    where("time", "==", time),
    where("ground", "==", ground),
    where("category", "==", "womens")
  ));

  if (!existing.empty) {
    console.log(`Slot already exists: ${date} ${time} for ${ground} (womens)`);
    return;
  }

  await addDoc(collection(db, "slots"), {
    date,
    time,
    ground,
    booked_by_teams: [],
    note: "",
    category: "womens",
  });
  console.log(`Created womens slot: ${date} ${time} for ${ground}`);
  console.log("✅ Done!");
}

addThursdayWomensSlot();
