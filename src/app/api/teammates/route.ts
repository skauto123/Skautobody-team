import { json, jsonError, readJson, requireUser } from "@/lib/http";
import { createTeammate, listTeammates } from "@/lib/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const { db, user } = await requireUser();
    return json(await listTeammates(db, user));
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const { db, user } = await requireUser();
    const body = await readJson(request);
    const teammate = await createTeammate(db, user, {
      name: typeof body.name === "string" ? body.name : "",
      username: typeof body.username === "string" ? body.username : "",
      pin: typeof body.pin === "string" ? body.pin : "",
    });
    return json(teammate, 201);
  } catch (error) {
    return jsonError(error);
  }
}
