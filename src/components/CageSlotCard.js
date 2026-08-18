import React from "react";
import "./SlotCard.css";

function CageSlotCard({ slot, onBook, onCancel, user, userRole }) {
  const isBooked = slot.booked_by && slot.booked_by.uid;
  const isBookedByUser = user && isBooked && slot.booked_by.uid === user.uid;
  const isMaster = userRole === "master";

  return (
    <div className="cage-card">
      <div className="cage-name">{slot.cage}</div>
      {isBooked ? (
        <div>
          <p className="cage-booked-info">{slot.booked_by.team}</p>
          <p className="cage-booked-by">by {slot.booked_by.name}</p>
          {(isBookedByUser || isMaster) && (
            <button className="cancel-button" onClick={() => onCancel(slot.id)}>
              Cancel
            </button>
          )}
        </div>
      ) : (
        <div>
          <p className="cage-available">Available</p>
          <button onClick={() => onBook(slot)} className="book-button">
            Book
          </button>
        </div>
      )}
    </div>
  );
}

export default CageSlotCard;
