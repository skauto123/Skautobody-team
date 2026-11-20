import { json, jsonError, readJson, requireUser } from "@/lib/http";
import { createTasks, listTasks } from "@/lib/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { db, user } = await requireUser();
    const url = new URL(request.url);
    const tasks = await listTasks(db, user, url.searchParams.get("from") ?? "", url.searchParams.get("to") ?? "");
    return json(tasks);
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const { db, user } = await requireUser();
    const body = await readJson(request);
    const dates = Array.isArray(body.dates) ? body.dates.filter((date): date is string => typeof date === "string") : [];
    const tasks = await createTasks(db, user, {
      title: typeof body.title === "string" ? body.title : "",
      assigneeId: typeof body.assigneeId === "string" ? body.assigneeId : "",
      dates,
    });
    return json(tasks, 201);
  } catch (error) {
    return jsonError(error);
  }
}
