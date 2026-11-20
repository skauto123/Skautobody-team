import { randomBytes, randomUUID } from "node:crypto";
import type { Database } from "./db";
import { AppError } from "./errors";
import { hashPassword, verifyPassword } from "./password";
import { buildStatus } from "./status";
import type { Task, User } from "./types";
import {
  assertIsoDate,
  assertName,
  assertPin,
  assertRange,
  assertTitle,
  assertUsername,
  normalizeUsername,
} from "./validators";

export type Actor = Pick<User, "id" | "role">;

const SESSION_MS = 30 * 24 * 60 * 60 * 1000;

function text(row: Record<string, unknown>, key: string): string {
  const value = row[key];
  if (typeof value !== "string") throw new Error(`Expected text in ${key}.`);
  return value;
}

function mapUser(row: Record<string, unknown>): User {
  const role = text(row, "role");
  if (role !== "owner" && role !== "teammate") throw new Error("Unknown role.");
  return {
    id: text(row, "id"),
    username: text(row, "username"),
    displayName: text(row, "display_name"),
    role,
  };
}

function mapTask(row: Record<string, unknown>): Task {
  return {
    id: text(row, "id"),
    title: text(row, "title"),
    assigneeId: text(row, "assignee_id"),
    assigneeName: text(row, "assignee_name"),
    date: text(row, "task_date"),
    completed: Number(row.completed) === 1,
  };
}

function isUnique(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const record = error as { code?: unknown; message?: unknown };
  const code = String(record.code ?? "");
  if (code === "23505" || code === "SQLITE_CONSTRAINT_UNIQUE") return true;
  return String(record.message ?? "").includes("UNIQUE");
}

function uniqueDates(dates: string[]): string[] {
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const date of dates) {
    if (seen.has(date)) continue;
    seen.add(date);
    unique.push(date);
  }
  return unique;
}

export async function ensureOwner(
  db: Database,
  creds: { username: string; password: string; displayName: string },
): Promise<void> {
  await db.transaction(async (tx) => {
    const existing = await tx.get("SELECT id FROM users WHERE role = ?", ["owner"]);
    if (existing) return;
    const username = normalizeUsername(creds.username);
    if (!username || !creds.password) {
      throw new Error("Set OWNER_USERNAME and OWNER_PASSWORD before starting. See .env.example.");
    }
    try {
      assertUsername(username);
    } catch {
      throw new Error("OWNER_USERNAME must be 2–32 characters: letters, numbers, dots, dashes, or underscores.");
    }
    if (creds.password.length < 8 || creds.password.length > 128) {
      throw new Error("OWNER_PASSWORD must be 8 to 128 characters.");
    }
    const displayName = creds.displayName.trim().replace(/\s+/g, " ") || "Michael";
    if (displayName.length > 40) throw new Error("OWNER_DISPLAY_NAME must be 40 characters or fewer.");
    await tx.run(
      `INSERT INTO users (id, username, display_name, password_hash, role, created_at)
       VALUES (?, ?, ?, ?, 'owner', ?)`,
      [randomUUID(), username, displayName, hashPassword(creds.password), new Date().toISOString()],
    );
  });
}

export async function authenticate(db: Database, username: string, password: string): Promise<User | null> {
  const normalized = normalizeUsername(username);
  const row = await db.transaction(async (tx) => tx.get("SELECT * FROM users WHERE username = ?", [normalized]));
  if (!row) return null;
  if (!verifyPassword(password, text(row, "password_hash"))) return null;
  return mapUser(row);
}

export async function createSession(db: Database, userId: string): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_MS).toISOString();
  await db.transaction(async (tx) => {
    await tx.run("INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)", [token, userId, expiresAt]);
  });
  return token;
}

export async function deleteSession(db: Database, token: string): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.run("DELETE FROM sessions WHERE token = ?", [token]);
  });
}

