import { useEffect, useState, useCallback } from "react";
import { db } from "./firebase";
import { collection, getDocs, doc, runTransaction } from "firebase/firestore";
import { getDoc } from "firebase/firestore";
import SlotCard from "./components/SlotCard";
import CageSlotCard from "./components/CageSlotCard";
import TeamModal from "./components/TeamModal";
import { getAuth, onAuthStateChanged, signOut } from "firebase/auth";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { setDoc } from "firebase/firestore";
import "./App.css"; // Importing styles for the enhanced layout
// import { sendEmail } from "./emailService";

function App() {
 const [slots, setSlots] = useState([]);
 const [womensSlots, setWomensSlots] = useState([]);
 const [cageSlots, setCageSlots] = useState([]);
 const [selectedSlot, setSelectedSlot] = useState(null);
 const [selectedWomensSlot, setSelectedWomensSlot] = useState(null);
 const [selectedCageSlot, setSelectedCageSlot] = useState(null);
 const [activeTab, setActiveTab] = useState("grounds");
 const [loading, setLoading] = useState(true);
 const [toasts, setToasts] = useState([]);
 const [confirmDialog, setConfirmDialog] = useState(null);
 // TODO: Remove test user before deploying
//  const [userRole, setUserRole] = useState("captain");
//  const [user, setUser] = useState({ uid: "test-captain", displayName: "Test Captain", email: "testcaptain@test.com" });
const [userRole, setUserRole] = useState(null);
const [user, setUser] = useState(null);



 // Toast notification helper
 const showToast = useCallback((message, type = "success") => {
   const id = Date.now();
   setToasts((prev) => [...prev, { id, message, type }]);
   setTimeout(() => {
     setToasts((prev) => prev.filter((t) => t.id !== id));
   }, 3500);
 }, []);

 // Confirm dialog helper
 const showConfirm = (message) => {
   return new Promise((resolve) => {
     setConfirmDialog({ message, resolve });
   });
 };

 const handleConfirmYes = () => {
   if (confirmDialog) confirmDialog.resolve(true);
   setConfirmDialog(null);
 };

 const handleConfirmNo = () => {
   if (confirmDialog) confirmDialog.resolve(false);
   setConfirmDialog(null);
 };

 // Fetch user role
  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        const docKey = currentUser.displayName + "_" + currentUser.uid;
        const userDoc = await getDoc(doc(db, "users", docKey));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          if (userData.role) {
            setUser(currentUser);
            setUserRole(userData.role);
          } else {
            setUser(currentUser);
            setUserRole("user");
          }
        } else {
          // Create a new user document for first-time Google sign-ins
          await setDoc(doc(db, "users", docKey), {
            role: "user",
            name: currentUser.displayName || "Unknown",
            email: currentUser.email || "Unknown"
          });
          setUser(currentUser);
          setUserRole("user");
        }
      } else {
        setUser(null);
        setUserRole(null);
      }
    });
    return () => unsubscribe();
  }, []);



 const handleGoogleLogin = async () => {
   const auth = getAuth();
   const provider = new GoogleAuthProvider();
   try {
     const result = await signInWithPopup(auth, provider);
     const currentUser = result.user;
     const docKey = currentUser.displayName + "_" + currentUser.uid;
     const userDoc = await getDoc(doc(db, "users", docKey));
     if (userDoc.exists()) {
       const userData = userDoc.data();
       if (userData.role) {
         setUser(currentUser);
         setUserRole(userData.role);
       } else {
         setUser(currentUser);
         setUserRole("user");
       }
     } else {
       // Create a new user document with default role and additional info
       await setDoc(doc(db, "users", docKey), {
         role: "user",
         name: currentUser.displayName || "Unknown",
         email: currentUser.email || "Unknown"
       });
       setUser(currentUser);
       setUserRole("user");
     }
   } catch (error) {
     showToast("Google login failed: " + error.message, "error");
   }
 };

 const handleLogout = async () => {
   const auth = getAuth();
   try {
     await signOut(auth);
     setUser(null);
     setUserRole(null);
   } catch (error) {
     showToast("Logout failed: " + error.message, "error");
   }
 };

 const WOMENS_TEAMS = ["Powerplay Divas", "Panthers", "Velocity Vixens"];

 const fetchSlots = async () => {
   const snapshot = await getDocs(collection(db, "slots"));
   const allSlots = snapshot.docs
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

   // Split by category
   const mensData = allSlots.filter((slot) => slot.category !== "womens");
   const womensData = allSlots.filter((slot) => slot.category === "womens");

   // Sort slots by date, then by ground (CAP Ground first, then Mossville)
   mensData.sort((a, b) => {
     const dateCompare = new Date(a.date) - new Date(b.date);
     if (dateCompare !== 0) return dateCompare;
     if (a.ground < b.ground) return -1;
     if (a.ground > b.ground) return 1;
     return 0;
   });

   womensData.sort((a, b) => new Date(a.date) - new Date(b.date));

   setSlots(mensData);
   setWomensSlots(womensData);
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

   const timeOrder = ["10:00 AM-12:00 PM", "12:00-2:00 PM", "2:00-4:00 PM", "4:00-6:00 PM", "5:00-6:30 PM", "6:00-8:00 PM", "6:30-8:00 PM"];
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
   const loadData = async () => {
     setLoading(true);
     await Promise.all([fetchSlots(), fetchCageSlots()]);
     setLoading(false);
   };
   loadData();
 }, []);

 const handleBooking = async (team) => {
   if (userRole !== "captain" && userRole !== "master") {
     showToast("Only captains and masters can book slots.", "error");
     return;
   }

   if (!user || !user.uid) {
     showToast("User is not authenticated. Please log in again.", "error");
     return;
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

       // Duplicate checks inside transaction (masters bypass)
       if (userRole !== "master") {
         const allSlotsSnapshot = await getDocs(collection(db, "slots"));
         for (const slot of allSlotsSnapshot.docs) {
           const sd = slot.data();
           if (sd.category === "womens") continue;
           const bt = sd.booked_by_teams || [];
           if (bt.some((entry) => entry.uid === user.uid)) {
             throw new Error("You have already booked a slot for a team. You cannot book another slot.");
           }
           if (bt.some((entry) => entry.team === team)) {
             throw new Error("This team has already booked a slot. You cannot book another slot for this team.");
           }
         }
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
     showToast("Booked!");
     setSelectedSlot(null);
     fetchSlots();
   } catch (e) {
     showToast(e.message, "error");
   }
 };

 const handleReserveSlot = async (slotId) => {
   if (userRole !== "master") {
     showToast("Only masters can reserve slots.", "error");
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
     showToast("Slot reserved for game day.");
     fetchSlots();
   } catch (e) {
     showToast(e.message, "error");
   }
 };

 const handleUnreserveSlot = async (slotId) => {
   if (userRole !== "master") {
     showToast("Only masters can unreserve slots.", "error");
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
     showToast("Slot unreserved. Captains can now book.");
     fetchSlots();
   } catch (e) {
     showToast(e.message, "error");
   }
 };

 const handleCancelBooking = async (slotId, team) => {
   if (!user || !user.uid) {
     showToast("User is not authenticated. Please log in again.", "error");
     return;
   }

   const confirmed = await showConfirm(`Cancel booking for ${team}?`);
   if (!confirmed) return;

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
     showToast("Booking canceled.");
     fetchSlots();
   } catch (e) {
     showToast(e.message, "error");
   }
 };

 const handleCageBooking = async (team) => {
   if (!team) {
     showToast("Please select a team.", "error");
     return;
   }
   if (userRole !== "captain" && userRole !== "master") {
     showToast("Only captains and masters can book cage slots.", "error");
     return;
   }
   if (selectedCageSlot && selectedCageSlot.cage === "Cage 2") {
     showToast("Cage 2 is still being prepared and cannot be booked yet.", "error");
     return;
   }
   if (!user || !user.uid) {
     showToast("User is not authenticated. Please log in again.", "error");
     return;
   }

   const ref = doc(db, "cage_slots", selectedCageSlot.id);
   const isWeekendSlot = selectedCageSlot.is_weekend;

   try {
     await runTransaction(db, async (transaction) => {
       const snap = await transaction.get(ref);
       const slotData = snap.data();

       if (slotData.booked_by && slotData.booked_by.uid) {
         throw new Error("This cage slot is already booked.");
       }

       // Duplicate checks inside transaction (masters bypass)
       if (userRole !== "master") {
         const allCageSnapshot = await getDocs(collection(db, "cage_slots"));
         for (const s of allCageSnapshot.docs) {
           const d = s.data();
           if (!d.booked_by) continue;
           if (d.is_weekend !== isWeekendSlot) continue;
           if (d.booked_by.uid === user.uid) {
             throw new Error(`You have already booked a ${isWeekendSlot ? "weekend" : "weekday"} cage slot.`);
           }
           if (d.booked_by.team === team) {
             throw new Error(`Team ${team} has already booked a ${isWeekendSlot ? "weekend" : "weekday"} cage slot.`);
           }
         }
       }

       transaction.update(ref, {
         booked_by: {
           team,
           uid: user.uid,
           name: user.displayName || "Unknown",
         },
       });
     });
     showToast("Cage booked!");
     setSelectedCageSlot(null);
     fetchCageSlots();
   } catch (e) {
     showToast(e.message, "error");
   }
 };

 const handleCageCancelBooking = async (slotId) => {
   if (!user || !user.uid) {
     showToast("User is not authenticated. Please log in again.", "error");
     return;
   }

   const confirmed = await showConfirm("Cancel this cage booking?");
   if (!confirmed) return;

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
     showToast("Cage booking canceled.");
     fetchCageSlots();
   } catch (e) {
     showToast(e.message, "error");
   }
 };

 // ======== WOMEN'S CRICKET HANDLERS ========

 const handleWomensBooking = async (team) => {
   if (userRole !== "captain" && userRole !== "master") {
     showToast("Only captains and masters can book slots.", "error");
     return;
   }

   if (!user || !user.uid) {
     showToast("User is not authenticated. Please log in again.", "error");
     return;
   }

   const isWomensTeam = WOMENS_TEAMS.includes(team);

   // Men's teams can only book on the day of the slot
   if (!isWomensTeam && userRole !== "master") {
     const today = new Date();
     const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
     if (selectedWomensSlot.date !== todayStr) {
       showToast("Men's teams can only book women's slots on the day of practice (not in advance).", "error");
       return;
     }
   }

   const ref = doc(db, "slots", selectedWomensSlot.id);
   try {
     await runTransaction(db, async (transaction) => {
       const snap = await transaction.get(ref);
       const slotData = snap.data();

       if (slotData.reserved) {
         throw new Error("This slot is reserved for a game. Booking is not allowed.");
       }

       const bookedTeams = Array.isArray(slotData.booked_by_teams) ? slotData.booked_by_teams : [];

       if (bookedTeams.length >= 2) {
         throw new Error("This slot is already fully booked.");
       }

       // Duplicate checks inside transaction (masters bypass)
       if (userRole !== "master") {
         const allSlotsSnapshot = await getDocs(collection(db, "slots"));
         for (const slot of allSlotsSnapshot.docs) {
           const sd = slot.data();
           if (sd.category !== "womens") continue;
           const bt = sd.booked_by_teams || [];
           if (bt.some((entry) => entry.uid === user.uid)) {
             throw new Error("You have already booked a women's slot. You cannot book another.");
           }
         }
       }

       // If a women's team already booked, block men's teams
       if (!isWomensTeam && userRole !== "master") {
         const hasWomensTeam = bookedTeams.some((entry) => WOMENS_TEAMS.includes(entry.team));
         if (hasWomensTeam) {
           throw new Error("A women's team has already booked this slot. Men's teams cannot book.");
         }
       }

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
     showToast("Booked!");
     setSelectedWomensSlot(null);
     fetchSlots();
   } catch (e) {
     showToast(e.message, "error");
   }
 };

 const handleWomensCancelBooking = async (slotId, team) => {
   if (!user || !user.uid) {
     showToast("User is not authenticated. Please log in again.", "error");
     return;
   }

   const confirmed = await showConfirm(`Cancel booking for ${team}?`);
   if (!confirmed) return;

   const ref = doc(db, "slots", slotId);
   try {
     await runTransaction(db, async (transaction) => {
       const snap = await transaction.get(ref);
       const slotData = snap.data();

       const updatedTeams = userRole === "master"
         ? slotData.booked_by_teams.filter((entry) => entry.team !== team)
         : slotData.booked_by_teams.filter(
             (entry) => entry.team !== team || entry.uid !== user.uid
           );

       transaction.update(ref, {
         booked_by_teams: updatedTeams,
       });
     });
     showToast("Booking canceled.");
     fetchSlots();
   } catch (e) {
     showToast(e.message, "error");
   }
 };

 const handleWomensReserveSlot = async (slotId) => {
   if (userRole !== "master") {
     showToast("Only masters can reserve slots.", "error");
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
     showToast("Slot reserved for game day.");
     fetchSlots();
   } catch (e) {
     showToast(e.message, "error");
   }
 };

 const handleWomensUnreserveSlot = async (slotId) => {
   if (userRole !== "master") {
     showToast("Only masters can unreserve slots.", "error");
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
     showToast("Slot unreserved.");
     fetchSlots();
   } catch (e) {
     showToast(e.message, "error");
   }
 };



 if (!user) {
   return (
     <div className="app-container login-page">
       <header className="app-header">
         <img src="/logo.png" alt="CAP Logo" className="app-logo" />
         <div>
           <h1>Cricket Association of Peoria</h1>
           <p>Welcome to the CAP Ground Booking System</p>
         </div>
       </header>

       {/* Scrolling news ticker */}
       <div className="news-ticker">
         <span className="news-ticker-label">📰 NEWS</span>
         <div className="news-ticker-track">
           <span>
             🏆 Super Strikers win the CAP Spring League 2026! &nbsp;•&nbsp;
             🏏 CAP Women's League starts June 13th — book your practice slots! &nbsp;•&nbsp;
             🏏 Practice ground bookings are now open for the season &nbsp;•&nbsp;
           </span>
         </div>
       </div>

       <div className="login-news-layout">
         {/* Login card */}
         <div className="login-card">
           <h2>Login</h2>
           <p className="login-subtitle">Sign in to book practice slots</p>
           <button className="google-login-btn" onClick={handleGoogleLogin}>
             <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="google-icon" />
             Login with Google
           </button>
         </div>

         {/* News cards */}
         <div className="news-section">
           <h3 className="news-section-title">⚡ Latest News</h3>
           <div className="news-card news-card-champion">
             <div className="news-card-body">
               <span className="news-badge">🏆 Champions</span>
               <h4>Super Strikers Win CAP Spring League 2026!</h4>
               <p>Congratulations to Super Strikers on clinching the CAP Spring League title. A fantastic season from all 16 teams!</p>
             </div>
           </div>
           <div className="news-card">
             <div className="news-card-body">
               <span className="news-badge news-badge-upcoming">📅 Upcoming</span>
               <h4>CAP Women's League Starts June 13th</h4>
               <p>The CAP Women's League 2026 kicks off June 13th. Women's teams — book your practice slots now!</p>
             </div>
           </div>
         </div>
       </div>
     </div>
   );
 }

 return (
   <div className="app-container">
     {/* Toast notifications */}
     {toasts.length > 0 && (
       <div className="toast-container">
         {toasts.map((t) => (
           <div key={t.id} className={`toast toast-${t.type}`}>
             {t.type === "success" && "✓ "}
             {t.type === "error" && "✗ "}
             {t.message}
           </div>
         ))}
       </div>
     )}

     {/* Confirm dialog */}
     {confirmDialog && (
       <div className="confirm-overlay">
         <div className="confirm-dialog">
           <p>{confirmDialog.message}</p>
           <div className="confirm-dialog-buttons">
             <button className="confirm-yes" onClick={handleConfirmYes}>Yes, Cancel</button>
             <button className="confirm-no" onClick={handleConfirmNo}>No, Keep</button>
           </div>
         </div>
       </div>
     )}

     <header className="app-header">
       <img src="/logo.png" alt="CAP Logo" className="app-logo" />
       <div>
         <h1>Cricket Association of Peoria</h1>
         <p>Manage your ground bookings with ease</p>
       </div>
       <div className="user-info">
         <span className="user-name">{user.displayName || user.email}</span>
         <span className={`role-badge role-${userRole}`}>{userRole}</span>
         <button className="logout-btn" onClick={handleLogout}>Logout</button>
       </div>
     </header>

     {/* Scrolling news ticker */}
     <div className="news-ticker">
       <span className="news-ticker-label">📰 NEWS</span>
       <div className="news-ticker-track">
         <span>
           🏆 Super Strikers win the CAP Spring League 2026! &nbsp;•&nbsp;
           🏏 CAP Women's League starts June 13th — book your practice slots! &nbsp;•&nbsp;
           🏏 Practice ground bookings are now open for the season &nbsp;•&nbsp;
         </span>
       </div>
     </div>

     <div className="tab-bar">
       <button
         className={`tab-button ${activeTab === "grounds" ? "active" : ""}`}
         onClick={() => setActiveTab("grounds")}
       >
         🏟️ Ground Booking
       </button>
       <button
         className={`tab-button ${activeTab === "womens" ? "active" : ""}`}
         onClick={() => setActiveTab("womens")}
       >
         👩 Women's Cricket
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
       {/* My Booking summary */}
       {user && (() => {
         const mySlot = slots.find(s => (s.booked_by_teams || []).some(e => e.uid === user.uid));
         if (!mySlot) return null;
         const myEntry = mySlot.booked_by_teams.find(e => e.uid === user.uid);
         const [y, m, d] = mySlot.date.split('-');
         const dateStr = new Date(y, m - 1, d).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
         return (
           <div className="my-booking-card">
             <h4>Your Booking</h4>
             <p>🏏 {myEntry.team} — {dateStr}, {mySlot.time} @ {mySlot.ground}</p>
           </div>
         );
       })()}
       {loading ? (
         <div className="loading-container">
           <div className="loading-spinner"></div>
           <p>Loading slots...</p>
         </div>
       ) : slots.length === 0 ? (
         <p className="empty-state">No slots available this week. Check back soon!</p>
       ) : (
         slots.map(slot => (
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
         ))
       )}
       {selectedSlot && (userRole === "captain" || userRole === "master") && (
         <TeamModal
           onConfirm={handleBooking}
           onClose={() => setSelectedSlot(null)}
           excludeTeams={WOMENS_TEAMS}
         />
       )}
     </div>
     )}
     {activeTab === "womens" && (
     <div className="booking-section">
       <h2>Women's Cricket — Mossville (Mon & Fri)</h2>
       <p style={{ fontSize: "0.9em", color: "#555" }}>
         Priority: Women's teams (Powerplay Divas, Panthers, Velocity Vixens). Men's teams can book only on the day if no women's team has booked.
       </p>
       <p style={{ fontSize: "0.9em", color: "#2a7ae2", fontStyle: "italic" }}>
         ℹ️ Women's teams not playing a game this weekend can reach out to CAP to schedule practice time at Mossville on the weekend.
       </p>
       {/* My Booking summary */}
       {user && (() => {
         const mySlot = womensSlots.find(s => (s.booked_by_teams || []).some(e => e.uid === user.uid));
         if (!mySlot) return null;
         const myEntry = mySlot.booked_by_teams.find(e => e.uid === user.uid);
         const [y, m, d] = mySlot.date.split('-');
         const dateStr = new Date(y, m - 1, d).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
         return (
           <div className="my-booking-card">
             <h4>Your Booking</h4>
             <p>🏏 {myEntry.team} — {dateStr}, {mySlot.time} @ {mySlot.ground}</p>
           </div>
         );
       })()}
       {loading ? (
         <div className="loading-container">
           <div className="loading-spinner"></div>
           <p>Loading slots...</p>
         </div>
       ) : womensSlots.length === 0 ? (
         <p className="empty-state">No women's slots available this week. Check back soon!</p>
       ) : (
         womensSlots.map(slot => (
           <SlotCard
             key={slot.id}
             slot={slot}
             onBook={() => setSelectedWomensSlot(slot)}
             onCancel={handleWomensCancelBooking}
             onReserve={handleWomensReserveSlot}
             onUnreserve={handleWomensUnreserveSlot}
             user={user}
             userRole={userRole}
           />
         ))
       )}
       {selectedWomensSlot && (userRole === "captain" || userRole === "master") && (
         <TeamModal
           onConfirm={handleWomensBooking}
           onClose={() => setSelectedWomensSlot(null)}
         />
       )}
     </div>
     )}
     {activeTab === "cages" && (
    <div className="booking-section">
       <div>
       <h2>Batting Cage Booking</h2>
       {/* My Booking summary */}
       {user && (() => {
         const mySlots = cageSlots.filter(s => s.booked_by && s.booked_by.uid === user.uid);
         if (mySlots.length === 0) return null;
         return (
           <div className="my-booking-card">
             <h4>Your Booking{mySlots.length > 1 ? "s" : ""}</h4>
             {mySlots.map(s => {
               const [y, m, d] = s.date.split('-');
               const dateStr = new Date(y, m - 1, d).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
               return <p key={s.id}>🏏 {s.booked_by.team} — {dateStr}, {s.time} @ {s.cage}</p>;
             })}
           </div>
         );
       })()}
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
           const slotDate = new Date(y, m - 1, d);
           const formattedDate = slotDate.toLocaleDateString("en-US", {
             weekday: "long",
             month: "short",
             day: "numeric",
           });
           const today = new Date();
           today.setHours(0, 0, 0, 0);
           const isToday = slotDate.getTime() === today.getTime();
           const isWeekend = Object.values(times).flat()[0]?.is_weekend;
           return (
             <div key={date} className={`cage-date-group${isToday ? ' slot-today' : ''}`}>
               <div className="cage-date-header">
                 📅 {formattedDate}
                 {isToday && <span className="slot-today-badge">Today</span>}
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
           excludeTeams={WOMENS_TEAMS}
         />
       )}
       </div>
     </div>
     )}
   </div>
 );
}
export default App;