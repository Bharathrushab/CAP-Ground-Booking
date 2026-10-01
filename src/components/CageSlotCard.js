import "./SlotCard.css";

function CageSlotCard({ slot, onBook, onCancel, user, userRole }) {
  const isBooked = slot.booked_by && slot.booked_by.uid;
  const isBookedByUser = user && isBooked && slot.booked_by.uid === user.uid;
  const isMaster = userRole === "master";

  return (
    <div className={`cage-card${isBooked ? " is-booked" : ""}${isBookedByUser ? " is-mine" : ""}`}>
      <div className="cage-name">{slot.cage}</div>
      {isBooked ? (
        <>
          <p className="cage-booked-info">{slot.booked_by.team}</p>
          <p className="cage-booked-by">by {slot.booked_by.name}</p>
          {(isBookedByUser || isMaster) && (
            <button className="btn-text-danger" onClick={() => onCancel(slot.id)}>Cancel</button>
          )}
        </>
      ) : (
        <button onClick={() => onBook(slot)} className="btn btn-outline btn-block">Book</button>
      )}
    </div>
  );
}

export default CageSlotCard;
