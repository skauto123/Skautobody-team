import type { ViewMode } from "./types";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function isIsoDate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function todayIso(now = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function addDays(iso: string, days: number): string {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  const nextYear = date.getUTCFullYear();
  const nextMonth = String(date.getUTCMonth() + 1).padStart(2, "0");
  const nextDay = String(date.getUTCDate()).padStart(2, "0");
  return `${nextYear}-${nextMonth}-${nextDay}`;
}

export function eachDay(from: string, to: string): string[] {
  const days: string[] = [];
  for (let cursor = from; cursor <= to; cursor = addDays(cursor, 1)) {
    days.push(cursor);
    if (days.length > 42) break;
  }
  return days;
}

export function startOfWeek(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return addDays(iso, -weekday);
}

export function weekRange(iso: string): { from: string; to: string; days: string[] } {
  const from = startOfWeek(iso);
  const days = Array.from({ length: 7 }, (_, index) => addDays(from, index));
  return { from, to: days[6], days };
}

export function monthRange(iso: string): { from: string; to: string; days: string[]; weeks: string[][] } {
  const [year, month] = iso.split("-").map(Number);
  const from = `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const to = `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  const days = eachDay(from, to);
  const gridStart = startOfWeek(from);
  const gridEnd = addDays(startOfWeek(to), 6);
  const weeks: string[][] = [];
  for (let cursor = gridStart; cursor <= gridEnd; cursor = addDays(cursor, 7)) {
    weeks.push(Array.from({ length: 7 }, (_, index) => addDays(cursor, index)));
  }
  return { from, to, days, weeks };
}

export function shiftAnchor(iso: string, view: ViewMode, direction: -1 | 1): string {
  if (view === "week") return addDays(iso, direction * 7);
  const [year, month] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1 + direction, 1));
  const nextYear = date.getUTCFullYear();
  const nextMonth = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${nextYear}-${nextMonth}-01`;
}

function shortMonth(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("en-US", {
    month: "short",
    timeZone: "UTC",
  });
}

export function periodLabel(view: ViewMode, anchor: string): string {
  if (view === "month") {
    const [year, month] = anchor.split("-").map(Number);
    return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    });
  }
  const { from, to } = weekRange(anchor);
  const fromMonth = shortMonth(from);
  const toMonth = shortMonth(to);
  const fromDay = Number(from.slice(8));
  const toDay = Number(to.slice(8));
  const fromYear = from.slice(0, 4);
  const toYear = to.slice(0, 4);
  if (fromYear === toYear && fromMonth === toMonth) {
    return `${fromMonth} ${fromDay} \u2013 ${toDay}, ${fromYear}`;
  }
  if (fromYear === toYear) {
    return `${fromMonth} ${fromDay} \u2013 ${toMonth} ${toDay}, ${fromYear}`;
  }
  return `${fromMonth} ${fromDay}, ${fromYear} \u2013 ${toMonth} ${toDay}, ${toYear}`;
}

export function weekdayShort(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("en-US", {
    weekday: "short",
    timeZone: "UTC",
  });
}

export function weekdayLetter(iso: string): string {
  return weekdayShort(iso).slice(0, 1);
}

export function longDay(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}
