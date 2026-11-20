#!/usr/bin/env node
/**
 * Puts one realistic group in the local database, so the app has something to show.
 * Development only, against the local file.
 */

import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";

import { splitEqually } from "../src/lib/domain/split.ts";
import { MIGRATIONS } from "../src/lib/db/schema.ts";
import { checkEnvironment } from "./check-env.mjs";

const { ok, problems, databasePath } = checkEnvironment();
if (!ok) {
  console.error("Stopped by the environment guard:");
  for (const problem of problems) console.error(` - ${problem}`);
  process.exit(1);
}
if (databasePath === ":memory:") {
  console.error("SPLITMATE_DB is :memory:, which disappears when this script ends. Set a file instead.");
  process.exit(1);
}

mkdirSync(dirname(databasePath), { recursive: true });
const db = new DatabaseSync(databasePath);
db.exec("PRAGMA foreign_keys = ON;");
db.exec("CREATE TABLE IF NOT EXISTS schema_migrations (id TEXT PRIMARY KEY, applied_at TEXT NOT NULL);");

const applied = new Set(db.prepare("SELECT id FROM schema_migrations").all().map((row) => row.id));
for (const migration of MIGRATIONS) {
  if (applied.has(migration.id)) continue;
  db.exec(migration.sql);
  db.prepare("INSERT INTO schema_migrations (id, applied_at) VALUES (?, ?)").run(
    migration.id,
    new Date().toISOString(),
  );
}

const existing = db.prepare("SELECT id FROM groups WHERE name = ?").get("Flat 3");
if (existing) {
  console.log("The demo group «Flat 3» is already there. Nothing to do.");
  process.exit(0);
}

const now = new Date().toISOString();
const groupId = randomUUID();
const today = new Date();
const day = (offset) => {
  const date = new Date(today);
  date.setDate(date.getDate() - offset);
  return date.toISOString().slice(0, 10);
};

db.prepare("INSERT INTO groups (id, name, currency, created_at) VALUES (?, ?, ?, ?)").run(
  groupId,
  "Flat 3",
  "EUR",
  now,
);

const people = ["Ana", "Ben", "Chloé", "Dan"].map((name) => ({ id: randomUUID(), name }));
for (const person of people) {
  db.prepare("INSERT INTO members (id, group_id, name, created_at) VALUES (?, ?, ?, ?)").run(
    person.id,
    groupId,
    person.name,
    now,
  );
}
const byName = new Map(people.map((person) => [person.name, person.id]));

const expenses = [
  { description: "Electricity bill", amountCents: 6100, paidBy: "Ana", sharedBy: ["Ana", "Ben", "Chloé", "Dan"], spentOn: day(12) },
  { description: "Weekly groceries", amountCents: 8440, paidBy: "Ben", sharedBy: ["Ana", "Ben", "Chloé", "Dan"], spentOn: day(6) },
  { description: "Wifi", amountCents: 3000, paidBy: "Ana", sharedBy: ["Ana", "Ben", "Chloé", "Dan"], spentOn: day(4) },
  { description: "Cleaning supplies", amountCents: 1875, paidBy: "Chloé", sharedBy: ["Ana", "Chloé"], spentOn: day(2) },
];

for (const expense of expenses) {
  const expenseId = randomUUID();
  db.prepare(
    "INSERT INTO expenses (id, group_id, description, amount_cents, paid_by, spent_on, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
  ).run(expenseId, groupId, expense.description, expense.amountCents, byName.get(expense.paidBy), expense.spentOn, now);

  const shares = splitEqually(expense.amountCents, expense.sharedBy.map((name) => byName.get(name)));
  for (const [memberId, amountCents] of shares) {
    db.prepare("INSERT INTO expense_shares (expense_id, member_id, amount_cents) VALUES (?, ?, ?)").run(
      expenseId,
      memberId,
      amountCents,
    );
  }
}

db.prepare(
  "INSERT INTO settlements (id, group_id, from_member, to_member, amount_cents, settled_on, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
).run(randomUUID(), groupId, byName.get("Dan"), byName.get("Ana"), 1000, day(1), now);

console.log(`Seeded «Flat 3» (EUR) with ${people.length} people and ${expenses.length} expenses.`);
console.log("Open the app and pick Flat 3 from the list.");
db.close();
