import { useState, useMemo, useRef, useEffect } from "react";

const TEAM_GROUPS = [
  {
    label: "T20 Fall League 2026",
    hint: "Fall League only",
    teams: [
      "Badgers", "Jaguars", "Monarchs", "Raiders", "Raptors",
      "Sharks", "Stallions", "Titans", "Vikings", "Wolves",
    ],
  },
  {
    label: "CAP Club Teams",
    teams: [
      "AYF", "Bradley Bulls", "CMCC", "Challengers", "Fearless XI",
      "GodFather's XI", "Hurricanes", "MKCC", "PCC", "Peoria Gladiators",
      "Peoria Knights", "Peoria United", "RCP", "Red Devils", "Rising XI",
      "Super Strikers", "SuperKings XI", "VSC",
    ],
  },
  {
    label: "Women's Teams",
    teams: ["Panthers", "Powerplay Divas", "Velocity Vixens"],
  },
  {
    label: "Other Teams",
    teams: ["Amigos"],
  },
];

export default function TeamModal({ onClose, onConfirm, excludeTeams = [], extraTeams = [] }) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const activeRef = useRef(null);

  const excludeKey = excludeTeams.join("|");
  const extraKey = extraTeams.join("|");

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const excluded = excludeKey ? excludeKey.split("|") : [];
    const extras = extraKey ? extraKey.split("|") : [];
    const allGroups = extras.length
      ? [...TEAM_GROUPS, { label: "Other", teams: extras }]
      : TEAM_GROUPS;
    return allGroups.map((g) => ({
      label: g.label,
      hint: g.hint,
      teams: g.teams.filter(
        (t) => !excluded.includes(t) && t.toLowerCase().includes(q)
      ),
    })).filter((g) => g.teams.length > 0);
  }, [query, excludeKey, extraKey]);

  const flatTeams = useMemo(() => groups.flatMap((g) => g.teams), [groups]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    if (activeRef.current) {
      activeRef.current.scrollIntoView({ block: "nearest" });
    }
  }, [activeIndex, groups]);

  const handleKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, flatTeams.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (selected) onConfirm(selected);
      else if (flatTeams[activeIndex]) setSelected(flatTeams[activeIndex]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <div className="team-modal-overlay" onClick={onClose}>
      <div className="team-modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="team-modal-title">Select Team</h3>
        <input
          className="team-search"
          type="text"
          autoFocus
          placeholder="Search teams…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <div className="team-list">
          {flatTeams.length === 0 ? (
            <p className="team-empty">No teams match “{query}”.</p>
          ) : (
            groups.map((g) => (
              <div key={g.label} className="team-group">
                <div className="team-group-label">
                  {g.label}
                  {g.hint && <span className="team-group-hint">{g.hint}</span>}
                </div>
                {g.teams.map((t) => {
                  const idx = flatTeams.indexOf(t);
                  return (
                    <button
                      key={t}
                      type="button"
                      ref={idx === activeIndex ? activeRef : null}
                      className={
                        "team-option" +
                        (t === selected ? " selected" : "") +
                        (idx === activeIndex ? " active" : "")
                      }
                      onClick={() => setSelected(t)}
                      onDoubleClick={() => onConfirm(t)}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
        <div className="team-modal-footer">
          <span className="team-selected-label">
            {selected ? `Selected: ${selected}` : "No team selected"}
          </span>
          <div className="team-modal-actions">
            <button
              className="team-confirm"
              disabled={!selected}
              onClick={() => onConfirm(selected)}
            >
              Confirm
            </button>
            <button className="team-cancel" onClick={onClose}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}