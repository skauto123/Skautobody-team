"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import type { User } from "@/lib/types";
import { api } from "./api";

export function TeamScreen() {
  const [teammates, setTeammates] = useState<User[]>([]);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api<User[]>("/api/teammates")
      .then((rows) => {
        if (!cancelled) setTeammates(rows);
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
  }, []);

  async function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setPending(true);
    setError("");
    try {
      const created = await api<User>("/api/teammates", {
        method: "POST",
        body: JSON.stringify({
          name: data.get("name"),
          username: data.get("username"),
          pin: data.get("pin"),
        }),
      });
      setTeammates((current) =>
        [...current, created].sort((a, b) => a.displayName.localeCompare(b.displayName, "en")),
      );
      form.reset();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not add that teammate.");
    } finally {
      setPending(false);
    }
  }

  async function remove(mate: User) {
    if (!window.confirm(`Remove ${mate.displayName}? Their tasks come off the calendar too.`)) return;
    setError("");
    try {
      await api(`/api/teammates/${mate.id}`, { method: "DELETE" });
      setTeammates((current) => current.filter((item) => item.id !== mate.id));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not remove that teammate.");
    }
  }

  return (
    <div className="screen narrow">
      <header className="page-head">
        <h1>Team</h1>
        <p className="lede">Add each person who should sign in. They only see the tasks you assign to them.</p>
      </header>
      <form className="card stack" onSubmit={add}>
        <label className="field">
          <span>Name</span>
          <input name="name" maxLength={40} required />
        </label>
        <label className="field">
          <span>Username</span>
          <input name="username" autoCapitalize="none" autoComplete="off" spellCheck={false} required />
        </label>
        <label className="field">
          <span>PIN</span>
          <input name="pin" minLength={4} autoComplete="new-password" required />
        </label>
        {error ? (
          <p className="alert" role="alert">
            {error}
          </p>
        ) : null}
        <button className="btn primary" type="submit" disabled={pending}>
          {pending ? "Adding…" : "Add teammate"}
        </button>
      </form>
      {loading ? <p className="hint">Loading the team…</p> : null}
      {!loading && teammates.length === 0 ? <p className="hint">No teammates yet.</p> : null}
      <ul className="team-list">
        {teammates.map((mate) => (
          <li key={mate.id}>
            <div>
              <strong>{mate.displayName}</strong>
              <span>@{mate.username}</span>
            </div>
            <button type="button" className="btn danger" onClick={() => remove(mate)} aria-label={`Remove ${mate.displayName}`}>
              Remove
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
