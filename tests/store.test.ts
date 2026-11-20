import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { openDatabase } from "../src/lib/db.ts";
import { AppError } from "../src/lib/errors.ts";
import {
  authenticate,
  createSession,
  createTasks,
  createTeammate,
  deleteTask,
  ensureOwner,
  getStatus,
  getUserBySession,
  listTasks,
  removeTeammate,
  setTaskCompleted,
  updateTask,
  type Actor,
} from "../src/lib/store.ts";
import type { Database } from "../src/lib/db.ts";

async function setup() {
  const dir = await mkdtemp(path.join(tmpdir(), "sk-calendar-"));
  const db = await openDatabase({ sqlitePath: path.join(dir, "test.db") });
  await ensureOwner(db, {
    username: "Michael",
    password: "owner-pass-123",
    displayName: "Michael",
  });
  const owner = await authenticate(db, "michael", "owner-pass-123");
  assert.ok(owner);
  return {
    dir,
    db,
    owner,
    async cleanup() {
      await rm(dir, { recursive: true, force: true });
    },
  };
}

async function addCrew(db: Database, owner: Actor) {
  const alex = await createTeammate(db, owner, {
    name: "Alex Rivera",
    username: "alex",
    pin: "2468",
  });
  const sam = await createTeammate(db, owner, {
    name: "Sam Ortiz",
    username: "sam",
    pin: "1357",
  });
  return { alex, sam };
}

test("owner credentials are created once and sign-in is case-insensitive", async (t) => {
  const ctx = await setup();
  t.after(() => ctx.cleanup());

  await ensureOwner(ctx.db, {
    username: "someone-else",
    password: "a-different-password",
    displayName: "Someone",
  });

  const stillMichael = await authenticate(ctx.db, "MiChAeL", "owner-pass-123");
  assert.equal(stillMichael?.displayName, "Michael");
  assert.equal(stillMichael?.role, "owner");
  assert.equal(await authenticate(ctx.db, "michael", "wrong-password"), null);
  assert.equal(await authenticate(ctx.db, "someone-else", "a-different-password"), null);
});

test("owner assigns tasks on several days and a teammate sees only their own", async (t) => {
  const ctx = await setup();
  t.after(() => ctx.cleanup());
  const { alex, sam } = await addCrew(ctx.db, ctx.owner);

  const created = await createTasks(ctx.db, ctx.owner, {
    title: "  Sand the bumper  ",
    assigneeId: alex.id,
    dates: ["2026-11-16", "2026-11-18", "2026-11-16"],
  });
  assert.equal(created.length, 2);
  assert.equal(created[0].title, "Sand the bumper");
  assert.deepEqual(
    created.map((task) => task.date),
    ["2026-11-16", "2026-11-18"],
  );

  await createTasks(ctx.db, ctx.owner, {
    title: "Prime the driver door",
    assigneeId: sam.id,
    dates: ["2026-11-16"],
  });

  const alexTasks = await listTasks(ctx.db, alex, "2026-11-15", "2026-11-21");
  assert.deepEqual(
    alexTasks.map((task) => task.title),
    ["Sand the bumper", "Sand the bumper"],
  );

  const samTasks = await listTasks(ctx.db, sam, "2026-11-15", "2026-11-21");
  assert.deepEqual(
    samTasks.map((task) => task.title),
    ["Prime the driver door"],
  );

  const all = await listTasks(ctx.db, ctx.owner, "2026-11-15", "2026-11-21");
  assert.equal(all.length, 3);
});

test("a teammate check-off shows up in the owner status for that week", async (t) => {
  const ctx = await setup();
  t.after(() => ctx.cleanup());
  const { alex, sam } = await addCrew(ctx.db, ctx.owner);

  const alexTasks = await createTasks(ctx.db, ctx.owner, {
    title: "Sand the bumper",
    assigneeId: alex.id,
    dates: ["2026-11-16", "2026-11-17"],
  });
  await createTasks(ctx.db, ctx.owner, {
    title: "Prime the driver door",
    assigneeId: sam.id,
    dates: ["2026-11-16"],
  });

  const done = await setTaskCompleted(ctx.db, alex, alexTasks[0].id, true);
  assert.equal(done.completed, true);

  const undone = await setTaskCompleted(ctx.db, alex, alexTasks[0].id, false);
  assert.equal(undone.completed, false);
  await setTaskCompleted(ctx.db, alex, alexTasks[0].id, true);

  const status = await getStatus(ctx.db, ctx.owner, "2026-11-15", "2026-11-21");
  const alexRow = status.teammates.find((mate) => mate.id === alex.id);
  const samRow = status.teammates.find((mate) => mate.id === sam.id);
  assert.ok(alexRow && samRow);
  assert.deepEqual(alexRow.byDay["2026-11-16"], { completed: 1, total: 1 });
  assert.deepEqual(alexRow.byDay["2026-11-17"], { completed: 0, total: 1 });
  assert.equal(alexRow.completed, 1);
  assert.equal(alexRow.total, 2);
  assert.equal(samRow.completed, 0);
  assert.equal(samRow.total, 1);
  assert.deepEqual(status.team.byDay["2026-11-16"], { completed: 1, total: 2 });
  assert.equal(status.team.completed, 1);
  assert.equal(status.team.total, 3);

  await assert.rejects(() => getStatus(ctx.db, alex, "2026-11-15", "2026-11-21"), (error: unknown) => {
    assert.ok(error instanceof AppError);
    assert.equal(error.status, 403);
    return true;
  });
});

