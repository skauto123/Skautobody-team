"use client";

import { useState } from "react";
import type { FormEvent } from "react";

export function LoginForm() {
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          username: form.get("username"),
          password: form.get("password"),
        }),
      });
      const body = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(body.error || "Could not sign in.");
      window.location.href = "/";
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not sign in.");
      setPending(false);
    }
  }

  return (
    <main className="login">
      <form className="card" onSubmit={onSubmit}>
        <div className="brand dark">
          <span className="mark" aria-hidden="true">
            SK
          </span>
          <div>
            <strong>SK Autobody</strong>
            <span>Team calendar</span>
          </div>
        </div>
        <h1>Sign in</h1>
        <p className="lede">Teammates use the username and PIN from the owner. The owner uses the account password.</p>
        <label className="field">
          <span>Username</span>
          <input name="username" autoComplete="username" autoCapitalize="none" spellCheck={false} required />
        </label>
        <label className="field">
          <span>PIN or password</span>
          <input name="password" type="password" autoComplete="current-password" required />
        </label>
        {error ? (
          <p className="alert" role="alert">
            {error}
          </p>
        ) : null}
        <button className="btn primary" type="submit" disabled={pending}>
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </main>
  );
}
