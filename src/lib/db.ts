import { mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync, type SQLInputValue } from "node:sqlite";

export type SqlParam = string | number | null;

export interface Database {
  exec(sql: string): Promise<void>;
  all(sql: string, params?: SqlParam[]): Promise<Record<string, unknown>[]>;
  get(sql: string, params?: SqlParam[]): Promise<Record<string, unknown> | undefined>;
  run(sql: string, params?: SqlParam[]): Promise<void>;
  transaction<T>(fn: (tx: Database) => Promise<T>): Promise<T>;
}

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    assignee_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    task_date TEXT NOT NULL,
    completed INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS tasks_date_idx ON tasks (task_date)`,
  `CREATE INDEX IF NOT EXISTS tasks_assignee_idx ON tasks (assignee_id)`,
  `CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions (user_id)`,
];

function createMutex() {
  let tail: Promise<void> = Promise.resolve();
  return function exclusive<T>(fn: () => Promise<T>): Promise<T> {
    const previous = tail;
    let release: () => void = () => {};
    tail = new Promise<void>((resolve) => {
      release = resolve;
    });
    return previous.then(fn).finally(() => release());
  };
}

function asRecord(row: object): Record<string, unknown> {
  return { ...row };
}

function createSqliteDatabase(file: string): Database {
  if (file !== ":memory:") mkdirSync(path.dirname(file), { recursive: true });
  const raw = new DatabaseSync(file);
  raw.exec("PRAGMA foreign_keys = ON");
  raw.exec("PRAGMA busy_timeout = 5000");
  raw.exec("PRAGMA journal_mode = WAL");
  const exclusive = createMutex();

  const unbound = (inTransaction: boolean): Database => ({
    async exec(sql) {
      raw.exec(sql);
    },
    async all(sql, params = []) {
      const rows = raw.prepare(sql).all(...(params as SQLInputValue[]));
      return rows.map((row) => asRecord(row));
    },
    async get(sql, params = []) {
      const row = raw.prepare(sql).get(...(params as SQLInputValue[]));
      return row ? asRecord(row) : undefined;
    },
    async run(sql, params = []) {
      raw.prepare(sql).run(...(params as SQLInputValue[]));
    },
    transaction(fn) {
      if (inTransaction) return fn(unbound(true));
      return exclusive(async () => {
        raw.exec("BEGIN");
        try {
          const result = await fn(unbound(true));
          raw.exec("COMMIT");
          return result;
        } catch (error) {
          try {
            raw.exec("ROLLBACK");
          } catch {
            // The statement already failed before a transaction was open.
          }
          throw error;
        }
      });
    },
  });

  const base = unbound(false);
  return {
    exec: (sql) => exclusive(() => base.exec(sql)),
    all: (sql, params) => exclusive(() => base.all(sql, params)),
    get: (sql, params) => exclusive(() => base.get(sql, params)),
    run: (sql, params) => exclusive(() => base.run(sql, params)),
    transaction: (fn) => base.transaction(fn),
  };
}

function toPg(sql: string): string {
  let index = 0;
  return sql.replace(/\?/g, () => `$${++index}`);
}

async function createPgDatabase(connectionString: string): Promise<Database> {
  const { default: pg } = await import("pg");
  const pool = new pg.Pool({
    connectionString,
    max: 5,
    ssl: /sslmode=(require|verify-full|verify-ca)/.test(connectionString)
      ? { rejectUnauthorized: false }
      : undefined,
  });

  type Queryable = {
    query: (sql: string, params?: unknown[]) => Promise<{ rows: object[] }>;
  };

  const apiFor = (queryable: Queryable, inTransaction: boolean): Database => ({
    async exec(sql) {
      await queryable.query(sql);
    },
    async all(sql, params = []) {
      const result = await queryable.query(toPg(sql), params);
      return result.rows.map((row) => asRecord(row));
    },
    async get(sql, params = []) {
      const result = await queryable.query(toPg(sql), params);
      return result.rows[0] ? asRecord(result.rows[0]) : undefined;
    },
    async run(sql, params = []) {
      await queryable.query(toPg(sql), params);
    },
    async transaction(fn) {
      if (inTransaction) return fn(apiFor(queryable, true));
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const result = await fn(apiFor(client, true));
        await client.query("COMMIT");
        return result;
      } catch (error) {
        try {
          await client.query("ROLLBACK");
        } catch {
          // Ignore a rollback failure and surface the original error.
        }
        throw error;
      } finally {
        client.release();
      }
    },
  });

  return apiFor(pool, false);
}

export async function migrate(db: Database): Promise<void> {
  for (const statement of SCHEMA) await db.exec(statement);
}

export async function openDatabase(
  options: { sqlitePath: string } | { databaseUrl: string },
): Promise<Database> {
  const db =
    "sqlitePath" in options
      ? createSqliteDatabase(options.sqlitePath)
      : await createPgDatabase(options.databaseUrl);
  await migrate(db);
  return db;
}
