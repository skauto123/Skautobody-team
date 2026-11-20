"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import type { User } from "@/lib/types";

export function ShopChrome({ user, children }: { user: User; children: React.ReactNode }) {
  const pathname = usePathname();
  const [pending, setPending] = useState(false);

  async function logout() {
    setPending(true);
    const response = await fetch("/api/auth/logout", { method: "POST" });
    if (response.ok) {
      window.location.href = "/login";
      return;
    }
    setPending(false);
  }

  return (
    <div className="shell">
      <a className="skip" href="#content">
        Skip to content
      </a>
      <div className="chrome">
        <header className="top">
          <div className="brand">
            <span className="mark" aria-hidden="true">
              SK
            </span>
            <div>
              <strong>SK Autobody</strong>
              <span>Team calendar</span>
            </div>
          </div>
          <div className="session">
            <p className="whoami">
              <strong>{user.displayName}</strong>
              <span>{user.role === "owner" ? "Owner" : "Teammate"}</span>
            </p>
            <button type="button" className="btn" onClick={logout} disabled={pending}>
              Sign out
            </button>
          </div>
        </header>
        <nav className="tabs" aria-label="Sections">
          <Link href="/" aria-current={pathname === "/" ? "page" : undefined}>
            Calendar
          </Link>
          {user.role === "owner" ? (
            <Link href="/team" aria-current={pathname === "/team" ? "page" : undefined}>
              Team
            </Link>
          ) : null}
          {user.role === "owner" ? (
            <Link href="/status" aria-current={pathname === "/status" ? "page" : undefined}>
              Status
            </Link>
          ) : null}
        </nav>
      </div>
      <main id="content" className="content">
        {children}
      </main>
    </div>
  );
}
