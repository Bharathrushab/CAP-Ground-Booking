import { useState } from "react";
export default function TeamModal({ onClose, onConfirm }) {
 const [team, setTeam] = useState("");
 const teams = ["AYF", "Bradley Bulls", "Challengers", "CMCC", "Fearless XI", "Gladiators", "GodFather's XI", "Hurricanes", "MKCC", "PCC", "Peoria Knights", "Peoria United", "RCP", "Red Devils", "Super Strikers", "SuperKings XI"];
 return (
<div className="modal">
<h3>Select Team</h3>
<select onChange={(e) => setTeam(e.target.value)}>
<option value="">Select Team</option>
       {teams.map((t) => (
<option key={t} value={t}>{t}</option>
       ))}
</select>
<div>
<button onClick={() => onConfirm(team)}>Confirm</button>
<button onClick={onClose}>Cancel</button>
</div>
</div>
 );
}