const toLocalDate = (date) => {
  const [y, m, d] = date.split("-");
  return new Date(y, m - 1, d);
};

export const isTodayDate = (date) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return toLocalDate(date).getTime() === today.getTime();
};

export default function DateBlock({ date, isWeekend = false }) {
  const day = toLocalDate(date);
  return (
    <div className="date-block">
      <span className="date-block-weekday">{day.toLocaleDateString("en-US", { weekday: "short" })}</span>
      <span className="date-block-day">{day.getDate()}</span>
      <span className="date-block-month">{day.toLocaleDateString("en-US", { month: "short" })}</span>
      {isTodayDate(date) && <span className="date-block-flag">Today</span>}
      {isWeekend && <span className="date-block-flag weekend">Weekend</span>}
    </div>
  );
}
