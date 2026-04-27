import React from "react";
import "./SlotCard.css"; // Ensure the CSS file is imported

function SlotCard({ slot, onBook, onCancel, onReserve, onUnreserve, user, userRole }) {
  // Format the date (parse as local to avoid timezone shift)
  const [y, m, d] = slot.date.split('-');
  const formattedDate = new Date(y, m - 1, d).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Ensure booked_by_teams contains only valid entries
  const bookedTeams = (slot.booked_by_teams || []).filter(
    (team) => team && team.uid && team.name && team.team
  );

  const isBookedByUser = user && user.uid && slot.booked_by_teams.some(
    (entry) => entry.uid === user.uid
  );

  return (
    <div className="slot-card">
      <p>📅 {formattedDate}</p>
      <p>🕐 {slot.time}</p>
      <p>🏟️ {slot.ground}</p>
      {slot.reserved ? (
        <div>
          <p style={{ color: "#dc3545", fontWeight: "bold" }}>Reserved for Game Day</p>
          {slot.reserved_by && <p>Reserved by: {slot.reserved_by}</p>}
          {userRole === "master" && (
            <button className="cancel-button" onClick={() => onUnreserve(slot.id)}>
              Unreserve
            </button>
          )}
        </div>
      ) : (
        <>
          {bookedTeams.length > 0 ? (
            <div>
              <p><strong>Booked By:</strong></p>
              <ul>
                {bookedTeams.map((team, index) => (
                  <li key={index}>
                    Team: {team.team}, Booked by: {team.name}
                    {user && (user.uid === team.uid || userRole === "master") && (
                      <button
                        className="cancel-button"
                        onClick={() => onCancel(slot.id, team.team)}
                      >
                        Cancel
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p>No teams have booked this slot yet.</p>
          )}
          {((!isBookedByUser && slot.booked_by_teams.length < 2) || (userRole === "master" && slot.booked_by_teams.length < 2)) && (
            <button onClick={() => onBook(slot)} className="book-button">
              Book Slot
            </button>
          )}
          {userRole === "master" && !slot.reserved && (
            <button
              className="reserve-button"
              onClick={() => onReserve(slot.id)}
            >
              Reserve for Game
            </button>
          )}
        </>
      )}
    </div>
  );
}

export default SlotCard;