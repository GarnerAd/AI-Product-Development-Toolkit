#!/usr/bin/env node
/**
 * Smoke test against the real server: builds if needed, starts the app on a free
 * port with a throwaway database, and checks the pages over HTTP.
 */

import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync } from "node:fs";
import { rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";

import { splitEqually } from "../src/lib/domain/split.ts";
import { MIGRATIONS } from "../src/lib/db/schema.ts";
import { checkEnvironment } from "./check-env.mjs";

const { ok, problems } = checkEnvironment();
if (!ok) {
  console.error("Stopped by the environment guard:");
  for (const problem of problems) console.error(` - ${problem}`);
  process.exit(1);
}

const port = Number(process.env.SMOKE_PORT ?? 3210);
const baseUrl = `http://127.0.0.1:${port}`;
const databasePath = resolve(process.cwd(), ".data/smoke.db");

function prepareDatabase() {
  mkdirSync(dirname(databasePath), { recursive: true });
  const db = new DatabaseSync(databasePath);
  db.exec("PRAGMA foreign_keys = ON;");

  const now = new Date().toISOString();
  db.exec(
    "CREATE TABLE IF NOT EXISTS schema_migrations (id TEXT PRIMARY KEY, applied_at TEXT NOT NULL);",
  );
  for (const migration of MIGRATIONS) {
    db.exec(migration.sql);
    db.prepare("INSERT INTO schema_migrations (id, applied_at) VALUES (?, ?)").run(
      migration.id,
      now,
    );
  }
  const groupId = randomUUID();
  db.prepare("INSERT INTO groups (id, name, currency, created_at) VALUES (?, ?, ?, ?)").run(
    groupId,
    "Smoke flat",
    "EUR",
    now,
  );
  const ana = randomUUID();
  const ben = randomUUID();
  for (const [id, name] of [
    [ana, "Ana"],
    [ben, "Ben"],
  ]) {
    db.prepare("INSERT INTO members (id, group_id, name, created_at) VALUES (?, ?, ?, ?)").run(
      id,
      groupId,
      name,
      now,
    );
  }

  const expenseId = randomUUID();
  db.prepare(
    "INSERT INTO expenses (id, group_id, description, amount_cents, paid_by, spent_on, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
  ).run(expenseId, groupId, "Smoke groceries", 2000, ana, now.slice(0, 10), now);
  for (const [memberId, amountCents] of splitEqually(2000, [ana, ben])) {
    db.prepare(
      "INSERT INTO expense_shares (expense_id, member_id, amount_cents) VALUES (?, ?, ?)",
    ).run(expenseId, memberId, amountCents);
  }

  db.close();
  return groupId;
}

async function waitForServer(attempts = 60) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(baseUrl, { redirect: "manual" });
      if (response.status < 500) return;
    } catch {
      // Server not listening yet.
    }
    await new Promise((done) => setTimeout(done, 500));
  }
  throw new Error(`The server did not answer on ${baseUrl} in time.`);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function toPlainText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/g, " ")
    .replace(/<style[\s\S]*?<\/style>/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#x27;|&apos;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

async function checkPage(path, expected) {
  const response = await fetch(`${baseUrl}${path}`);
  const body = toPlainText(await response.text());
  assert(response.status === 200, `${path} returned ${response.status}, expected 200.`);
  for (const fragment of expected) {
    assert(body.includes(fragment), `${path} did not include “${fragment}”.`);
  }
  console.log(`ok · GET ${path} · 200 · ${expected.length} facts`);
}

if (!existsSync(".next/BUILD_ID") && process.env.SKIP_BUILD !== "1") {
  console.log("No build found; running npm run build first.");
  const build = spawn("npm", ["run", "build"], { stdio: "inherit", env: process.env });
  const code = await new Promise((done) => build.on("exit", done));
  if (code !== 0) process.exit(code ?? 1);
}

await rm(databasePath, { force: true });
const groupId = prepareDatabase();

const server = spawn("npm", ["run", "start", "--", "-p", String(port)], {
  stdio: ["ignore", "pipe", "pipe"],
  // Own process group, so stopping the test also stops the server it started.
  detached: true,
  env: { ...process.env, SPLITMATE_DB: databasePath, NODE_ENV: "production" },
});
let serverLog = "";
server.stdout.on("data", (chunk) => {
  serverLog += chunk.toString();
});
server.stderr.on("data", (chunk) => {
  serverLog += chunk.toString();
});

const signalGroup = (signal) => {
  try {
    process.kill(-server.pid, signal);
  } catch {
    // The group has already gone.
  }
};

const stop = async () => {
  signalGroup("SIGTERM");
  await new Promise((done) => setTimeout(done, 600));
  signalGroup("SIGKILL");
};

let failure;
try {
  await waitForServer();
  await checkPage("/", ["Splitmate", "Your groups", "Smoke flat"]);
  await checkPage(`/groups/${groupId}`, [
    "Smoke flat",
    "Ana is owed €10.00",
    "Ben owes €10.00",
    "Ben pays Ana €10.00",
    "Smoke groceries",
    "Balances add up to €0.00",
    "Edit",
    "Remove",
  ]);

  const groupResponse = await fetch(`${baseUrl}/groups/${groupId}`);
  const editHref = (await groupResponse.text()).match(
    /\/groups\/[0-9a-f-]+\/expenses\/[0-9a-f-]+\/edit/,
  )?.[0];
  assert(editHref, "The expenses block has no edit link.");
  await checkPage(editHref, [
    "Edit expense",
    "Delete this expense",
    "Smoke groceries",
    "Save changes",
  ]);
  console.log(`ok · edit page reachable at ${editHref}`);

  const missing = await fetch(`${baseUrl}/groups/does-not-exist`);
  const missingHtml = await missing.text();
  assert(missing.status === 404, `Unknown group returned ${missing.status}, expected 404.`);
  // Next 16 answers a notFound() from a dynamic page with the 404 status and the
  // not-found page in the flight payload, which the browser paints after hydration.
  assert(
    missingHtml.includes("find that group"),
    "Unknown group response did not carry the not-found page.",
  );
  console.log("ok · GET /groups/does-not-exist · 404 · carries the not-found page");
} catch (error) {
  failure = error;
} finally {
  await stop();
}

if (failure) {
  console.error(`\nSmoke test failed: ${failure.message}`);
  if (serverLog) console.error(`\nServer output:\n${serverLog.slice(-4000)}`);
  process.exit(1);
}

console.log("\nSmoke test passed: the built app serves the pages and the balances.");
