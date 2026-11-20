import assert from "node:assert/strict";
import { test } from "node:test";
import { buildStatus } from "../src/lib/status.ts";

test("counts completed tasks per teammate, per day, and for the team", () => {
  const report = buildStatus(
    "2026-11-16",
    "2026-11-17",
    [
      { id: "sam", name: "Sam" },
      { id: "zoe", name: "Zoe" },
      { id: "alex", name: "Alex" },
    ],
    [
      { assigneeId: "alex", date: "2026-11-16", completed: true },
      { assigneeId: "alex", date: "2026-11-16", completed: false },
      { assigneeId: "alex", date: "2026-11-17", completed: false },
      { assigneeId: "sam", date: "2026-11-16", completed: true },
      { assigneeId: "alex", date: "2026-11-18", completed: true },
    ],
  );

  assert.deepEqual(report.days, ["2026-11-16", "2026-11-17"]);
  assert.deepEqual(
    report.teammates.map((mate) => mate.name),
    ["Alex", "Sam", "Zoe"],
  );

  const alex = report.teammates[0];
  assert.deepEqual(alex.byDay["2026-11-16"], { completed: 1, total: 2 });
  assert.deepEqual(alex.byDay["2026-11-17"], { completed: 0, total: 1 });
  assert.equal(alex.completed, 1);
  assert.equal(alex.total, 3);

  const sam = report.teammates[1];
  assert.deepEqual(sam.byDay["2026-11-16"], { completed: 1, total: 1 });
  assert.deepEqual(sam.byDay["2026-11-17"], { completed: 0, total: 0 });
  assert.equal(sam.completed, 1);
  assert.equal(sam.total, 1);

  const zoe = report.teammates[2];
  assert.equal(zoe.completed, 0);
  assert.equal(zoe.total, 0);

  assert.deepEqual(report.team.byDay["2026-11-16"], { completed: 2, total: 3 });
  assert.deepEqual(report.team.byDay["2026-11-17"], { completed: 0, total: 1 });
  assert.equal(report.team.completed, 2);
  assert.equal(report.team.total, 4);
});
