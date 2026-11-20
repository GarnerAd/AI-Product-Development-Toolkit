/**
 * Ordered schema migrations. Append a new entry for every change; never edit one
 * that has run, because staging and production have already applied it.
 * The same SQL runs locally and, later, against Supabase.
 */

export type Migration = {
  id: string;
  sql: string;
};

export const MIGRATIONS: Migration[] = [
  {
    id: "001-initial",
    sql: `
      CREATE TABLE groups (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        currency TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE members (
        id TEXT PRIMARY KEY,
        group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE UNIQUE INDEX members_group_name_unique
        ON members(group_id, lower(name));

      CREATE TABLE expenses (
        id TEXT PRIMARY KEY,
        group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
        description TEXT NOT NULL,
        amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
        paid_by TEXT NOT NULL REFERENCES members(id),
        spent_on TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE INDEX expenses_group_created ON expenses(group_id, created_at DESC);

      CREATE TABLE expense_shares (
        expense_id TEXT NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
        member_id TEXT NOT NULL REFERENCES members(id),
        amount_cents INTEGER NOT NULL CHECK (amount_cents >= 0),
        PRIMARY KEY (expense_id, member_id)
      );

      CREATE TABLE settlements (
        id TEXT PRIMARY KEY,
        group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
        from_member TEXT NOT NULL REFERENCES members(id),
        to_member TEXT NOT NULL REFERENCES members(id),
        amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
        settled_on TEXT NOT NULL,
        created_at TEXT NOT NULL,
        CHECK (from_member <> to_member)
      );
      CREATE INDEX settlements_group_created ON settlements(group_id, created_at DESC);
    `,
  },
];
