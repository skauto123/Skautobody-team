import assert from "node:assert/strict";
import { test } from "node:test";
import {
  addDays,
  eachDay,
  isIsoDate,
  monthRange,
  periodLabel,
  shiftAnchor,
  startOfWeek,
  weekRange,
} from "../src/lib/dates.ts";

test("accepts real calendar dates only", () => {
  assert.equal(isIsoDate("2026-11-20"), true);
  assert.equal(isIsoDate("2026-02-28"), true);
  assert.equal(isIsoDate("2028-02-29"), true);
  assert.equal(isIsoDate("2026-02-29"), false);
  assert.equal(isIsoDate("2026-02-31"), false);
  assert.equal(isIsoDate("11/20/2026"), false);
  assert.equal(isIsoDate("2026-1-1"), false);
});

test("adds days across month and year boundaries", () => {
  assert.equal(addDays("2026-11-30", 1), "2026-12-01");
  assert.equal(addDays("2026-01-01", -1), "2025-12-31");
  assert.equal(addDays("2026-11-20", 0), "2026-11-20");
});

test("weeks start on Sunday", () => {
  assert.equal(startOfWeek("2026-11-20"), "2026-11-15");
  const week = weekRange("2026-11-20");
  assert.deepEqual(week, {
    from: "2026-11-15",
    to: "2026-11-21",
    days: [
      "2026-11-15",
      "2026-11-16",
      "2026-11-17",
      "2026-11-18",
      "2026-11-19",
      "2026-11-20",
      "2026-11-21",
    ],
  });
});

test("months cover every day and pad the grid to full weeks", () => {
  const month = monthRange("2026-11-20");
  assert.equal(month.from, "2026-11-01");
  assert.equal(month.to, "2026-11-30");
  assert.equal(month.days.length, 30);
  assert.equal(month.weeks[0][0], "2026-11-01");
  assert.equal(month.weeks.at(-1)?.at(-1), "2026-12-05");
  assert.equal(month.weeks.length, 5);
});

test("shifts the visible week or month", () => {
  assert.equal(shiftAnchor("2026-11-20", "week", 1), "2026-11-27");
  assert.equal(shiftAnchor("2026-11-20", "week", -1), "2026-11-13");
  assert.equal(shiftAnchor("2026-11-20", "month", 1), "2026-12-01");
  assert.equal(shiftAnchor("2026-11-20", "month", -1), "2026-10-01");
  assert.equal(shiftAnchor("2026-01-15", "month", -1), "2025-12-01");
});

test("labels a week or month for the header", () => {
  assert.equal(periodLabel("week", "2026-11-20"), "Nov 15 – 21, 2026");
  assert.equal(periodLabel("week", "2026-11-30"), "Nov 29 – Dec 5, 2026");
  assert.equal(periodLabel("month", "2026-11-20"), "November 2026");
});

test("lists each day in a short range", () => {
  assert.deepEqual(eachDay("2026-11-29", "2026-12-01"), [
    "2026-11-29",
    "2026-11-30",
    "2026-12-01",
  ]);
});
