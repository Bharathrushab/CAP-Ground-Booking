import { useState } from "react";
export default function TeamModal({ onClose, onConfirm, excludeTeams = [] }) {
 const [team, setTeam] = useState("");
 const allTeams = ["AYF", "Bradley Bulls", "Challengers", "CMCC", "Velocity Vixens", "Fearless XI", "Rising XI", "GodFather's XI", "Hurricanes", "MKCC", "Panthers", "PCC", "Peoria Gladiators", "Peoria Knights", "Peoria United", "Powerplay Divas", "RCP", "Red Devils", "Super Strikers", "SuperKings XI", "VSC"];
 const teams = allTeams.filter(t => !excludeTeams.includes(t));
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