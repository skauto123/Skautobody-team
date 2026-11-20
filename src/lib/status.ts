import { eachDay } from "./dates";
import type { DayCount, PersonStatus, StatusReport } from "./types";

type StatusTeammate = { id: string; name: string };
type StatusTask = { assigneeId: string; date: string; completed: boolean };

function emptyCounts(days: string[]): Map<string, DayCount> {
  return new Map(days.map((day) => [day, { completed: 0, total: 0 }]));
}

export function buildStatus(
  from: string,
  to: string,
  teammates: StatusTeammate[],
  tasks: StatusTask[],
): StatusReport {
  const days = eachDay(from, to);
  const daySet = new Set(days);
  const byPerson = new Map<string, Map<string, DayCount>>();
  for (const mate of teammates) byPerson.set(mate.id, emptyCounts(days));

  for (const task of tasks) {
    if (!daySet.has(task.date)) continue;
    const counts = byPerson.get(task.assigneeId);
    if (!counts) continue;
    const cell = counts.get(task.date);
    if (!cell) continue;
    cell.total += 1;
    if (task.completed) cell.completed += 1;
  }

  const teamByDay: Record<string, DayCount> = {};
  for (const day of days) teamByDay[day] = { completed: 0, total: 0 };

  const rows: PersonStatus[] = teammates
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name, "en"))
    .map((mate) => {
      const counts = byPerson.get(mate.id) ?? emptyCounts(days);
      const byDay: Record<string, DayCount> = {};
      let completed = 0;
      let total = 0;
      for (const day of days) {
        const cell = counts.get(day) ?? { completed: 0, total: 0 };
        byDay[day] = cell;
        completed += cell.completed;
        total += cell.total;
        teamByDay[day].completed += cell.completed;
        teamByDay[day].total += cell.total;
      }
      return { id: mate.id, name: mate.name, byDay, completed, total };
    });

  let teamCompleted = 0;
  let teamTotal = 0;
  for (const day of days) {
    teamCompleted += teamByDay[day].completed;
    teamTotal += teamByDay[day].total;
  }

  return {
    from,
    to,
    days,
    teammates: rows,
    team: { byDay: teamByDay, completed: teamCompleted, total: teamTotal },
  };
}
