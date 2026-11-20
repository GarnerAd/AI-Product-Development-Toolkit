import { beforeEach, describe, expect, it, vi } from "vitest";

const holder = vi.hoisted(() => ({ repository: null as unknown }));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  },
}));
vi.mock("@/lib/db/repository", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/db/repository")>();
  return { ...actual, getRepository: () => holder.repository };
});

import {
  INITIAL_FORM_STATE,
  addExpenseAction,
  addMemberAction,
  createGroupAction,
  deleteExpenseAction,
  recordPaymentAction,
  removeMemberAction,
  updateExpenseAction,
} from "@/app/actions";
import { createDatabase } from "@/lib/db/client";
import { createRepository, type Repository } from "@/lib/db/repository";
import { computeBalances } from "@/lib/domain/balances";

let repository: Repository;

const form = (fields: Record<string, string | string[]>) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    if (Array.isArray(value)) value.forEach((item) => data.append(key, item));
    else data.set(key, value);
  }
  return data;
};

beforeEach(() => {
  repository = createRepository(createDatabase(":memory:"));
  holder.repository = repository;
});

function seedGroupWithPeople(names: string[]) {
  const group = repository.createGroup({ name: "Flat 3", currency: "EUR" });
  const members = names.map((name) => repository.addMember({ groupId: group.id, name }));
  return { group, members };
}

describe("createGroupAction", () => {
  it("saves the group and opens it", async () => {
    await expect(
      createGroupAction(INITIAL_FORM_STATE, form({ name: " Lisbon trip ", currency: "EUR" })),
    ).rejects.toThrow(/NEXT_REDIRECT:\/groups\/.+/);

    const groups = repository.listGroups();
    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({ name: "Lisbon trip", currency: "EUR" });
  });

  it("returns field errors and saves nothing when the name is missing", async () => {
    const state = await createGroupAction(INITIAL_FORM_STATE, form({ name: "", currency: "EUR" }));

    expect(state.status).toBe("error");
    expect(state.errors?.name).toMatch(/Give the group a name/);
    expect(repository.listGroups()).toHaveLength(0);
  });
});

describe("addMemberAction", () => {
  it("adds a person and says so", async () => {
    const { group } = seedGroupWithPeople([]);

    const state = await addMemberAction(INITIAL_FORM_STATE, form({ groupId: group.id, name: "Ana" }));

    expect(state).toEqual({ status: "success", message: "Added Ana." });
    expect(repository.listMembers(group.id).map((member) => member.name)).toEqual(["Ana"]);
  });

  it("explains a duplicate instead of throwing", async () => {
    const { group } = seedGroupWithPeople(["Ana"]);

    const state = await addMemberAction(INITIAL_FORM_STATE, form({ groupId: group.id, name: "ana" }));

    expect(state.status).toBe("error");
    expect(state.message).toMatch(/already in this group/);
    expect(repository.listMembers(group.id)).toHaveLength(1);
  });
});


describe("addExpenseAction", () => {
  it("splits the amount and stores one share per participant", async () => {
    const { group, members } = seedGroupWithPeople(["Ana", "Ben", "Chloé"]);
    const [ana, ben, chloe] = members;

    const state = await addExpenseAction(
      INITIAL_FORM_STATE,
      form({
        groupId: group.id,
        description: "Groceries",
        amount: "100.00",
        paidBy: ana.id,
        spentOn: "2026-11-20",
        participants: [ana.id, ben.id, chloe.id],
      }),
    );

    expect(state.status).toBe("success");
    const [expense] = repository.listExpenses(group.id);
    expect(expense.amountCents).toBe(10000);
    expect(expense.shares.map((share) => share.amountCents).sort()).toEqual([3333, 3333, 3334]);

    const balances = computeBalances(
      members.map((member) => member.id),
      repository.listExpenses(group.id),
    );
    expect(balances.reduce((sum, balance) => sum + balance.netCents, 0)).toBe(0);
  });

  it("refuses a zero amount and stores nothing", async () => {
    const { group, members } = seedGroupWithPeople(["Ana", "Ben"]);
    const [ana, ben] = members;

    const state = await addExpenseAction(
      INITIAL_FORM_STATE,
      form({
        groupId: group.id,
        description: "Nothing",
        amount: "0",
        paidBy: ana.id,
        spentOn: "2026-11-20",
        participants: [ben.id],
      }),
    );

    expect(state.status).toBe("error");
    expect(state.errors?.amount).toMatch(/greater than zero/);
    expect(repository.listExpenses(group.id)).toHaveLength(0);
  });

  it("refuses a participant who is not in the group", async () => {
    const { group, members } = seedGroupWithPeople(["Ana"]);
    const [ana] = members;
    const other = repository.createGroup({ name: "Other", currency: "EUR" });
    const outsider = repository.addMember({ groupId: other.id, name: "Outsider" });

    const state = await addExpenseAction(
      INITIAL_FORM_STATE,
      form({
        groupId: group.id,
        description: "Sneaky",
        amount: "10",
        paidBy: ana.id,
        spentOn: "2026-11-20",
        participants: [outsider.id],
      }),
    );

    expect(state.status).toBe("error");
    expect(state.errors?.participants).toMatch(/must be in this group/);
  });
});