test("only the assigned teammate can mark a task, and the owner can edit or delete it", async (t) => {
  const ctx = await setup();
  t.after(() => ctx.cleanup());
  const { alex, sam } = await addCrew(ctx.db, ctx.owner);
  const [task] = await createTasks(ctx.db, ctx.owner, {
    title: "Mask headlights",
    assigneeId: alex.id,
    dates: ["2026-11-18"],
  });

  await assert.rejects(() => setTaskCompleted(ctx.db, sam, task.id, true), (error: unknown) => {
    assert.ok(error instanceof AppError);
    assert.equal(error.status, 404);
    return true;
  });
  await assert.rejects(() => setTaskCompleted(ctx.db, ctx.owner, task.id, true), (error: unknown) => {
    assert.ok(error instanceof AppError);
    assert.equal(error.status, 403);
    return true;
  });
  await assert.rejects(() => createTasks(ctx.db, alex, {
    title: "Nope",
    assigneeId: sam.id,
    dates: ["2026-11-18"],
  }), (error: unknown) => {
    assert.ok(error instanceof AppError);
    assert.equal(error.status, 403);
    return true;
  });

  const edited = await updateTask(ctx.db, ctx.owner, task.id, {
    title: "Mask the headlights",
    assigneeId: sam.id,
    date: "2026-11-19",
  });
  assert.equal(edited.assigneeName, "Sam Ortiz");
  assert.equal(edited.date, "2026-11-19");
  assert.equal(edited.completed, false);

  await setTaskCompleted(ctx.db, sam, task.id, true);
  const renamed = await updateTask(ctx.db, ctx.owner, task.id, {
    title: "Mask both headlights",
    assigneeId: sam.id,
    date: "2026-11-19",
  });
  assert.equal(renamed.completed, true);

  await deleteTask(ctx.db, ctx.owner, task.id);
  const remaining = await listTasks(ctx.db, ctx.owner, "2026-11-15", "2026-11-21");
  assert.equal(remaining.length, 0);
});

test("removing a teammate removes their login and their tasks", async (t) => {
  const ctx = await setup();
  t.after(() => ctx.cleanup());
  const { alex } = await addCrew(ctx.db, ctx.owner);
  await createTasks(ctx.db, ctx.owner, {
    title: "Sand the bumper",
    assigneeId: alex.id,
    dates: ["2026-11-16"],
  });

  await removeTeammate(ctx.db, ctx.owner, alex.id);
  assert.equal(await authenticate(ctx.db, "alex", "2468"), null);
  const tasks = await listTasks(ctx.db, ctx.owner, "2026-11-15", "2026-11-21");
  assert.equal(tasks.length, 0);

  await assert.rejects(() => removeTeammate(ctx.db, ctx.owner, ctx.owner.id), (error: unknown) => {
    assert.ok(error instanceof AppError);
    assert.equal(error.status, 400);
    return true;
  });
});

test("duplicate usernames and short PINs are rejected", async (t) => {
  const ctx = await setup();
  t.after(() => ctx.cleanup());
  await createTeammate(ctx.db, ctx.owner, { name: "Alex", username: "alex", pin: "2468" });

  await assert.rejects(
    () => createTeammate(ctx.db, ctx.owner, { name: "Alex 2", username: "Alex", pin: "9999" }),
    (error: unknown) => {
      assert.ok(error instanceof AppError);
      assert.equal(error.status, 400);
      return true;
    },
  );
  await assert.rejects(
    () => createTeammate(ctx.db, ctx.owner, { name: "Pat", username: "pat", pin: "12" }),
    (error: unknown) => {
      assert.ok(error instanceof AppError);
      assert.equal(error.status, 400);
      return true;
    },
  );
});

test("sessions expire and then stop working", async (t) => {
  const ctx = await setup();
  t.after(() => ctx.cleanup());
  const token = await createSession(ctx.db, ctx.owner.id);
  const user = await getUserBySession(ctx.db, token);
  assert.equal(user?.id, ctx.owner.id);

  await ctx.db.transaction(async (tx) => {
    await tx.run("UPDATE sessions SET expires_at = ? WHERE token = ?", ["2000-01-01T00:00:00.000Z", token]);
  });
  assert.equal(await getUserBySession(ctx.db, token), null);
});
