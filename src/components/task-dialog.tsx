"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { FormEvent } from "react";
import { weekdayShort } from "@/lib/dates";
import type { Task, User } from "@/lib/types";
import { api } from "./api";

export function TaskDialog({
  mode,
  teammates,
  initialTitle,
  initialAssigneeId,
  initialDates,
  pickDays,
  taskId,
  onClose,
  onCreated,
  onUpdated,
  onDeleted,
}: {
  mode: "create" | "edit";
  teammates: User[];
  initialTitle: string;
  initialAssigneeId: string;
  initialDates: string[];
  pickDays: string[];
  taskId?: string;
  onClose: () => void;
  onCreated: (tasks: Task[]) => void;
  onUpdated: (task: Task) => void;
  onDeleted: (id: string) => void;
}) {
  const titleId = useId();
  const titleRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState(initialTitle);
  const [assigneeId, setAssigneeId] = useState(initialAssigneeId || teammates[0]?.id || "");
  const [dates, setDates] = useState(initialDates);
  const [date, setDate] = useState(initialDates[0] ?? "");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  function toggleDate(day: string) {
    setDates((current) =>
      current.includes(day) ? current.filter((item) => item !== day) : [...current, day].sort(),
    );
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPending(true);
    try {
      if (mode === "create") {
        const created = await api<Task[]>("/api/tasks", {
          method: "POST",
          body: JSON.stringify({ title, assigneeId, dates }),
        });
        onCreated(created);
        return;
      }
      const updated = await api<Task>(`/api/tasks/${taskId}`, {
        method: "PATCH",
        body: JSON.stringify({ title, assigneeId, date }),
      });
      onUpdated(updated);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save the task.");
      setPending(false);
    }
  }

  async function remove() {
    if (!taskId) return;
    if (!confirming) {
      setConfirming(true);
      return;
    }
    setPending(true);
    setError("");
    try {
      await api(`/api/tasks/${taskId}`, { method: "DELETE" });
      onDeleted(taskId);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not delete the task.");
      setPending(false);
    }
  }

  return (
    <div className="backdrop" onMouseDown={onClose}>
      <form
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onMouseDown={(event) => event.stopPropagation()}
        onSubmit={onSubmit}
      >
        <div className="dialog-head">
          <h2 id={titleId}>{mode === "create" ? "Assign a task" : "Edit task"}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        {teammates.length === 0 ? (
          <p className="lede">
            Add a teammate on the Team tab first. Tasks are assigned to people, not to the owner account.
          </p>
        ) : (
          <>
            <label className="field">
              <span>Title</span>
              <input
                ref={titleRef}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                maxLength={120}
                required
              />
            </label>
            <label className="field">
              <span>Teammate</span>
              <select value={assigneeId} onChange={(event) => setAssigneeId(event.target.value)} required>
                {teammates.map((mate) => (
                  <option key={mate.id} value={mate.id}>
                    {mate.displayName}
                  </option>
                ))}
              </select>
            </label>
            {mode === "create" ? (
              <fieldset className="field">
                <legend>Days</legend>
                <p className="hint">Each selected day gets its own task. {dates.length} selected.</p>
                <div className="day-picks">
                  {pickDays.map((day) => (
                    <button
                      key={day}
                      type="button"
                      className={dates.includes(day) ? "pick on" : "pick"}
                      aria-pressed={dates.includes(day)}
                      onClick={() => toggleDate(day)}
                    >
                      <span>{weekdayShort(day)}</span>
                      <strong>{Number(day.slice(8))}</strong>
                    </button>
                  ))}
                </div>
              </fieldset>
            ) : (
              <label className="field">
                <span>Day</span>
                <input type="date" value={date} onChange={(event) => setDate(event.target.value)} required />
              </label>
            )}
            {error ? (
              <p className="alert" role="alert">
                {error}
              </p>
            ) : null}
            <div className="actions">
              {mode === "edit" ? (
                <button type="button" className="btn danger" onClick={remove} disabled={pending}>
                  {confirming ? "Confirm delete" : "Delete"}
                </button>
              ) : (
                <span />
              )}
              <button className="btn primary" type="submit" disabled={pending || (mode === "create" && dates.length === 0)}>
                {pending ? "Saving…" : mode === "create" ? "Assign" : "Save"}
              </button>
            </div>
          </>
        )}
      </form>
    </div>
  );
}
