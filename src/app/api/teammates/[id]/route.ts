import { json, jsonError, requireUser } from "@/lib/http";
import { removeTeammate } from "@/lib/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { db, user } = await requireUser();
    const { id } = await context.params;
    await removeTeammate(db, user, id);
    return json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
