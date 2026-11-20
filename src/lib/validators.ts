import { addDays, isIsoDate } from "./dates";
import { AppError } from "./errors";

export function normalizeUsername(value: string): string {
  return value.trim().toLowerCase();
}

export function assertUsername(username: string): void {
  if (!/^[a-z0-9][a-z0-9._-]{1,31}$/.test(username)) {
    throw new AppError(400, "Usernames are 2–32 characters: letters, numbers, dots, dashes, or underscores.");
  }
}

export function assertPin(pin: string): void {
  if (pin.length < 4 || pin.length > 64) {
    throw new AppError(400, "PIN must be 4 to 64 characters.");
  }
}

export function assertName(name: string): string {
  const trimmed = name.trim().replace(/\s+/g, " ");
  if (trimmed.length < 1 || trimmed.length > 40) {
    throw new AppError(400, "Name must be 1 to 40 characters.");
  }
  return trimmed;
}

export function assertTitle(title: string): string {
  const trimmed = title.trim().replace(/\s+/g, " ");
  if (trimmed.length < 1 || trimmed.length > 120) {
    throw new AppError(400, "Task title must be 1 to 120 characters.");
  }
  return trimmed;
}

export function assertIsoDate(value: string): string {
  if (!isIsoDate(value)) throw new AppError(400, "Use a real date.");
  return value;
}

export function assertRange(from: string, to: string): void {
  assertIsoDate(from);
  assertIsoDate(to);
  if (from > to) throw new AppError(400, "The start date is after the end date.");
  if (to > addDays(from, 41)) throw new AppError(400, "Choose a single week or month.");
}
