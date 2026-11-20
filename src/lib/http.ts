import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDatabase } from "./bootstrap";
import type { Database } from "./db";
import { AppError } from "./errors";
import { getUserBySession } from "./store";
import type { User } from "./types";

export const SESSION_COOKIE = "sk_session";
const THIRTY_DAYS = 60 * 60 * 24 * 30;

export function sessionCookieOptions(maxAge = THIRTY_DAYS) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}

export const currentUser = cache(async (): Promise<User | null> => {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const db = await getDatabase();
  return getUserBySession(db, token);
});

export async function requirePageUser(): Promise<User> {
  const user = await currentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireOwnerPage(): Promise<User> {
  const user = await requirePageUser();
  if (user.role !== "owner") redirect("/");
  return user;
}

export async function requireUser(): Promise<{ db: Database; user: User }> {
  const db = await getDatabase();
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) throw new AppError(401, "Sign in required.");
  const user = await getUserBySession(db, token);
  if (!user) throw new AppError(401, "Sign in required.");
  return { db, user };
}

export async function readJson(request: Request): Promise<Record<string, unknown>> {
  let value: unknown;
  try {
    value = await request.json();
  } catch {
    throw new AppError(400, "The request could not be read.");
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new AppError(400, "The request could not be read.");
  }
  return value as Record<string, unknown>;
}

export function json(data: unknown, status = 200): Response {
  return Response.json(data, {
    status,
    headers: { "cache-control": "no-store" },
  });
}

export function jsonError(error: unknown): Response {
  if (error instanceof AppError) return json({ error: error.message }, error.status);
  console.error(error);
  return json({ error: "Something went wrong." }, 500);
}