export async function getUserBySession(db: Database, token: string): Promise<User | null> {
  if (!token) return null;
  return db.transaction(async (tx) => {
    const row = await tx.get(
      `SELECT u.id, u.username, u.display_name, u.role, s.expires_at
       FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.token = ?`,
      [token],
    );
    if (!row) return null;
    if (text(row, "expires_at") <= new Date().toISOString()) {
      await tx.run("DELETE FROM sessions WHERE token = ?", [token]);
      return null;
    }
    return mapUser(row);
  });
}

export async function listTeammates(db: Database, actor: Actor): Promise<User[]> {
  if (actor.role !== "owner") throw new AppError(403, "Only the owner can view the team.");
  const rows = await db.transaction(async (tx) =>
    tx.all(
      `SELECT id, username, display_name, role FROM users
       WHERE role = 'teammate'
       ORDER BY lower(display_name) ASC, username ASC`,
    ),
  );
  return rows.map(mapUser);
}

export async function createTeammate(
  db: Database,
  actor: Actor,
  input: { name: string; username: string; pin: string },
): Promise<User> {
  if (actor.role !== "owner") throw new AppError(403, "Only the owner can add teammates.");
  const displayName = assertName(input.name);
  const username = normalizeUsername(input.username);
  assertUsername(username);
  assertPin(input.pin);
  const passwordHash = hashPassword(input.pin);
  const id = randomUUID();
  try {
    await db.transaction(async (tx) => {
      await tx.run(
        `INSERT INTO users (id, username, display_name, password_hash, role, created_at)
         VALUES (?, ?, ?, ?, 'teammate', ?)`,
        [id, username, displayName, passwordHash, new Date().toISOString()],
      );
    });
  } catch (error) {
    if (isUnique(error)) throw new AppError(400, "That username is already in use.");
    throw error;
  }
  return { id, username, displayName, role: "teammate" };
}

export async function removeTeammate(db: Database, actor: Actor, id: string): Promise<void> {
  if (actor.role !== "owner") throw new AppError(403, "Only the owner can remove teammates.");
  await db.transaction(async (tx) => {
    const row = await tx.get("SELECT id, role FROM users WHERE id = ?", [id]);
    if (!row) throw new AppError(404, "Teammate not found.");
    if (text(row, "role") !== "teammate") throw new AppError(400, "The owner account stays.");
    await tx.run("DELETE FROM users WHERE id = ?", [id]);
  });
}

export async function listTasks(db: Database, actor: Actor, from: string, to: string): Promise<Task[]> {
  assertRange(from, to);
  const rows = await db.transaction(async (tx) =>
    tx.all(
      `SELECT t.id, t.title, t.assignee_id, u.display_name AS assignee_name, t.task_date, t.completed
       FROM tasks t JOIN users u ON u.id = t.assignee_id
       WHERE t.task_date >= ? AND t.task_date <= ?
         AND (? = 'owner' OR t.assignee_id = ?)
       ORDER BY t.task_date ASC, t.completed ASC, lower(t.title) ASC`,
      [from, to, actor.role, actor.id],
    ),
  );
  return rows.map(mapTask);
}

export async function createTasks(
  db: Database,
  actor: Actor,
  input: { title: string; assigneeId: string; dates: string[] },
): Promise<Task[]> {
  if (actor.role !== "owner") throw new AppError(403, "Only the owner can assign tasks.");
  const title = assertTitle(input.title);
  const dates = uniqueDates(input.dates);
  if (dates.length === 0) throw new AppError(400, "Select at least one day.");
  if (dates.length > 31) throw new AppError(400, "Select at most 31 days at a time.");
  for (const date of dates) assertIsoDate(date);

  return db.transaction(async (tx) => {
    const assignee = await tx.get("SELECT id, display_name, role FROM users WHERE id = ?", [input.assigneeId]);
    if (!assignee || text(assignee, "role") !== "teammate") throw new AppError(400, "Choose a teammate.");
    const now = new Date().toISOString();
    const created: Task[] = [];
    for (const date of dates) {
      const id = randomUUID();
      await tx.run(
        `INSERT INTO tasks (id, title, assignee_id, task_date, completed, created_at, updated_at)
         VALUES (?, ?, ?, ?, 0, ?, ?)`,
        [id, title, input.assigneeId, date, now, now],
      );
      created.push({
        id,
        title,
        assigneeId: input.assigneeId,
        assigneeName: text(assignee, "display_name"),
        date,
        completed: false,
      });
    }
    return created;
  });
}

