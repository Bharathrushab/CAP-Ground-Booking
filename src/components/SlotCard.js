import "./SlotCard.css";
import { ClockIcon, AlertIcon } from "./Icons";

const MAX_TEAMS = 2;

function SlotCard({ slot, onBook, onCancel, onReserve, onUnreserve, user, userRole }) {
  // Ensure booked_by_teams contains only valid entries
  const bookedTeams = (slot.booked_by_teams || []).filter(
    (team) => team && team.uid && team.name && team.team
  );

  const isBookedByUser = user && user.uid && slot.booked_by_teams.some(
    (entry) => entry.uid === user.uid
  );

  const isMaster = userRole === "master";
  const canBook = (!isBookedByUser || isMaster) && slot.booked_by_teams.length < MAX_TEAMS;
  const openCount = MAX_TEAMS - bookedTeams.length;
  // Notes are stored with a leading emoji and "Note:" prefix
  const note = slot.note ? slot.note.replace(/^\W+/, "").replace(/^Note:\s*/i, "") : "";

  return (
    <article className={`slot-card${slot.reserved ? " is-reserved" : ""}`}>
      <div className="slot-main">
        <h3 className="slot-ground">{slot.ground}</h3>
        <p className="slot-meta"><ClockIcon /> {slot.time}</p>
        {note && <p className="slot-note"><AlertIcon /> {note}</p>}
        {!slot.reserved && bookedTeams.length > 0 && (
          <ul className="slot-teams">
            {bookedTeams.map((team, index) => (
              <li key={index}>
                <span className="slot-team-name">{team.team}</span>
                <span className="slot-sub">{team.name}</span>
                {user && (user.uid === team.uid || isMaster) && (
                  <button className="btn-text-danger" onClick={() => onCancel(slot.id, team.team)}>Cancel</button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="slot-status">
        {slot.reserved ? (
          <>
            <span className="flag flag-red">Reserved</span>
            <span className="slot-sub">Game day{slot.reserved_by ? `, by ${slot.reserved_by}` : ""}</span>
          </>
        ) : (
          <>
            <span className="capacity" role="img" aria-label={`${bookedTeams.length} of ${MAX_TEAMS} teams booked`}>
              {Array.from({ length: MAX_TEAMS }, (_, i) => (
                <span key={i} className={i < bookedTeams.length ? "filled" : ""} />
              ))}
            </span>
            <span className="slot-sub">{openCount === 0 ? "Full" : `${openCount} spot${openCount > 1 ? "s" : ""} open`}</span>
          </>
        )}
      </div>

      <div className="slot-actions">
        {slot.reserved ? (
          isMaster && (
            <button className="btn btn-outline" onClick={() => onUnreserve(slot.id)}>Unreserve</button>
          )
        ) : (
          <>
            {canBook && (
              <button className="btn btn-primary" onClick={() => onBook(slot)}>Book slot</button>
            )}
            {isMaster && (
              <button className="btn btn-outline" onClick={() => onReserve(slot.id)}>Reserve for game</button>
            )}
          </>
        )}
      </div>
    </article>
  );
}

export default SlotCard;