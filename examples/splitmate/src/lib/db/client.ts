/**
 * Opens the local database and applies pending migrations.
 *
 * Development and tests use an embedded SQLite file (or `:memory:`), because the
 * Supabase local stack needs Docker, which this machine does not have. The rest of
 * the app reaches data only through `repository.ts`, so a Supabase adapter can
 * replace this module for hosted environments without touching product code.
 */

import { mkdirSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";

import { MIGRATIONS } from "./schema";

export const DEFAULT_DATABASE_PATH = ".data/splitmate.db";

const globalForDb = globalThis as unknown as {
  __splitmateDb?: DatabaseSync;
};

/** Turns `SPLITMATE_DB` into an absolute path, or `:memory:`. */
export function resolveDatabasePath(value = process.env.SPLITMATE_DB): string {
  if (!value || value.trim() === "") return resolve(process.cwd(), DEFAULT_DATABASE_PATH);
  if (value === ":memory:") return value;
  // turbopackIgnore keeps the database path from being traced as a build asset.
  return isAbsolute(value) ? resolve(value) : resolve(/* turbopackIgnore: true */ process.cwd(), value);
}

/** True when the path is inside the project folder, which keeps secrets and data local. */
export function isInsideProject(path: string, cwd = process.cwd()): boolean {
  if (path === ":memory:") return true;
  const rel = relative(cwd, path);
  return rel !== "" && !rel.startsWith("..") && !isAbsolute(rel);
}

export function createDatabase(path: string): DatabaseSync {
  if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });

  const db = new DatabaseSync(path);
  db.exec("PRAGMA foreign_keys = ON;");
  db.exec("PRAGMA busy_timeout = 5000;");
  if (path !== ":memory:") db.exec("PRAGMA journal_mode = WAL;");
  migrate(db);
  return db;
}

export function migrate(db: DatabaseSync): void {
  db.exec(
    "CREATE TABLE IF NOT EXISTS schema_migrations (id TEXT PRIMARY KEY, applied_at TEXT NOT NULL);",
  );

  const applied = new Set(
    (
      db.prepare("SELECT id FROM schema_migrations").all() as { id: string }[]
    ).map((row) => row.id),
  );

  for (const migration of MIGRATIONS) {
    if (applied.has(migration.id)) continue;
    db.exec("BEGIN");
    try {
      db.exec(migration.sql);
      db.prepare("INSERT INTO schema_migrations (id, applied_at) VALUES (?, ?)").run(
        migration.id,
        new Date().toISOString(),
      );
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  }
}

/** The app's single connection, reused across hot reloads in development. */
export function getDatabase(): DatabaseSync {
  if (!globalForDb.__splitmateDb) {
    globalForDb.__splitmateDb = createDatabase(resolveDatabasePath());
  }
  return globalForDb.__splitmateDb;
}

/** Used by tests and scripts to start from a clean file. */
export function closeDatabase(): void {
  globalForDb.__splitmateDb?.close();
  globalForDb.__splitmateDb = undefined;
}