export async function updateTask(
  db: Database,
  actor: Actor,
  id: string,
  input: { title: string; assigneeId: string; date: string },
): Promise<Task> {
  if (actor.role !== "owner") throw new AppError(403, "Only the owner can edit tasks.");
  const title = assertTitle(input.title);
  const date = assertIsoDate(input.date);
  return db.transaction(async (tx) => {
    const existing = await tx.get("SELECT * FROM tasks WHERE id = ?", [id]);
    if (!existing) throw new AppError(404, "Task not found.");
    const assignee = await tx.get("SELECT id, display_name, role FROM users WHERE id = ?", [input.assigneeId]);
    if (!assignee || text(assignee, "role") !== "teammate") throw new AppError(400, "Choose a teammate.");
    const assigneeChanged = text(existing, "assignee_id") !== input.assigneeId;
    const completed = assigneeChanged ? 0 : Number(existing.completed) === 1 ? 1 : 0;
    await tx.run(
      `UPDATE tasks SET title = ?, assignee_id = ?, task_date = ?, completed = ?, updated_at = ? WHERE id = ?`,
      [title, input.assigneeId, date, completed, new Date().toISOString(), id],
    );
    return {
      id,
      title,
      assigneeId: input.assigneeId,
      assigneeName: text(assignee, "display_name"),
      date,
      completed: completed === 1,
    };
  });
}

export async function deleteTask(db: Database, actor: Actor, id: string): Promise<void> {
  if (actor.role !== "owner") throw new AppError(403, "Only the owner can delete tasks.");
  await db.transaction(async (tx) => {
    const existing = await tx.get("SELECT id FROM tasks WHERE id = ?", [id]);
    if (!existing) throw new AppError(404, "Task not found.");
    await tx.run("DELETE FROM tasks WHERE id = ?", [id]);
  });
}

export async function setTaskCompleted(db: Database, actor: Actor, id: string, completed: boolean): Promise<Task> {
  if (typeof completed !== "boolean") throw new AppError(400, "Completed must be true or false.");
  return db.transaction(async (tx) => {
    const existing = await tx.get(
      `SELECT t.id, t.title, t.assignee_id, u.display_name AS assignee_name, t.task_date, t.completed
       FROM tasks t JOIN users u ON u.id = t.assignee_id
       WHERE t.id = ?`,
      [id],
    );
    if (!existing || text(existing, "assignee_id") !== actor.id) {
      throw new AppError(actor.role === "owner" ? 403 : 404, actor.role === "owner"
        ? "Teammates mark their own tasks done."
        : "Task not found.");
    }
    const flag = completed ? 1 : 0;
    await tx.run("UPDATE tasks SET completed = ?, updated_at = ? WHERE id = ?", [
      flag,
      new Date().toISOString(),
      id,
    ]);
    return { ...mapTask(existing), completed };
  });
}

export async function getStatus(db: Database, actor: Actor, from: string, to: string) {
  if (actor.role !== "owner") throw new AppError(403, "Only the owner can view status.");
  assertRange(from, to);
  return db.transaction(async (tx) => {
    const mates = await tx.all(
      `SELECT id, display_name FROM users WHERE role = 'teammate' ORDER BY lower(display_name) ASC`,
    );
    const taskRows = await tx.all(
      `SELECT assignee_id, task_date, completed FROM tasks WHERE task_date >= ? AND task_date <= ?`,
      [from, to],
    );
    return buildStatus(
      from,
      to,
      mates.map((mate) => ({ id: text(mate, "id"), name: text(mate, "display_name") })),
      taskRows.map((row) => ({
        assigneeId: text(row, "assignee_id"),
        date: text(row, "task_date"),
        completed: Number(row.completed) === 1,
      })),
    );
  });
}
