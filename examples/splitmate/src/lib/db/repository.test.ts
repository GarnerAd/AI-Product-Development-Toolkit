import type { DatabaseSync } from "node:sqlite";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createDatabase } from "@/lib/db/client";
import { DuplicateMemberError, ExpenseNotFoundError, MemberInUseError, UnknownMemberError } from "@/lib/db/errors";
import { createRepository, type Repository } from "@/lib/db/repository";

let db: DatabaseSync;
let repository: Repository;
let groupId: string;

const makeGroup = () => repository.createGroup({ name: "Flat 3", currency: "EUR" });

beforeEach(() => {
  db = createDatabase(":memory:");
  repository = createRepository(db);
  groupId = makeGroup().id;
});

afterEach(() => {
  db.close();
});

describe("groups", () => {
  it("creates, reads and lists groups", () => {
    const group = makeGroup();
    expect(group.currency).toBe("EUR");
    expect(repository.getGroup(group.id)?.name).toBe("Flat 3");
    expect(repository.listGroups()).toHaveLength(2);
  });

  it("returns null for an unknown group", () => {
    expect(repository.getGroup("nope")).toBeNull();
  });

  it("summarises member count, expense count and total", () => {
    const ana = repository.addMember({ groupId, name: "Ana" });
    repository.addExpense({
      groupId,
      description: "Groceries",
      amountCents: 2000,
      paidBy: ana.id,
      spentOn: "2026-11-20",
      shares: [{ memberId: ana.id, amountCents: 2000 }],
    });

    const summary = repository.listGroups().find((group) => group.id === groupId);
    expect(summary).toMatchObject({ memberCount: 1, expenseCount: 1, totalCents: 2000 });
  });
});

describe("members", () => {
  it("adds people in order", () => {
    repository.addMember({ groupId, name: "Ana" });
    repository.addMember({ groupId, name: "Ben" });
    expect(repository.listMembers(groupId).map((member) => member.name)).toEqual(["Ana", "Ben"]);
  });

  it("refuses the same name twice, ignoring case", () => {
    repository.addMember({ groupId, name: "Ana" });
    expect(() => repository.addMember({ groupId, name: "ANA" })).toThrow(DuplicateMemberError);
  });

  it("keeps groups separate", () => {
    const other = makeGroup();
    repository.addMember({ groupId, name: "Ana" });
    expect(repository.listMembers(other.id)).toHaveLength(0);
  });

  it("refuses a member for a group that does not exist", () => {
    expect(() => repository.addMember({ groupId: "missing", name: "Ana" })).toThrow(
      /does not exist/,
    );
  });
});


describe("expenses", () => {
  it("stores an expense with its shares", () => {
    const ana = repository.addMember({ groupId, name: "Ana" });
    const ben = repository.addMember({ groupId, name: "Ben" });

    const expense = repository.addExpense({
      groupId,
      description: "Wifi",
      amountCents: 3000,
      paidBy: ana.id,
      spentOn: "2026-11-18",
      shares: [
        { memberId: ana.id, amountCents: 1500 },
        { memberId: ben.id, amountCents: 1500 },
      ],
    });

    expect(expense.id).toBeTruthy();
    const stored = repository.listExpenses(groupId);
    expect(stored).toHaveLength(1);
    expect(stored[0].description).toBe("Wifi");
    expect(stored[0].shares.reduce((sum, share) => sum + share.amountCents, 0)).toBe(3000);
  });

  it("lists newest first by the date spent", () => {
    const ana = repository.addMember({ groupId, name: "Ana" });
    for (const [description, spentOn] of [
      ["Older", "2026-11-01"],
      ["Newer", "2026-11-19"],
      ["Middle", "2026-11-10"],
    ]) {
      repository.addExpense({
        groupId,
        description,
        amountCents: 100,
        paidBy: ana.id,
        spentOn,
        shares: [{ memberId: ana.id, amountCents: 100 }],
      });
    }
    expect(repository.listExpenses(groupId).map((expense) => expense.description)).toEqual([
      "Newer",
      "Middle",
      "Older",
    ]);
  });

  it("refuses shares that do not add up to the amount", () => {
    const ana = repository.addMember({ groupId, name: "Ana" });
    expect(() =>
      repository.addExpense({
        groupId,
        description: "Broken",
        amountCents: 1000,
        paidBy: ana.id,
        spentOn: "2026-11-20",
        shares: [{ memberId: ana.id, amountCents: 999 }],
      }),
    ).toThrow(/add up/);
    expect(repository.listExpenses(groupId)).toHaveLength(0);
  });
});

describe("settlements", () => {
  it("stores payments between members", () => {
    const ana = repository.addMember({ groupId, name: "Ana" });
    const ben = repository.addMember({ groupId, name: "Ben" });

    repository.addSettlement({
      groupId,
      fromMember: ben.id,
      toMember: ana.id,
      amountCents: 500,
      settledOn: "2026-11-20",
    });

    const settlements = repository.listSettlements(groupId);
    expect(settlements).toHaveLength(1);
    expect(settlements[0]).toMatchObject({ amountCents: 500, fromMember: ben.id });
  });

  it("refuses a payment involving someone outside the group", () => {
    const ana = repository.addMember({ groupId, name: "Ana" });
    const other = makeGroup();
    const outsider = repository.addMember({ groupId: other.id, name: "Outsider" });

    expect(() =>
      repository.addSettlement({
        groupId,
        fromMember: outsider.id,
        toMember: ana.id,
        amountCents: 500,
        settledOn: "2026-11-20",
      }),
    ).toThrow(UnknownMemberError);
  });
});

