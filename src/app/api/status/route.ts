import { json, jsonError, requireUser } from "@/lib/http";
import { getStatus } from "@/lib/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { db, user } = await requireUser();
    const url = new URL(request.url);
    const report = await getStatus(db, user, url.searchParams.get("from") ?? "", url.searchParams.get("to") ?? "");
    return json(report);
  } catch (error) {
    return jsonError(error);
  }
}
