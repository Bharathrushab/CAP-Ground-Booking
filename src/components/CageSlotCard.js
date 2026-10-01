import "./SlotCard.css";

function CageSlotCard({ slot, onBook, onCancel, user, userRole }) {
  const isBooked = slot.booked_by && slot.booked_by.uid;
  const isBookedByUser = user && isBooked && slot.booked_by.uid === user.uid;
  const isMaster = userRole === "master";

  return (
    <div className={`cage-row${isBooked ? " is-booked" : ""}${isBookedByUser ? " is-mine" : ""}`}>
      <span className="cage-name">{slot.cage}</span>
      {isBooked ? (
        <span className="cage-who">
          <span className="cage-team">{slot.booked_by.team}</span>
          <span className="slot-sub">{slot.booked_by.name}</span>
        </span>
      ) : (
        <span className="cage-open">Open</span>
      )}
      <span className="cage-action">
        {isBooked ? (
          (isBookedByUser || isMaster) && (
            <button className="btn-text-danger" onClick={() => onCancel(slot.id)}>Cancel</button>
          )
        ) : (
          <button onClick={() => onBook(slot)} className="btn btn-outline btn-small">Book</button>
        )}
      </span>
    </div>
  );
}

export default CageSlotCard;
