import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

const migrations = [
  {
    version: 1,
    sql: `
      CREATE TABLE tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL CHECK(length(title) BETWEEN 1 AND 200),
        description TEXT,
        status TEXT NOT NULL DEFAULT 'todo' CHECK(status IN ('todo', 'in_progress', 'done')),
        priority TEXT NOT NULL DEFAULT 'medium' CHECK(priority IN ('low', 'medium', 'high')),
        due_date TEXT,
        tags TEXT NOT NULL DEFAULT '[]',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX tasks_status_idx ON tasks(status);
      CREATE INDEX tasks_priority_idx ON tasks(priority);
      CREATE INDEX tasks_due_date_idx ON tasks(due_date);
    `,
  },
] as const;

export type SqliteDatabase = Database.Database;

export function openDatabase(path: string): SqliteDatabase {
  if (path !== ":memory:")
    mkdirSync(dirname(resolve(path)), { recursive: true });
  const database = new Database(path);
  database.pragma("journal_mode = WAL");
  database.pragma("foreign_keys = ON");
  migrate(database);
  return database;
}

export function migrate(database: SqliteDatabase): void {
  database.exec(
    "CREATE TABLE IF NOT EXISTS migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL)",
  );
  const applied = database
    .prepare("SELECT version FROM migrations")
    .all()
    .map((row) => (row as { version: number }).version);
  for (const migration of migrations) {
    if (applied.includes(migration.version)) continue;
    database.transaction(() => {
      database.exec(migration.sql);
      database
        .prepare("INSERT INTO migrations (version, applied_at) VALUES (?, ?)")
        .run(migration.version, new Date().toISOString());
    })();
  }
}
