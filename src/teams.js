// Group labels are fixed; the teams inside them are editable by masters via Firestore `booking_teams`.
export const TEAM_GROUPS = [
  { label: "T20 Fall League 2026", hint: "Fall League only" },
  { label: "CAP Club Teams" },
  { label: "Women's Teams" },
  { label: "Other Teams" },
];

export const DEFAULT_TEAMS = [
  ...["Badgers", "Jaguars", "Monarchs", "Raiders", "Raptors", "Sharks", "Stallions", "Titans", "Vikings", "Wolves"]
    .map((name) => ({ name, group: "T20 Fall League 2026" })),
  ...["AYF", "Bradley Bulls", "CMCC", "Challengers", "Fearless XI", "GodFather's XI", "Hurricanes", "MKCC", "PCC",
    "Peoria Gladiators", "Peoria Knights", "Peoria United", "RCP", "Red Devils", "Rising XI", "Super Strikers",
    "SuperKings XI", "VSC"].map((name) => ({ name, group: "CAP Club Teams" })),
  ...["Panthers", "Powerplay Divas", "Queens", "Royals", "Velocity Vixens", "Warriors"]
    .map((name) => ({ name, group: "Women's Teams" })),
  ...["Amigos"].map((name) => ({ name, group: "Other Teams" })),
];

export const teamDocId = (name) =>
  name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export function groupTeams(teams) {
  return TEAM_GROUPS.map((group) => ({
    ...group,
    teams: teams
      .filter((team) => team.group === group.label)
      .map((team) => team.name)
      .sort((a, b) => a.localeCompare(b)),
  })).filter((group) => group.teams.length > 0);
}