describe("recordPaymentAction", () => {
  it("clears a balance when the payment is recorded", async () => {
    const { group, members } = seedGroupWithPeople(["Ana", "Ben"]);
    const [ana, ben] = members;

    repository.addExpense({
      groupId: group.id,
      description: "Dinner",
      amountCents: 2000,
      paidBy: ana.id,
      spentOn: "2026-11-20",
      shares: [
        { memberId: ana.id, amountCents: 1000 },
        { memberId: ben.id, amountCents: 1000 },
      ],
    });

    const state = await recordPaymentAction(
      INITIAL_FORM_STATE,
      form({
        groupId: group.id,
        fromMember: ben.id,
        toMember: ana.id,
        amount: "10.00",
        settledOn: "2026-11-20",
      }),
    );

    expect(state).toEqual({ status: "success", message: "Payment recorded." });

    const balances = computeBalances(
      members.map((member) => member.id),
      repository.listExpenses(group.id),
      repository.listSettlements(group.id),
    );
    expect(balances.every((balance) => balance.netCents === 0)).toBe(true);
  });

  it("refuses a payment to the same person", async () => {
    const { group, members } = seedGroupWithPeople(["Ana", "Ben"]);
    const [ana] = members;

    const state = await recordPaymentAction(
      INITIAL_FORM_STATE,
      form({
        groupId: group.id,
        fromMember: ana.id,
        toMember: ana.id,
        amount: "5",
        settledOn: "2026-11-20",
      }),
    );

    expect(state.status).toBe("error");
    expect(state.errors?.toMember).toMatch(/two different people/);
    expect(repository.listSettlements(group.id)).toHaveLength(0);
  });
});

describe("updateExpenseAction", () => {
  const seedDinner = () => {
    const { group, members } = seedGroupWithPeople(["Ana", "Ben"]);
    const [ana, ben] = members;
    const expense = repository.addExpense({
      groupId: group.id,
      description: "Dinner",
      amountCents: 2000,
      paidBy: ana.id,
      spentOn: "2026-11-20",
      shares: [
        { memberId: ana.id, amountCents: 1000 },
        { memberId: ben.id, amountCents: 1000 },
      ],
    });
    return { group, ana, ben, expense };
  };

  it("corrects the expense and replaces its shares", async () => {
    const { group, ana, ben, expense } = seedDinner();

    const state = await updateExpenseAction(
      INITIAL_FORM_STATE,
      form({
        groupId: group.id,
        expenseId: expense.id,
        description: "Dinner, corrected",
        amount: "30.00",
        paidBy: ben.id,
        spentOn: "2026-11-21",
        participants: [ana.id, ben.id],
      }),
    );

    expect(state).toEqual({
      status: "success",
      message: "Expense updated: Dinner, corrected.",
    });

    const stored = repository.getExpense(expense.id);
    expect(stored).toMatchObject({
      description: "Dinner, corrected",
      amountCents: 3000,
      paidBy: ben.id,
      spentOn: "2026-11-21",
    });
    expect(stored?.shares.reduce((sum, share) => sum + share.amountCents, 0)).toBe(3000);
  });

  it("keeps the old values when the correction is refused", async () => {
    const { group, ana, ben, expense } = seedDinner();

    const state = await updateExpenseAction(
      INITIAL_FORM_STATE,
      form({
        groupId: group.id,
        expenseId: expense.id,
        description: "Dinner",
        amount: "0",
        paidBy: ana.id,
        spentOn: "2026-11-20",
        participants: [ana.id, ben.id],
      }),
    );

    expect(state.status).toBe("error");
    expect(state.errors?.amount).toMatch(/greater than zero/);
    expect(repository.getExpense(expense.id)).toMatchObject({
      amountCents: 2000,
      description: "Dinner",
    });
  });
});

describe("deleteExpenseAction", () => {
  it("deletes the expense and returns to the group with a notice", async () => {
    const { group, members } = seedGroupWithPeople(["Ana"]);
    const [ana] = members;
    const expense = repository.addExpense({
      groupId: group.id,
      description: "Wrong entry",
      amountCents: 900,
      paidBy: ana.id,
      spentOn: "2026-11-20",
      shares: [{ memberId: ana.id, amountCents: 900 }],
    });

    await expect(
      deleteExpenseAction(
        INITIAL_FORM_STATE,
        form({ groupId: group.id, expenseId: expense.id }),
      ),
    ).rejects.toThrow(/NEXT_REDIRECT:\/groups\/.+\?notice=expense-deleted/);

    expect(repository.listExpenses(group.id)).toHaveLength(0);
  });
});

describe("removeMemberAction", () => {
  it("removes a person who has no records", async () => {
    const { group } = seedGroupWithPeople(["Ana"]);
    const extra = repository.addMember({ groupId: group.id, name: "Cy" });

    const state = await removeMemberAction(
      INITIAL_FORM_STATE,
      form({ groupId: group.id, memberId: extra.id }),
    );

    expect(state).toEqual({ status: "success", message: "Person removed." });
    expect(repository.listMembers(group.id).map((member) => member.name)).toEqual(["Ana"]);
  });

  it("keeps a person who is in an expense and explains why", async () => {
    const { group, members } = seedGroupWithPeople(["Ana"]);
    const [ana] = members;

    repository.addExpense({
      groupId: group.id,
      description: "Dinner",
      amountCents: 500,
      paidBy: ana.id,
      spentOn: "2026-11-20",
      shares: [{ memberId: ana.id, amountCents: 500 }],
    });

    const state = await removeMemberAction(
      INITIAL_FORM_STATE,
      form({ groupId: group.id, memberId: ana.id }),
    );

    expect(state.status).toBe("error");
    expect(state.message).toMatch(/has expenses or payments/);
    expect(repository.listMembers(group.id)).toHaveLength(1);
  });
});

