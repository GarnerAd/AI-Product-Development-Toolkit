import { describe, expect, it } from "vitest";

import {
  computeBalances,
  describeBalance,
  simplifyDebts,
  totalSpentCents,
} from "@/lib/domain/balances";

const net = (balances: ReturnType<typeof computeBalances>) =>
  Object.fromEntries(balances.map((balance) => [balance.memberId, balance.netCents]));

describe("computeBalances", () => {
  it("gives the payer credit and each participant their share as debt", () => {
    const balances = computeBalances(
      ["ana", "ben"],
      [{ paidBy: "ana", shares: [
        { memberId: "ana", amountCents: 1000 },
        { memberId: "ben", amountCents: 1000 },
      ] }],
    );
    expect(net(balances)).toEqual({ ana: 1000, ben: -1000 });
  });

  it("always sums to zero, which is the check shown on the page", () => {
    const balances = computeBalances(
      ["ana", "ben", "chloe"],
      [
        { paidBy: "ana", shares: [
          { memberId: "ana", amountCents: 334 },
          { memberId: "ben", amountCents: 333 },
          { memberId: "chloe", amountCents: 333 },
        ] },
        { paidBy: "ben", shares: [
          { memberId: "ana", amountCents: 2500 },
          { memberId: "ben", amountCents: 2500 },
        ] },
      ],
    );
    const total = balances.reduce((sum, balance) => sum + balance.netCents, 0);
    expect(total).toBe(0);
  });

  it("lists members with no activity as settled", () => {
    expect(net(computeBalances(["ana", "new"], []))).toEqual({ ana: 0, new: 0 });
  });

  it("reduces what the payer owes when a payment comes back", () => {
    const balances = computeBalances(
      ["ana", "ben"],
      [{ paidBy: "ana", shares: [
        { memberId: "ana", amountCents: 1000 },
        { memberId: "ben", amountCents: 1000 },
      ] }],
      [{ fromMember: "ben", toMember: "ana", amountCents: 400 }],
    );
    expect(net(balances)).toEqual({ ana: 600, ben: -600 });
  });

  it("counts a payment in the other direction as a new debt", () => {
    const balances = computeBalances(
      ["ana", "ben"],
      [],
      [{ fromMember: "ben", toMember: "ana", amountCents: 250 }],
    );
    expect(net(balances)).toEqual({ ana: -250, ben: 250 });
  });
});

describe("simplifyDebts", () => {
  it("produces one payment for a simple two-person debt", () => {
    expect(simplifyDebts([
      { memberId: "ana", netCents: 1000 },
      { memberId: "ben", netCents: -1000 },
    ])).toEqual([{ fromMember: "ben", toMember: "ana", amountCents: 1000 }]);
  });

  it("clears many people with fewer payments than people", () => {
    const balances = [
      { memberId: "ana", netCents: 1500 },
      { memberId: "ben", netCents: -500 },
      { memberId: "chloe", netCents: -1000 },
    ];
    const transfers = simplifyDebts(balances);

    expect(transfers).toHaveLength(2);
    expect(transfers.every((transfer) => transfer.amountCents > 0)).toBe(true);

    const settled = new Map(balances.map((balance) => [balance.memberId, balance.netCents]));
    for (const transfer of transfers) {
      settled.set(transfer.fromMember, (settled.get(transfer.fromMember) ?? 0) + transfer.amountCents);
      settled.set(transfer.toMember, (settled.get(transfer.toMember) ?? 0) - transfer.amountCents);
    }
    expect([...settled.values()].every((value) => value === 0)).toBe(true);
  });

  it("returns nothing when everyone is settled", () => {
    expect(simplifyDebts([
      { memberId: "ana", netCents: 0 },
      { memberId: "ben", netCents: 0 },
    ])).toEqual([]);
  });

  it("never asks for a payment larger than a debt or a credit", () => {
    const transfers = simplifyDebts([
      { memberId: "a", netCents: 300 },
      { memberId: "b", netCents: 700 },
      { memberId: "c", netCents: -1000 },
    ]);
    const paid = new Map<string, number>();
    for (const transfer of transfers) {
      paid.set(transfer.fromMember, (paid.get(transfer.fromMember) ?? 0) + transfer.amountCents);
    }
    expect(paid.get("c")).toBe(1000);
  });
});

describe("presentation helpers", () => {
  it("counts the money in a group", () => {
    expect(totalSpentCents([
      { paidBy: "ana", shares: [{ memberId: "ana", amountCents: 1500 }, { memberId: "ben", amountCents: 500 }] },
      { paidBy: "ben", shares: [{ memberId: "ana", amountCents: 200 }] },
    ])).toBe(2200);
  });

  it("writes balances as sentences", () => {
    const format = (cents: number) => `€${(cents / 100).toFixed(2)}`;
    expect(describeBalance(1000, "Ana", format)).toBe("Ana is owed €10.00");
    expect(describeBalance(-1250, "Ben", format)).toBe("Ben owes €12.50");
    expect(describeBalance(0, "Chloé", format)).toBe("Chloé is settled up");
  });
});
