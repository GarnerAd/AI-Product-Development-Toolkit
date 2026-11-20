import { randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";

import type {
  Expense,
  ExpenseShare,
  Group,
  GroupSummary,
  Member,
  NewExpense,
  NewSettlement,
  Settlement,
} from "../types";
import { getDatabase } from "./client";
import {
  DuplicateMemberError,
  ExpenseNotFoundError,
  GroupNotFoundError,
  MemberInUseError,
  UnknownMemberError,
} from "./errors";

export type Repository = {
  createGroup(input: { name: string; currency: string }): Group;
  listGroups(): GroupSummary[];
  getGroup(groupId: string): Group | null;
  listMembers(groupId: string): Member[];
  addMember(input: { groupId: string; name: string }): Member;
  deleteMember(memberId: string): void;
  listExpenses(groupId: string): Expense[];
  getExpense(expenseId: string): Expense | null;
  addExpense(input: NewExpense): Expense;
  updateExpense(expenseId: string, input: NewExpense): Expense;
  deleteExpense(expenseId: string): void;
  listSettlements(groupId: string): Settlement[];
  addSettlement(input: NewSettlement): Settlement;
};

type GroupRow = {
  id: string;
  name: string;
  currency: string;
  created_at: string;
};

type SummaryRow = GroupRow & {
  memberCount: number;
  expenseCount: number;
  totalCents: number;
};

type MemberRow = { id: string; group_id: string; name: string; created_at: string };

type ExpenseRow = {
  id: string;
  group_id: string;
  description: string;
  amount_cents: number;
  paid_by: string;
  spent_on: string;
  created_at: string;
};

type ShareRow = { expense_id: string; member_id: string; amount_cents: number };

type SettlementRow = {
  id: string;
  group_id: string;
  from_member: string;
  to_member: string;
  amount_cents: number;
  settled_on: string;
  created_at: string;
};

const toGroup = (row: GroupRow): Group => ({
  id: row.id,
  name: row.name,
  currency: row.currency,
  createdAt: row.created_at,
});

const toMember = (row: MemberRow): Member => ({
  id: row.id,
  groupId: row.group_id,
  name: row.name,
  createdAt: row.created_at,
});

const toSettlement = (row: SettlementRow): Settlement => ({
  id: row.id,
  groupId: row.group_id,
  fromMember: row.from_member,
  toMember: row.to_member,
  amountCents: row.amount_cents,
  settledOn: row.settled_on,
  createdAt: row.created_at,
});

export function createRepository(db: DatabaseSync): Repository {
  const insertGroup = db.prepare(
    "INSERT INTO groups (id, name, currency, created_at) VALUES (?, ?, ?, ?)",
  );
  const selectGroup = db.prepare("SELECT * FROM groups WHERE id = ?");
  const selectGroups = db.prepare(`
    SELECT g.*,
      (SELECT COUNT(*) FROM members m WHERE m.group_id = g.id) AS memberCount,
      (SELECT COUNT(*) FROM expenses e WHERE e.group_id = g.id) AS expenseCount,
      COALESCE((SELECT SUM(e.amount_cents) FROM expenses e WHERE e.group_id = g.id), 0) AS totalCents
    FROM groups g
    ORDER BY g.created_at DESC, g.rowid DESC
  `);
  const insertMember = db.prepare(
    "INSERT INTO members (id, group_id, name, created_at) VALUES (?, ?, ?, ?)",
  );
  const selectMembers = db.prepare(
    "SELECT * FROM members WHERE group_id = ? ORDER BY created_at ASC, rowid ASC",
  );
  const selectMemberByName = db.prepare(
    "SELECT id FROM members WHERE group_id = ? AND lower(name) = lower(?)",
  );
  const insertExpense = db.prepare(`
    INSERT INTO expenses (id, group_id, description, amount_cents, paid_by, spent_on, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const insertShare = db.prepare(
    "INSERT INTO expense_shares (expense_id, member_id, amount_cents) VALUES (?, ?, ?)",
  );
  const selectExpenses = db.prepare(
    "SELECT * FROM expenses WHERE group_id = ? ORDER BY spent_on DESC, created_at DESC, rowid DESC",
  );
  const selectShares = db.prepare(`
    SELECT s.expense_id, s.member_id, s.amount_cents
    FROM expense_shares s
    JOIN expenses e ON e.id = s.expense_id
    WHERE e.group_id = ?
  `);
  const selectExpense = db.prepare("SELECT * FROM expenses WHERE id = ?");
  const selectSharesForExpense = db.prepare(
    "SELECT * FROM expense_shares WHERE expense_id = ?",
  );
  const updateExpenseRow = db.prepare(
    "UPDATE expenses SET description = ?, amount_cents = ?, paid_by = ?, spent_on = ? WHERE id = ?",
  );
  const deleteSharesForExpense = db.prepare("DELETE FROM expense_shares WHERE expense_id = ?");
  const deleteExpenseRow = db.prepare("DELETE FROM expenses WHERE id = ?");
  const selectMemberById = db.prepare("SELECT * FROM members WHERE id = ?");
  const deleteMemberRow = db.prepare("DELETE FROM members WHERE id = ?");
  const countMemberReferences = db.prepare(`
    SELECT
      (SELECT COUNT(*) FROM expense_shares WHERE member_id = ?) +
      (SELECT COUNT(*) FROM expenses WHERE paid_by = ?) +
      (SELECT COUNT(*) FROM settlements WHERE from_member = ? OR to_member = ?) AS total
  `);
  const insertSettlement = db.prepare(`
    INSERT INTO settlements (id, group_id, from_member, to_member, amount_cents, settled_on, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const selectSettlements = db.prepare(
    "SELECT * FROM settlements WHERE group_id = ? ORDER BY settled_on DESC, created_at DESC, rowid DESC",
  );

  function assertGroup(groupId: string): void {
    if (!selectGroup.get(groupId)) throw new GroupNotFoundError(groupId);
  }

  function groupMemberIds(groupId: string): Set<string> {
    return new Set((selectMembers.all(groupId) as MemberRow[]).map((row) => row.id));
  }

  /** The checks every new or changed expense must pass, before a row is written. */
  function assertExpenseInput(input: {
    groupId: string;
    amountCents: number;
    paidBy: string;
    shares: ExpenseShare[];
  }): void {
    assertGroup(input.groupId);
    const members = groupMemberIds(input.groupId);
    if (!members.has(input.paidBy)) throw new UnknownMemberError(input.paidBy);
    if (input.shares.length === 0) throw new Error("An expense needs at least one share");
    for (const share of input.shares) {
      if (!members.has(share.memberId)) throw new UnknownMemberError(share.memberId);
    }
    const total = input.shares.reduce((sum, share) => sum + share.amountCents, 0);
    if (total !== input.amountCents) {
      throw new Error("Shares must add up to the expense amount");
    }
  }

  function readExpense(expenseId: string): Expense | null {
    const row = selectExpense.get(expenseId) as ExpenseRow | undefined;
    if (!row) return null;
    const shares = (selectSharesForExpense.all(expenseId) as ShareRow[]).map((share) => ({
      memberId: share.member_id,
      amountCents: share.amount_cents,
    }));
    return {
      id: row.id,
      groupId: row.group_id,
      description: row.description,
      amountCents: row.amount_cents,
      paidBy: row.paid_by,
      spentOn: row.spent_on,
      createdAt: row.created_at,
      shares,
    };
  }

  return {
    createGroup({ name, currency }) {
      const group: Group = {
        id: randomUUID(),
        name,
        currency,
        createdAt: new Date().toISOString(),
      };
      insertGroup.run(group.id, group.name, group.currency, group.createdAt);
      return group;
    },

    listGroups() {
      return (selectGroups.all() as SummaryRow[]).map((row) => ({
        ...toGroup(row),
        memberCount: row.memberCount,
        expenseCount: row.expenseCount,
        totalCents: row.totalCents,
      }));
    },

    getGroup(groupId) {
      const row = selectGroup.get(groupId) as GroupRow | undefined;
      return row ? toGroup(row) : null;
    },

    listMembers(groupId) {
      return (selectMembers.all(groupId) as MemberRow[]).map(toMember);
    },

    addMember({ groupId, name }) {
      assertGroup(groupId);
      if (selectMemberByName.get(groupId, name)) throw new DuplicateMemberError(name);
      const member: Member = {
        id: randomUUID(),
        groupId,
        name,
        createdAt: new Date().toISOString(),
      };
      insertMember.run(member.id, member.groupId, member.name, member.createdAt);
      return member;
    },

    listExpenses(groupId) {
      const sharesByExpense = new Map<string, ExpenseShare[]>();
      for (const share of selectShares.all(groupId) as ShareRow[]) {
        const list = sharesByExpense.get(share.expense_id) ?? [];
        list.push({ memberId: share.member_id, amountCents: share.amount_cents });
        sharesByExpense.set(share.expense_id, list);
      }

      return (selectExpenses.all(groupId) as ExpenseRow[]).map((row) => ({
        id: row.id,
        groupId: row.group_id,
        description: row.description,
        amountCents: row.amount_cents,
        paidBy: row.paid_by,
        spentOn: row.spent_on,
        createdAt: row.created_at,
        shares: sharesByExpense.get(row.id) ?? [],
      }));
    },

    addExpense(input) {
      assertExpenseInput(input);

      const expense: Expense = {
        id: randomUUID(),
        groupId: input.groupId,
        description: input.description,
        amountCents: input.amountCents,
        paidBy: input.paidBy,
        spentOn: input.spentOn,
        createdAt: new Date().toISOString(),
        shares: input.shares,
      };

      db.exec("BEGIN");
      try {
        insertExpense.run(
          expense.id,
          expense.groupId,
          expense.description,
          expense.amountCents,
          expense.paidBy,
          expense.spentOn,
          expense.createdAt,
        );
        for (const share of input.shares) {
          insertShare.run(expense.id, share.memberId, share.amountCents);
        }
        db.exec("COMMIT");
      } catch (error) {
        db.exec("ROLLBACK");
        throw error;
      }

      return expense;
    },

    getExpense(expenseId) {
      return readExpense(expenseId);
    },

    updateExpense(expenseId, input) {
      const existing = readExpense(expenseId);
      if (!existing || existing.groupId !== input.groupId) {
        throw new ExpenseNotFoundError(expenseId);
      }
      assertExpenseInput(input);

      db.exec("BEGIN");
      try {
        updateExpenseRow.run(
          input.description,
          input.amountCents,
          input.paidBy,
          input.spentOn,
          expenseId,
        );
        // Shares are replaced, never merged, so a correction cannot leave an old share behind.
        deleteSharesForExpense.run(expenseId);
        for (const share of input.shares) {
          insertShare.run(expenseId, share.memberId, share.amountCents);
        }
        db.exec("COMMIT");
      } catch (error) {
        db.exec("ROLLBACK");
        throw error;
      }

      const updated = readExpense(expenseId);
      if (!updated) throw new ExpenseNotFoundError(expenseId);
      return updated;
    },

    deleteExpense(expenseId) {
      if (!readExpense(expenseId)) throw new ExpenseNotFoundError(expenseId);
      // expense_shares rows go with the expense, through the foreign key cascade.
      deleteExpenseRow.run(expenseId);
    },

    deleteMember(memberId) {
      const row = selectMemberById.get(memberId) as MemberRow | undefined;
      if (!row) throw new UnknownMemberError(memberId);

      const counted = countMemberReferences.get(
        memberId,
        memberId,
        memberId,
        memberId,
      ) as { total: number };
      if (counted.total > 0) throw new MemberInUseError(row.name);

      deleteMemberRow.run(memberId);
    },

    listSettlements(groupId) {
      return (selectSettlements.all(groupId) as SettlementRow[]).map(toSettlement);
    },

    addSettlement(input) {
      assertGroup(input.groupId);
      const members = groupMemberIds(input.groupId);
      if (!members.has(input.fromMember)) throw new UnknownMemberError(input.fromMember);
      if (!members.has(input.toMember)) throw new UnknownMemberError(input.toMember);
      if (input.fromMember === input.toMember) {
        throw new Error("A payment needs two different people");
      }

      const settlement: Settlement = {
        id: randomUUID(),
        groupId: input.groupId,
        fromMember: input.fromMember,
        toMember: input.toMember,
        amountCents: input.amountCents,
        settledOn: input.settledOn,
        createdAt: new Date().toISOString(),
      };

      insertSettlement.run(
        settlement.id,
        settlement.groupId,
        settlement.fromMember,
        settlement.toMember,
        settlement.amountCents,
        settlement.settledOn,
        settlement.createdAt,
      );
      return settlement;
    },
  };
}

/** The app's repository, backed by the local database. */
let cachedRepository: Repository | undefined;

export function getRepository(): Repository {
  if (!cachedRepository) cachedRepository = createRepository(getDatabase());
  return cachedRepository;
}
