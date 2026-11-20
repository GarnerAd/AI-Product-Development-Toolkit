#!/usr/bin/env node
/** Deletes the local database file. Development data only; never runs against a hosted database. */

import { rm } from "node:fs/promises";

import { checkEnvironment } from "./check-env.mjs";

const { ok, problems, databasePath } = checkEnvironment();
if (!ok) {
  console.error("Stopped by the environment guard:");
  for (const problem of problems) console.error(` - ${problem}`);
  process.exit(1);
}

if (databasePath === ":memory:") {
  console.log("SPLITMATE_DB is :memory:, so there is nothing to delete.");
  process.exit(0);
}

await rm(databasePath, { force: true });
await rm(`${databasePath}-wal`, { force: true });
await rm(`${databasePath}-shm`, { force: true });
console.log(`Deleted ${databasePath}. The next command recreates it with the current schema.`);
