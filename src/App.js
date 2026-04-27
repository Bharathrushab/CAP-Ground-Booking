import { useEffect, useState } from "react";
import { db } from "./firebase";
import { collection, getDocs, doc, runTransaction } from "firebase/firestore";
import { getDoc } from "firebase/firestore";
import { where } from "firebase/firestore";
import SlotCard from "./components/SlotCard";
import CageSlotCard from "./components/CageSlotCard";
import TeamModal from "./components/TeamModal";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword } from "firebase/auth";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { setDoc } from "firebase/firestore";
import "./App.css"; // Importing styles for the enhanced layout
import { query } from "firebase/firestore"; // Add query import
// import { sendEmail } from "./emailService";

function App() {
 const [slots, setSlots] = useState([]);
 const [cageSlots, setCageSlots] = useState([]);
 const [selectedSlot, setSelectedSlot] = useState(null);
 const [selectedCageSlot, setSelectedCageSlot] = useState(null);
 const [activeTab, setActiveTab] = useState("grounds");
 // TODO: Remove test user before deploying
 const [userRole, setUserRole] = useState("captain");
 const [user, setUser] = useState({ uid: "test-captain", displayName: "Test Captain", email: "testcaptain@test.com" });
// const [userRole, setUserRole] = useState(null);
// const [user, setUser] = useState(null);

 const [email, setEmail] = useState("");
 const [password, setPassword] = useState("");

 // TODO: Uncomment auth listener before deploying
 // Fetch user role
//  useEffect(() => {
//    const auth = getAuth();
//    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
//      console.log("Auth state changed. Current user:", currentUser);
//      if (currentUser) {
//        console.log("User UID:", currentUser.uid);
//        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
//        if (userDoc.exists()) {
//          const userData = userDoc.data();
//          console.log("User data from Firestore:", userData);
//          if (userData.role) {
//            setUser(currentUser);
//            setUserRole(userData.role);
//          } else {
//            alert("Role not defined for this user. Please contact support.");
//          }
//        } else {
//          console.log("User document does not exist in Firestore.");
//          setUserRole(null);
//        }
//      } else {
//        console.log("No user is currently signed in.");
//        setUserRole(null);
//      }
//    });
//    return () => unsubscribe();
//  }, []);

 const handleLogin = async (e) => {
   e.preventDefault();
   const auth = getAuth();
   try {
     const userCredential = await signInWithEmailAndPassword(auth, email, password);
     const currentUser = userCredential.user;
     const userDoc = await getDoc(doc(db, "users", currentUser.uid));
     if (userDoc.exists()) {
       const userData = userDoc.data();
       if (userData.role) {
         setUser(currentUser);
         setUserRole(userData.role);
       } else {
         alert("Role not defined for this user. Please contact support.");
       }
     } else {
       // Create a new user document with default role and additional info
       await setDoc(doc(db, "users", currentUser.uid), {
         role: "user",
         name: currentUser.displayName || "Unknown",
         email: currentUser.email || "Unknown"
       });
       alert("User document created. Please contact support to update your role.");
       setUser(currentUser);
       setUserRole("user");
     }
   } catch (error) {
     alert("Login failed: " + error.message);
   }
 };

 const handleGoogleLogin = async () => {
   const auth = getAuth();
   const provider = new GoogleAuthProvider();
   try {
     const result = await signInWithPopup(auth, provider);
     const currentUser = result.user;
     const userDoc = await getDoc(doc(db, "users", currentUser.displayName + "_" + currentUser.uid));
     if (userDoc.exists()) {
       const userData = userDoc.data();
       if (userData.role) {
         setUser(currentUser);
         setUserRole(userData.role);
       } else {
         alert("Role not defined for this user. Please contact support.");
       }
     } else {
       // Create a new user document with default role and additional info
       await setDoc(doc(db, "users", currentUser.displayName + "_" + currentUser.uid), {
         role: "user",
         name: currentUser.displayName || "Unknown",
         email: currentUser.email || "Unknown"
       });
       alert("User document created. Please contact support to update your role.");
       setUser(currentUser);
       setUserRole("user");
     }
   } catch (error) {
     alert("Google login failed: " + error.message);
   }
 };

 const fetchSlots = async () => {
   const snapshot = await getDocs(collection(db, "slots"));
   const data = snapshot.docs
     .map((slotDoc) => ({
       id: slotDoc.id,
       ...slotDoc.data(),
     }))
     // Filter out past slots (keep today and future)
     .filter((slot) => {
       const [y, m, d] = slot.date.split('-');
       const slotDate = new Date(y, m - 1, d);
       const today = new Date();
       today.setHours(0, 0, 0, 0);
       return slotDate >= today;
     });

   // Sort slots by date, then by ground (CAP Ground first, then Mossville)
   data.sort((a, b) => {
     const dateCompare = new Date(a.date) - new Date(b.date);
     if (dateCompare !== 0) return dateCompare;
     if (a.ground < b.ground) return -1;
     if (a.ground > b.ground) return 1;
     return 0;
   });
   console.log("Filtered Slots:", data); // Debugging filtered slots
   setSlots(data);
 };

 const fetchCageSlots = async () => {
   const snapshot = await getDocs(collection(db, "cage_slots"));
   const data = snapshot.docs
     .map((slotDoc) => ({
       id: slotDoc.id,
       ...slotDoc.data(),
     }))
     .filter((slot) => {
       const [y, m, d] = slot.date.split('-');
       const slotDate = new Date(y, m - 1, d);
       const today = new Date();
       today.setHours(0, 0, 0, 0);
       return slotDate >= today;
     });

   const timeOrder = ["10:00 AM-12:00 PM", "12:00-2:00 PM", "2:00-4:00 PM", "4:00-6:00 PM", "5:00-7:00 PM"];
   data.sort((a, b) => {
     const dateCompare = new Date(a.date) - new Date(b.date);
     if (dateCompare !== 0) return dateCompare;
     const timeCompare = timeOrder.indexOf(a.time) - timeOrder.indexOf(b.time);
     if (timeCompare !== 0) return timeCompare;
     if (a.cage < b.cage) return -1;
     if (a.cage > b.cage) return 1;
     return 0;
   });
   setCageSlots(data);
 };

 // 🔥 RUN ON PAGE LOAD
 useEffect(() => {
   fetchSlots();
   fetchCageSlots();
 }, []);

 const handleBooking = async (team) => {
   if (userRole !== "captain" && userRole !== "master") {
     alert("Only captains and masters can book slots.");
     return;
   }

   if (!user || !user.uid) {
     alert("User is not authenticated. Please log in again.");
     return;
   }

   const slotsRef = collection(db, "slots");

   // Masters bypass duplicate booking checks
   if (userRole !== "master") {
     // Check if the user has already booked a slot for any team
     const allSlotsSnapshot = await getDocs(slotsRef);
     for (const slot of allSlotsSnapshot.docs) {
       const slotData = slot.data();
       const bookedTeams = slotData.booked_by_teams || [];

       // Check if the user has already booked a slot
       if (bookedTeams.some((entry) => entry.uid === user.uid)) {
         alert("You have already booked a slot for a team. You cannot book another slot.");
         return;
       }

       // Check if the selected team is already booked for another slot
       if (bookedTeams.some((entry) => entry.team === team)) {
         alert("This team has already booked a slot. You cannot book another slot for this team.");
         return;
       }
     }
   }

   const ref = doc(db, "slots", selectedSlot.id);
   try {
     await runTransaction(db, async (transaction) => {
       const snap = await transaction.get(ref);
       const slotData = snap.data();

       // Check if the slot is reserved
       if (slotData.reserved) {
         throw new Error("This slot is reserved for a game. Booking is not allowed.");
       }

       // Ensure booked_by_teams is an array
       const bookedTeams = Array.isArray(slotData.booked_by_teams) ? slotData.booked_by_teams : [];

       // Check if the slot already has two teams booked
       if (bookedTeams.length >= 2) {
         throw new Error("This slot is already fully booked.");
       }

       // Add the new team to the booked_by_teams array
       transaction.update(ref, {
         booked_by_teams: [
           ...bookedTeams,
           {
             team,
             uid: user.uid,
             name: user.displayName || "Unknown",
           },
         ],
       });
     });
     alert("Booked!");
     // sendEmail(
     //   user.email,
     //   "Slot Booked - CAP Ground Booking",
     //   `Hi ${user.displayName || "Captain"},\n\nYour slot has been booked!\n\nTeam: ${team}\nDate: ${selectedSlot.date}\nTime: ${selectedSlot.time}\nGround: ${selectedSlot.ground}\n\n- Cricket Association of Peoria`
     // ).catch((err) => console.error("Email failed:", err));
     setSelectedSlot(null);
     fetchSlots(); // Refresh data
   } catch (e) {
     alert(e.message);
   }
 };

 const handleReserveSlot = async (slotId) => {
   if (userRole !== "master") {
     alert("Only masters can reserve slots.");
     return;
   }

   const ref = doc(db, "slots", slotId);
   try {
     await runTransaction(db, async (transaction) => {
       const snap = await transaction.get(ref);
       const slotData = snap.data();

       transaction.update(ref, {
         reserved: true,
         reserved_by: user.displayName || "Master",
         booked_by_teams: slotData.booked_by_teams || [],
       });
     });
     alert("Slot reserved for game day. No one can book this slot.");
     // Find slot details for the email
     // const reservedSlot = slots.find((s) => s.id === slotId);
     // if (reservedSlot) {
     //   sendEmail(
     //     user.email,
     //     "Slot Reserved - CAP Ground Booking",
     //     `Hi ${user.displayName || "Master"},\n\nYou have reserved a slot for game day.\n\nDate: ${reservedSlot.date}\nTime: ${reservedSlot.time}\nGround: ${reservedSlot.ground}\n\nNo one else can book this slot until you unreserve it.\n\n- Cricket Association of Peoria`
     //   ).catch((err) => console.error("Email failed:", err));
     // }
     fetchSlots();
   } catch (e) {
     alert(e.message);
   }
 };

 const handleUnreserveSlot = async (slotId) => {
   if (userRole !== "master") {
     alert("Only masters can unreserve slots.");
     return;
   }

   const ref = doc(db, "slots", slotId);
   try {
     await runTransaction(db, async (transaction) => {
       transaction.update(ref, {
         reserved: false,
         reserved_by: null,
       });
     });
     alert("Slot unreserved. Captains can now book.");
     fetchSlots();
   } catch (e) {
     alert(e.message);
   }
 };

 const handleCancelBooking = async (slotId, team) => {
   if (!user || !user.uid) {
     alert("User is not authenticated. Please log in again.");
     return;
   }

   const ref = doc(db, "slots", slotId);
   try {
     await runTransaction(db, async (transaction) => {
       const snap = await transaction.get(ref);
       const slotData = snap.data();

       // Master can cancel any team's booking; others can only cancel their own
       const updatedTeams = userRole === "master"
         ? slotData.booked_by_teams.filter((entry) => entry.team !== team)
         : slotData.booked_by_teams.filter(
             (entry) => entry.team !== team || entry.uid !== user.uid
           );

       transaction.update(ref, {
         booked_by_teams: updatedTeams,
       });
     });
     alert("Booking canceled.");
     // Find slot details for the email
     // const canceledSlot = slots.find((s) => s.id === slotId);
     // if (canceledSlot) {
     //   sendEmail(
     //     user.email,
     //     "Booking Canceled - CAP Ground Booking",
     //     `Hi ${user.displayName || "User"},\n\nA booking has been canceled.\n\nTeam: ${team}\nDate: ${canceledSlot.date}\nTime: ${canceledSlot.time}\nGround: ${canceledSlot.ground}\n\n- Cricket Association of Peoria`
     //   ).catch((err) => console.error("Email failed:", err));
     // }
     fetchSlots(); // Refresh data
   } catch (e) {
     alert(e.message);
   }
 };

 const handleCageBooking = async (team) => {
   if (!team) {
     alert("Please select a team.");
     return;
   }
   if (userRole !== "captain" && userRole !== "master") {
     alert("Only captains and masters can book cage slots.");
     return;
   }

   if (!user || !user.uid) {
     alert("User is not authenticated. Please log in again.");
     return;
   }

   const ref = doc(db, "cage_slots", selectedCageSlot.id);
   const isWeekendSlot = selectedCageSlot.is_weekend;

   // Restrictions for non-master users (weekday and weekend checked separately)
   if (userRole !== "master") {
     const allCageSnapshot = await getDocs(collection(db, "cage_slots"));
     for (const s of allCageSnapshot.docs) {
       const d = s.data();
       if (!d.booked_by) continue;
       // Only check against same type (weekday vs weekend)
       if (d.is_weekend !== isWeekendSlot) continue;

       // One cage slot per user per weekday/weekend
       if (d.booked_by.uid === user.uid) {
         alert(`You have already booked a ${isWeekendSlot ? "weekend" : "weekday"} cage slot. You cannot book another.`);
         return;
       }

       // One cage slot per team per weekday/weekend
       if (d.booked_by.team === team) {
         alert(`Team ${team} has already booked a ${isWeekendSlot ? "weekend" : "weekday"} cage slot. Only one slot per team.`);
         return;
       }
     }
   }

   try {
     await runTransaction(db, async (transaction) => {
       const snap = await transaction.get(ref);
       const slotData = snap.data();

       if (slotData.booked_by && slotData.booked_by.uid) {
         throw new Error("This cage slot is already booked.");
       }

       transaction.update(ref, {
         booked_by: {
           team,
           uid: user.uid,
           name: user.displayName || "Unknown",
         },
       });
     });
     alert("Cage booked!");
     setSelectedCageSlot(null);
     fetchCageSlots();
   } catch (e) {
     alert(e.message);
   }
 };

 const handleCageCancelBooking = async (slotId) => {
   if (!user || !user.uid) {
     alert("User is not authenticated. Please log in again.");
     return;
   }

   const ref = doc(db, "cage_slots", slotId);
   try {
     await runTransaction(db, async (transaction) => {
       const snap = await transaction.get(ref);
       if (!snap.exists()) {
         throw new Error("Cage slot not found.");
       }
       const slotData = snap.data();

       if (!slotData.booked_by) {
         throw new Error("This slot is not booked.");
       }

       if (userRole !== "master" && slotData.booked_by.uid !== user.uid) {
         throw new Error("You can only cancel your own bookings.");
       }

       transaction.update(ref, {
         booked_by: null,
       });
     });
     alert("Cage booking canceled.");
     fetchCageSlots();
   } catch (e) {
     alert(e.message);
   }
 };

 const renderSlotDetails = (slot) => {
   return (
     <div>
       <p>Ground: {slot.ground}</p>
       <p>Time: {slot.time}</p>
       <p>Date: {slot.date}</p>
     </div>
   );
 };

 if (!user) {
   return (
     <div className="app-container">
       <header className="app-header">
         <img src="/logo.png" alt="CAP Logo" className="app-logo" />
         <div>
           <h1>Cricket Association of Peoria</h1>
           <p>Welcome to the CAP Ground Booking System</p>
         </div>
       </header>
       <div className="login-section">
         <h2>Login</h2>
         <button onClick={handleGoogleLogin}>Login with Google</button>
       </div>
     </div>
   );
 }

 return (
   <div className="app-container">
     <header className="app-header">
       <img src="/logo.png" alt="CAP Logo" className="app-logo" />
       <div>
         <h1>Cricket Association of Peoria</h1>
         <p>Manage your ground bookings with ease</p>
       </div>
     </header>
     <div className="tab-bar">
       <button
         className={`tab-button ${activeTab === "grounds" ? "active" : ""}`}
         onClick={() => setActiveTab("grounds")}
       >
         🏟️ Ground Booking
       </button>
       <button
         className={`tab-button ${activeTab === "cages" ? "active" : ""}`}
         onClick={() => setActiveTab("cages")}
       >
         🏏 Batting Cages
       </button>
     </div>
     {activeTab === "grounds" && (
     <div className="booking-section">
       <h2>CAP Ground Booking</h2>
       {slots.map(slot => (
         <SlotCard
           key={`${slot.id}-${slot.ground}`}
           slot={slot}
           onBook={() => setSelectedSlot(slot)}
           onCancel={handleCancelBooking}
           onReserve={handleReserveSlot}
           onUnreserve={handleUnreserveSlot}
           user={user}
           userRole={userRole}
         />
       ))}
       {selectedSlot && (userRole === "captain" || userRole === "master") && (
         <TeamModal
           onConfirm={handleBooking}
           onClose={() => setSelectedSlot(null)}
         />
       )}
     </div>
     )}
     {activeTab === "cages" && (
    //  <div className="booking-section">
    <div className="booking-section cage-coming-soon">
       <div className="coming-soon-overlay">
         <h2>🏏 Batting Cages Coming Soon!</h2>
         <p>Our batting cages are being prepared. Booking will be available shortly.</p>
       </div>
       <div className="coming-soon-content">
       {/* <div> */}
       <h2>Batting Cage Booking</h2>
       {(() => {
         // Group cage slots by date, then by time
         const grouped = {};
         cageSlots.forEach(slot => {
           const key = slot.date;
           if (!grouped[key]) grouped[key] = {};
           if (!grouped[key][slot.time]) grouped[key][slot.time] = [];
           grouped[key][slot.time].push(slot);
         });
         return Object.entries(grouped).map(([date, times]) => {
           const [y, m, d] = date.split('-');
           const formattedDate = new Date(y, m - 1, d).toLocaleDateString("en-US", {
             weekday: "long",
             month: "short",
             day: "numeric",
           });
           const isWeekend = Object.values(times).flat()[0]?.is_weekend;
           return (
             <div key={date} className="cage-date-group">
               <div className="cage-date-header">
                 📅 {formattedDate}
                 {isWeekend && <span className="weekend-badge">Weekend</span>}
               </div>
               {Object.entries(times).map(([time, slots]) => (
                 <div key={time} className="cage-time-row">
                   <div className="cage-time-label">🕐 {time}</div>
                   <div className="cage-grid">
                     {slots.map(slot => (
                       <CageSlotCard
                         key={slot.id}
                         slot={slot}
                         onBook={() => setSelectedCageSlot(slot)}
                         onCancel={handleCageCancelBooking}
                         user={user}
                         userRole={userRole}
                       />
                     ))}
                   </div>
                 </div>
               ))}
             </div>
           );
         });
       })()}
       {selectedCageSlot && (userRole === "captain" || userRole === "master") && (
         <TeamModal
           onConfirm={handleCageBooking}
           onClose={() => setSelectedCageSlot(null)}
         />
       )}
       </div>
     </div>
     )}
   </div>
 );
}
export default App;