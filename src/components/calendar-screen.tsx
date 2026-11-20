"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { longDay, weekdayShort } from "@/lib/dates";
import type { Task, User, ViewMode } from "@/lib/types";
import { api } from "./api";
import { TaskDialog } from "./task-dialog";
import { usePeriod } from "./use-period";
import { ViewBar } from "./view-bar";

const COLORS = ["#c4491d", "#1d4e89", "#1e4d3a", "#7c3a63", "#a16207", "#0f766e", "#3730a3", "#9f1239"];

function colorFor(id: string, teammates: User[]): string {
  const index = teammates.findIndex((mate) => mate.id === id);
  return COLORS[(index < 0 ? 0 : index) % COLORS.length];
}

function compareTasks(a: Task, b: Task): number {
  if (a.completed !== b.completed) return a.completed ? 1 : -1;
  return a.title.localeCompare(b.title, "en");
}

export function CalendarScreen({
  user,
  initialView,
  initialDate,
}: {
  user: User;
  initialView: ViewMode;
  initialDate: string;
}) {
  const period = usePeriod(initialView, initialDate, "/");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [teammates, setTeammates] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeDay, setActiveDay] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [dialog, setDialog] = useState<
    null | { mode: "create"; dates: string[] } | { mode: "edit"; task: Task }
  >(null);
  const from = period.range?.from ?? "";
  const to = period.range?.to ?? "";
  const owner = user.role === "owner";

  useEffect(() => {
    if (!owner) return;
    let cancelled = false;
    api<User[]>("/api/teammates")
      .then((rows) => {
        if (!cancelled) setTeammates(rows);
      })
      .catch((caught: Error) => {
        if (!cancelled) setError(caught.message);
      });
    return () => {
      cancelled = true;
    };
  }, [owner]);

  useEffect(() => {
    if (!from || !to) return;
    let cancelled = false;
    setLoading(true);
    api<Task[]>(`/api/tasks?from=${from}&to=${to}`)
      .then((rows) => {
        if (cancelled) return;
        setTasks(rows);
        setError("");
      })
      .catch((caught: Error) => {
        if (!cancelled) setError(caught.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [from, to]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      if (dialog) setDialog(null);
      else setActiveDay(null);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [dialog]);

  function tasksOn(day: string): Task[] {
    return tasks.filter((task) => task.date === day).sort(compareTasks);
  }

  function keepVisible(next: Task[]) {
    setTasks(next.filter((task) => task.date >= from && task.date <= to).sort((a, b) => a.date.localeCompare(b.date) || compareTasks(a, b)));
  }

  async function toggle(task: Task) {
    const next = !task.completed;
    setPendingId(task.id);
    setError("");
    try {
      const saved = await api<Task>(`/api/tasks/${task.id}`, {
        method: "PATCH",
        body: JSON.stringify({ completed: next }),
      });
      setTasks((current) => current.map((item) => (item.id === saved.id ? saved : item)));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not update the task.");
    } finally {
      setPendingId(null);
    }
  }

  const pickDays = period.range?.days ?? [];

  return (
    <div className="screen">
      <ViewBar
        label={period.label}
        view={period.view}
        onView={period.setView}
        onPrev={period.prev}
        onNext={period.next}
        onToday={period.goToday}
      />
      {error ? (
        <p className="alert" role="alert">
          {error}
        </p>
      ) : null}
      {owner && teammates.length === 0 && !loading ? (
        <p className="hint">
          Add your crew on the <Link href="/team">Team</Link> tab before assigning work.
        </p>
      ) : null}
      {loading && tasks.length === 0 ? <p className="hint">Loading the calendar…</p> : null}
      {period.range && period.view === "week" ? (
        <div className="week">
          {period.range.days.map((day) => (
            <section key={day} className={day === period.today ? "day today" : "day"}>
              <header className="day-head">
                <div>
                  <span className="dow">{weekdayShort(day)}</span>
                  <strong className="num">{Number(day.slice(8))}</strong>
                </div>
                {owner ? (
                  <button type="button" className="btn" onClick={() => setDialog({ mode: "create", dates: [day] })}>
                    Add
                  </button>
                ) : null}
              </header>
              <div className="task-list">
                {tasksOn(day).length === 0 ? <p className="empty-day">Nothing scheduled</p> : null}
                {tasksOn(day).map((task) =>
                  owner ? (
                    <button
                      key={task.id}
                      type="button"
                      className={task.completed ? "task done" : "task"}
                      style={{ borderLeftColor: colorFor(task.assigneeId, teammates) }}
                      onClick={() => setDialog({ mode: "edit", task })}
                    >
                      <span className="task-copy">
                        <span className="task-title">{task.title}</span>
                        <span className="who">{task.assigneeName}</span>
                      </span>
                      {task.completed ? <span className="flag">Done</span> : null}
                    </button>
                  ) : (
                    <button
                      key={task.id}
                      type="button"
                      className={task.completed ? "task done" : "task"}
                      aria-pressed={task.completed}
                      disabled={pendingId === task.id}
                      onClick={() => toggle(task)}
                    >
                      <span className="box" aria-hidden="true">
                        {task.completed ? "✓" : ""}
                      </span>
                      <span className="task-title">{task.title}</span>
                    </button>
                  ),
                )}
              </div>
            </section>
          ))}
        </div>
      ) : null}
      {period.range && period.view === "month" && period.range.weeks ? (
        <div className="month">
          <div className="dow-row">
            {period.range.weeks[0].map((day) => (
              <span key={day}>{weekdayShort(day)}</span>
            ))}
          </div>
          {period.range.weeks.map((week) => (
            <div key={week[0]} className="month-row">
              {week.map((day) => {
                const inside = day >= period.range!.from && day <= period.range!.to;
                const dayTasks = inside ? tasksOn(day) : [];
                return (
                  <button
                    key={day}
                    type="button"
                    className={[
                      "cell",
                      inside ? "" : "outside",
                      day === period.today ? "today" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onClick={() => {
                      if (!inside) {
                        period.jump(day);
                        return;
                      }
                      setActiveDay(day);
                    }}
                    aria-label={
                      inside
                        ? `${weekdayShort(day)} ${Number(day.slice(8))}, ${dayTasks.length} tasks`
                        : `${weekdayShort(day)} ${Number(day.slice(8))}`
                    }
                  >
                    <span className="cell-num">{Number(day.slice(8))}</span>
                    {inside ? (
                      <>
                        <span className="dots" aria-hidden="true">
                          {dayTasks.slice(0, 4).map((task) => (
                            <i
                              key={task.id}
                              className={task.completed ? "dot done" : "dot"}
                              style={{ background: colorFor(task.assigneeId, teammates) }}
                            />
                          ))}
                        </span>
                        <span className="cell-tasks">
                          {dayTasks.slice(0, 3).map((task) => (
                            <span
                              key={task.id}
                              className={task.completed ? "pill done" : "pill"}
                              style={{ borderLeftColor: colorFor(task.assigneeId, teammates) }}
                            >
                              {task.title}
                            </span>
                          ))}
                          {dayTasks.length > 3 ? <span className="more">+{dayTasks.length - 3}</span> : null}
                        </span>
                      </>
                    ) : null}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      ) : null}
      {activeDay ? (
        <div className="backdrop" onMouseDown={() => setActiveDay(null)}>
          <section
            className="sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="day-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="dialog-head">
              <h2 id="day-title">{longDay(activeDay)}</h2>
              <button type="button" className="icon-btn" onClick={() => setActiveDay(null)} aria-label="Close">
                ×
              </button>
            </div>
            {owner ? (
              <button type="button" className="btn primary" onClick={() => setDialog({ mode: "create", dates: [activeDay] })}>
                Add a task
              </button>
            ) : null}
            <div className="task-list">
              {tasksOn(activeDay).length === 0 ? <p className="empty-day">Nothing scheduled</p> : null}
              {tasksOn(activeDay).map((task) =>
                owner ? (
                  <button
                    key={task.id}
                    type="button"
                    className={task.completed ? "task done" : "task"}
                    style={{ borderLeftColor: colorFor(task.assigneeId, teammates) }}
                    onClick={() => setDialog({ mode: "edit", task })}
                  >
                    <span className="task-copy">
                      <span className="task-title">{task.title}</span>
                      <span className="who">{task.assigneeName}</span>
                    </span>
                    {task.completed ? <span className="flag">Done</span> : null}
                  </button>
                ) : (
                  <button
                    key={task.id}
                    type="button"
                    className={task.completed ? "task done" : "task"}
                    aria-pressed={task.completed}
                    disabled={pendingId === task.id}
                    onClick={() => toggle(task)}
                  >
                    <span className="box" aria-hidden="true">
                      {task.completed ? "✓" : ""}
                    </span>
                    <span className="task-title">{task.title}</span>
                  </button>
                ),
              )}
            </div>
          </section>
        </div>
      ) : null}
      {dialog ? (
        <TaskDialog
          mode={dialog.mode}
          teammates={teammates}
          initialTitle={dialog.mode === "edit" ? dialog.task.title : ""}
          initialAssigneeId={dialog.mode === "edit" ? dialog.task.assigneeId : teammates[0]?.id || ""}
          initialDates={dialog.mode === "edit" ? [dialog.task.date] : dialog.dates}
          pickDays={pickDays}
          taskId={dialog.mode === "edit" ? dialog.task.id : undefined}
          onClose={() => setDialog(null)}
          onCreated={(created) => {
            keepVisible([...tasks, ...created]);
            setDialog(null);
          }}
          onUpdated={(updated) => {
            keepVisible(tasks.map((task) => (task.id === updated.id ? updated : task)));
            setDialog(null);
          }}
          onDeleted={(id) => {
            setTasks((current) => current.filter((task) => task.id !== id));
            setDialog(null);
          }}
        />
      ) : null}
    </div>
  );
}