describe("correcting records", () => {
  const seedExpense = () => {
    const ana = repository.addMember({ groupId, name: "Ana" });
    const ben = repository.addMember({ groupId, name: "Ben" });
    const expense = repository.addExpense({
      groupId,
      description: "Dinner",
      amountCents: 2000,
      paidBy: ana.id,
      spentOn: "2026-11-20",
      shares: [
        { memberId: ana.id, amountCents: 1000 },
        { memberId: ben.id, amountCents: 1000 },
      ],
    });
    return { ana, ben, expense };
  };

  it("reads one expense with its shares", () => {
    const { expense } = seedExpense();
    const stored = repository.getExpense(expense.id);
    expect(stored).toMatchObject({ description: "Dinner", amountCents: 2000 });
    expect(stored?.shares).toHaveLength(2);
    expect(repository.getExpense("nope")).toBeNull();
  });

  it("replaces the shares instead of adding to them", () => {
    const { ana, ben, expense } = seedExpense();

    const updated = repository.updateExpense(expense.id, {
      groupId,
      description: "Dinner, corrected",
      amountCents: 3000,
      paidBy: ben.id,
      spentOn: "2026-11-21",
      shares: [
        { memberId: ana.id, amountCents: 1500 },
        { memberId: ben.id, amountCents: 1500 },
      ],
    });

    expect(updated).toMatchObject({
      description: "Dinner, corrected",
      amountCents: 3000,
      paidBy: ben.id,
      spentOn: "2026-11-21",
    });
    const stored = repository.getExpense(expense.id);
    expect(stored?.shares).toHaveLength(2);
    expect(stored?.shares.reduce((sum, share) => sum + share.amountCents, 0)).toBe(3000);
    expect(repository.listGroups().find((group) => group.id === groupId)?.totalCents).toBe(3000);
  });

  it("refuses a correction whose shares do not add up, keeping the old values", () => {
    const { ana, ben, expense } = seedExpense();

    expect(() =>
      repository.updateExpense(expense.id, {
        groupId,
        description: "Broken",
        amountCents: 3000,
        paidBy: ana.id,
        spentOn: "2026-11-21",
        shares: [
          { memberId: ana.id, amountCents: 1500 },
          { memberId: ben.id, amountCents: 1400 },
        ],
      }),
    ).toThrow(/add up/);

    expect(repository.getExpense(expense.id)).toMatchObject({ description: "Dinner" });
  });

  it("refuses to touch an expense that belongs to another group", () => {
    const { ana, expense } = seedExpense();
    const other = makeGroup();

    expect(() =>
      repository.updateExpense(expense.id, {
        groupId: other.id,
        description: "Hijacked",
        amountCents: 100,
        paidBy: ana.id,
        spentOn: "2026-11-20",
        shares: [{ memberId: ana.id, amountCents: 100 }],
      }),
    ).toThrow(ExpenseNotFoundError);

    expect(repository.getExpense(expense.id)).toMatchObject({ description: "Dinner" });
  });

  it("deletes an expense and takes its shares and total with it", () => {
    const { expense } = seedExpense();

    repository.deleteExpense(expense.id);

    expect(repository.getExpense(expense.id)).toBeNull();
    expect(repository.listExpenses(groupId)).toHaveLength(0);
    expect(repository.listGroups().find((group) => group.id === groupId)).toMatchObject({
      expenseCount: 0,
      totalCents: 0,
    });
    expect(() => repository.deleteExpense(expense.id)).toThrow(ExpenseNotFoundError);
  });

  it("removes a person who has no expenses or payments", () => {
    const extra = repository.addMember({ groupId, name: "Cy" });

    repository.deleteMember(extra.id);

    expect(repository.listMembers(groupId).map((member) => member.name)).toEqual([]);
  });

  it("refuses to remove a person who is in an expense", () => {
    const { ana } = seedExpense();

    expect(() => repository.deleteMember(ana.id)).toThrow(MemberInUseError);
    expect(repository.listMembers(groupId).map((member) => member.name)).toEqual(["Ana", "Ben"]);
  });

  it("refuses to remove a person named in a payment", () => {
    const ana = repository.addMember({ groupId, name: "Ana" });
    const ben = repository.addMember({ groupId, name: "Ben" });
    repository.addSettlement({
      groupId,
      fromMember: ben.id,
      toMember: ana.id,
      amountCents: 500,
      settledOn: "2026-11-20",
    });

    expect(() => repository.deleteMember(ben.id)).toThrow(MemberInUseError);
    expect(repository.listMembers(groupId)).toHaveLength(2);
  });
});

