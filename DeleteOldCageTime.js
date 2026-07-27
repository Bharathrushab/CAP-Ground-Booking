import { initializeApp } from "firebase/app";
import { getFirestore, collection, deleteDoc, query, where, getDocs, doc } from "firebase/firestore";
import firebaseConfig from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Remove obsolete "5:00-7:00 PM" weekday cage slots (replaced by 5:00-6:30 PM and 6:30-8:00 PM)
async function deleteOldCageTime() {
  const q = query(collection(db, "cage_slots"), where("time", "==", "5:00-7:00 PM"));
  const snapshot = await getDocs(q);
  if (snapshot.empty) {
    console.log("No 5:00-7:00 PM cage slots found.");
    return;
  }
  for (const docSnap of snapshot.docs) {
    await deleteDoc(doc(db, "cage_slots", docSnap.id));
    console.log(`Deleted old cage slot: ${docSnap.id} (${docSnap.data().date} ${docSnap.data().cage})`);
  }
  console.log("✅ Old 5:00-7:00 PM cage slots deleted!");
}

deleteOldCageTime();
