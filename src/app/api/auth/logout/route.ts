import { cookies } from "next/headers";
import { getDatabase } from "@/lib/bootstrap";
import { json, jsonError, SESSION_COOKIE, sessionCookieOptions } from "@/lib/http";
import { deleteSession } from "@/lib/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST() {
  try {
    const jar = await cookies();
    const token = jar.get(SESSION_COOKIE)?.value;
    if (token) {
      const db = await getDatabase();
      await deleteSession(db, token);
    }
    jar.set(SESSION_COOKIE, "", sessionCookieOptions(0));
    return json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
