import { json, jsonError, readJson, requireUser } from "@/lib/http";
import { deleteTask, setTaskCompleted, updateTask } from "@/lib/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { db, user } = await requireUser();
    const { id } = await context.params;
    const body = await readJson(request);
    if (
      typeof body.completed === "boolean" &&
      body.title === undefined &&
      body.assigneeId === undefined &&
      body.date === undefined
    ) {
      return json(await setTaskCompleted(db, user, id, body.completed));
    }
    const task = await updateTask(db, user, id, {
      title: typeof body.title === "string" ? body.title : "",
      assigneeId: typeof body.assigneeId === "string" ? body.assigneeId : "",
      date: typeof body.date === "string" ? body.date : "",
    });
    return json(task);
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { db, user } = await requireUser();
    const { id } = await context.params;
    await deleteTask(db, user, id);
    return json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
