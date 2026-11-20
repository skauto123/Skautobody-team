import { cookies } from "next/headers";
import { getDatabase } from "@/lib/bootstrap";
import { json, jsonError, readJson, SESSION_COOKIE, sessionCookieOptions } from "@/lib/http";
import { authenticate, createSession } from "@/lib/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await readJson(request);
    const username = typeof body.username === "string" ? body.username : "";
    const password = typeof body.password === "string" ? body.password : "";
    const db = await getDatabase();
    const user = await authenticate(db, username, password);
    if (!user) return json({ error: "That username and PIN don't match." }, 401);
    const token = await createSession(db, user.id);
    const jar = await cookies();
    jar.set(SESSION_COOKIE, token, sessionCookieOptions());
    return json({ user });
  } catch (error) {
    return jsonError(error);
  }
}
