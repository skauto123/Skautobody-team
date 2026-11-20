import path from "node:path";
import { openDatabase, type Database } from "./db";
import { ensureOwner } from "./store";

let pending: Promise<Database> | null = null;

export function getDatabase(): Promise<Database> {
  if (!pending) {
    pending = init().catch((error) => {
      pending = null;
      throw error;
    });
  }
  return pending;
}

async function init(): Promise<Database> {
  const databaseUrl = process.env.DATABASE_URL?.trim() || "";
  let db: Database;
  if (databaseUrl.startsWith("postgres://") || databaseUrl.startsWith("postgresql://")) {
    db = await openDatabase({ databaseUrl });
  } else if (databaseUrl) {
    throw new Error("DATABASE_URL must be a Postgres connection string. Leave it unset to use SQLite.");
  } else if (process.env.VERCEL) {
    throw new Error("SQLite cannot persist on Vercel. Set DATABASE_URL to a Postgres connection string.");
  } else {
    const file = process.env.SQLITE_PATH || path.join(process.cwd(), "data", "sk-autobody.db");
    db = await openDatabase({ sqlitePath: file });
  }
  await ensureOwner(db, {
    username: process.env.OWNER_USERNAME || "",
    password: process.env.OWNER_PASSWORD || "",
    displayName: process.env.OWNER_DISPLAY_NAME?.trim() || "Michael",
  });
  return db;
}
