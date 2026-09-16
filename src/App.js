import { useEffect, useState, useCallback, useMemo } from "react";
import { db } from "./firebase";
import { collection, getDocs, doc, runTransaction, writeBatch, deleteDoc } from "firebase/firestore";
import { getDoc } from "firebase/firestore";
import SlotCard from "./components/SlotCard";
import CageSlotCard from "./components/CageSlotCard";
import TeamModal from "./components/TeamModal";
import { TEAM_GROUPS, DEFAULT_TEAMS, teamDocId, groupTeams } from "./teams";
import { getAuth, onAuthStateChanged, signOut } from "firebase/auth";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { setDoc } from "firebase/firestore";
import "./App.css"; // Importing styles for the enhanced layout
// import { sendEmail } from "./emailService";

function App() {
 const [slots, setSlots] = useState([]);
 const [cageSlots, setCageSlots] = useState([]);
 const [selectedSlot, setSelectedSlot] = useState(null);
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
const [showRoleManager, setShowRoleManager] = useState(false);
const [manageableUsers, setManageableUsers] = useState([]);
const [roleManagerLoading, setRoleManagerLoading] = useState(false);
const [teams, setTeams] = useState([]);
const [showTeamManager, setShowTeamManager] = useState(false);
const [newTeamName, setNewTeamName] = useState("");
const [newTeamGroup, setNewTeamGroup] = useState(TEAM_GROUPS[0].label);



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
            email: currentUser.email || "Unknown",
            uid: currentUser.uid
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
         email: currentUser.email || "Unknown",
         uid: currentUser.uid
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

 // Older profiles were created without a `uid` field; derive it from the doc id (name_uid).
 const uidOfProfile = (profile) => profile.uid || profile.id.slice(profile.id.lastIndexOf("_") + 1);

 const openRoleManager = async () => {
   setShowRoleManager(true);
   setRoleManagerLoading(true);
   try {
     const snapshot = await getDocs(collection(db, "users"));
     const list = snapshot.docs
       .map((userDoc) => ({ id: userDoc.id, ...userDoc.data() }))
       .filter((profile) => uidOfProfile(profile) !== user.uid)
       .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
     setManageableUsers(list);
   } catch (error) {
     showToast("Failed to load users: " + error.message, "error");
   } finally {
     setRoleManagerLoading(false);
   }
 };

 const closeRoleManager = () => {
   setShowRoleManager(false);
   setManageableUsers([]);
 };

 const handleChangeRole = async (profile, newRole) => {
   const targetUid = uidOfProfile(profile);
   try {
     const batch = writeBatch(db);
     batch.update(doc(db, "users", profile.id), { role: newRole });
     batch.set(doc(db, "booking_roles", targetUid), { role: newRole, approvedBy: user.uid });
     await batch.commit();
     setManageableUsers((prev) =>
       prev.map((p) => (p.id === profile.id ? { ...p, role: newRole } : p))
     );
     showToast(`${profile.name || profile.email} is now ${newRole}.`);
   } catch (error) {
     showToast(error.message, "error");
   }
 };

 const fetchTeams = async () => {
   const snapshot = await getDocs(collection(db, "booking_teams"));
   setTeams(
     snapshot.empty
       ? DEFAULT_TEAMS
       : snapshot.docs.map((teamDoc) => ({ id: teamDoc.id, ...teamDoc.data() }))
   );
 };

 const groupedTeams = useMemo(() => groupTeams(teams), [teams]);

 // The team list starts as code defaults; the first master edit persists them to Firestore.
 const seedTeamsIfEmpty = async () => {
   const snapshot = await getDocs(collection(db, "booking_teams"));
   if (!snapshot.empty) return;
   const batch = writeBatch(db);
   DEFAULT_TEAMS.forEach((team) => {
     batch.set(doc(db, "booking_teams", teamDocId(team.name)), { name: team.name, group: team.group });
   });
   await batch.commit();
 };

 const handleAddTeam = async () => {
   const name = newTeamName.trim();
   if (!name) {
     showToast("Enter a team name.", "error");
     return;
   }
   if (teams.some((team) => team.name.toLowerCase() === name.toLowerCase())) {
     showToast(`${name} already exists.`, "error");
     return;
   }
   try {
     await seedTeamsIfEmpty();
     const batch = writeBatch(db);
     batch.set(doc(db, "booking_teams", teamDocId(name)), { name, group: newTeamGroup });
     await batch.commit();
     setNewTeamName("");
     await fetchTeams();
     showToast(`${name} added.`);
   } catch (error) {
     showToast(error.message, "error");
   }
 };

 const handleRemoveTeam = async (team) => {
   const confirmed = await showConfirm(`Remove ${team.name} from the team list?`);
   if (!confirmed) return;
   try {
     await seedTeamsIfEmpty();
     await deleteDoc(doc(db, "booking_teams", team.id || teamDocId(team.name)));
     await fetchTeams();
     showToast(`${team.name} removed.`);
   } catch (error) {
     showToast(error.message, "error");
   }
 };

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

   // Sort slots by date, then by ground (CAP Ground first, then Mossville)
   allSlots.sort((a, b) => {
     const dateCompare = new Date(a.date) - new Date(b.date);
     if (dateCompare !== 0) return dateCompare;
     if (a.ground < b.ground) return -1;
     if (a.ground > b.ground) return 1;
     return 0;
   });

   setSlots(allSlots);
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
     await Promise.all([fetchSlots(), fetchCageSlots(), fetchTeams()]);
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

       // Duplicate checks inside transaction (masters bypass). Max 2 per weekend/weekday type.
       if (userRole !== "master") {
         const allCageSnapshot = await getDocs(collection(db, "cage_slots"));
         let userCount = 0;
         let teamCount = 0;
         for (const s of allCageSnapshot.docs) {
           const d = s.data();
           if (!d.booked_by) continue;
           if (d.is_weekend !== isWeekendSlot) continue;
           if (d.booked_by.uid === user.uid) userCount++;
           if (d.booked_by.team === team) teamCount++;
         }
         if (userCount >= 2) {
           throw new Error(`You have already booked 2 ${isWeekendSlot ? "weekend" : "weekday"} cage slots (max 2).`);
         }
         if (teamCount >= 2) {
           throw new Error(`${team} has already booked 2 ${isWeekendSlot ? "weekend" : "weekday"} cage slots (max 2).`);
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

 if (!user) {
   return (
     <div className="app-container login-page">
       <header className="app-header">
         <img src={`${process.env.PUBLIC_URL}/logo.png`} alt="CAP Logo" className="app-logo" />
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
             🏆 Powerplay Divas win the CAP Women's League 2026! &nbsp;•&nbsp;
             🏏 CAP T20 Fall Tournament starts Aug 29 — book your practice slots! &nbsp;•&nbsp;
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
               <h4>Powerplay Divas Win the CAP Women's League 2026!</h4>
               <p>Congratulations to Powerplay Divas on clinching the CAP Women's League title. A fantastic season from all the teams!</p>
             </div>
           </div>
           <div className="news-card">
             <div className="news-card-body">
               <span className="news-badge news-badge-upcoming">📅 Upcoming</span>
               <h4>CAP T20 Fall Tournament Starts Aug 29</h4>
               <p>The CAP T20 Fall Tournament 2026 kicks off August 29th. Captains — book your practice slots now!</p>
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

     {/* Manage roles modal (master only) */}
     {showRoleManager && (
       <div className="role-modal-overlay" onClick={closeRoleManager}>
         <div className="role-modal" onClick={(e) => e.stopPropagation()}>
           <h3 className="role-modal-title">Manage Roles</h3>
           {roleManagerLoading ? (
             <p className="empty-state">Loading users...</p>
           ) : manageableUsers.length === 0 ? (
             <p className="empty-state">No other users found.</p>
           ) : (
             <div className="role-list">
               {manageableUsers.map((profile) => (
                 <div key={profile.id} className="role-row">
                   <div className="role-row-info">
                     <span className="role-row-name">{profile.name || "Unknown"}</span>
                     <span className="role-row-email">{profile.email}</span>
                   </div>
                   <div className="role-row-actions">
                     {["user", "captain", "master"].map((option) => (
                       <button
                         key={option}
                         className={`role-option-btn ${profile.role === option ? "active" : ""}`}
                         disabled={profile.role === option}
                         onClick={() => handleChangeRole(profile, option)}
                       >
                         {option}
                       </button>
                     ))}
                   </div>
                 </div>
               ))}
             </div>
           )}
           <div className="role-modal-footer">
             <button className="role-modal-close" onClick={closeRoleManager}>Close</button>
           </div>
         </div>
       </div>
     )}

     {/* Manage teams modal (master only) */}
     {showTeamManager && (
       <div className="role-modal-overlay" onClick={() => setShowTeamManager(false)}>
         <div className="role-modal" onClick={(e) => e.stopPropagation()}>
           <h3 className="role-modal-title">Manage Teams</h3>
           <div className="team-add-row">
             <input
               className="team-add-input"
               type="text"
               placeholder="New team name"
               value={newTeamName}
               onChange={(e) => setNewTeamName(e.target.value)}
               onKeyDown={(e) => e.key === "Enter" && handleAddTeam()}
             />
             <select
               className="team-add-select"
               value={newTeamGroup}
               onChange={(e) => setNewTeamGroup(e.target.value)}
             >
               {TEAM_GROUPS.map((group) => (
                 <option key={group.label} value={group.label}>{group.label}</option>
               ))}
             </select>
             <button className="team-add-btn" onClick={handleAddTeam}>Add</button>
           </div>
           <div className="role-list">
             {groupedTeams.map((group) => (
               <div key={group.label} className="team-manage-group">
                 <div className="team-group-label">{group.label}</div>
                 {group.teams.map((name) => (
                   <div key={name} className="team-manage-row">
                     <span className="team-manage-name">{name}</span>
                     <button
                       className="team-remove-btn"
                       onClick={() => handleRemoveTeam(teams.find((t) => t.name === name))}
                     >
                       Remove
                     </button>
                   </div>
                 ))}
               </div>
             ))}
           </div>
           <div className="role-modal-footer">
             <button className="role-modal-close" onClick={() => setShowTeamManager(false)}>Close</button>
           </div>
         </div>
       </div>
     )}

     <header className="app-header">
       <img src={`${process.env.PUBLIC_URL}/logo.png`} alt="CAP Logo" className="app-logo" />
       <div>
         <h1>Cricket Association of Peoria</h1>
         <p>Manage your ground bookings with ease</p>
       </div>
       <div className="user-info">
         <div className="user-meta">
           <span className="user-name">{user.displayName || user.email}</span>
           <span className={`role-badge role-${userRole}`}>{userRole}</span>
         </div>
         <div className="user-actions">
           {userRole === "master" && (
             <button className="manage-roles-btn" onClick={openRoleManager}>Manage Roles</button>
           )}
           {userRole === "master" && (
             <button className="manage-roles-btn" onClick={() => setShowTeamManager(true)}>Manage Teams</button>
           )}
           <button className="logout-btn" onClick={handleLogout}>Logout</button>
         </div>
       </div>
     </header>

     {/* Scrolling news ticker */}
     <div className="news-ticker">
       <span className="news-ticker-label">📰 NEWS</span>
       <div className="news-ticker-track">
         <span>
           🏆 Powerplay Divas win the CAP Women's League 2026! &nbsp;•&nbsp;
           🏏 CAP T20 Fall Tournament starts Aug 29 — book your practice slots! &nbsp;•&nbsp;
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
           teamGroups={groupedTeams}
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
           extraTeams={["Youth Practice Under 18"]}
           teamGroups={groupedTeams}
         />
       )}
       </div>
     </div>
     )}
   </div>
 );
}
export default App;