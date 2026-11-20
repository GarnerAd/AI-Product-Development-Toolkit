import { describe, expect, it } from "vitest";

import { validateExpense, validateGroup, validateMember, validateSettlement } from "@/lib/validation";

const members = ["ana", "ben", "chloe"];

describe("validateGroup", () => {
  it("trims the name and keeps a supported currency", () => {
    expect(validateGroup({ name: "  Flat   3 ", currency: "EUR" })).toEqual({
      ok: true,
      value: { name: "Flat 3", currency: "EUR" },
    });
  });

  it("refuses an empty or overlong name", () => {
    expect(validateGroup({ name: "   ", currency: "EUR" })).toEqual({
      ok: false,
      errors: { name: "Give the group a name." },
    });

    const long = validateGroup({ name: "x".repeat(61), currency: "EUR" });
    expect(long.ok).toBe(false);
    expect(long.ok === false && long.errors.name).toMatch(/60 characters/);
  });

  it("refuses a currency outside the fixed list", () => {
    const result = validateGroup({ name: "Trip", currency: "XYZ" });
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.errors.currency).toMatch(/Choose a currency/);
  });
});

describe("validateMember", () => {
  it("accepts a name", () => {
    expect(validateMember({ name: " Ana " })).toEqual({ ok: true, value: { name: "Ana" } });
  });

  it("refuses an empty name", () => {
    expect(validateMember({ name: "" })).toEqual({
      ok: false,
      errors: { name: "Enter the person's name." },
    });
  });
});

describe("validateExpense", () => {
  const base = {
    description: "Electricity",
    amount: "61.00",
    paidBy: "ana",
    spentOn: "2026-11-20",
    participants: ["ana", "ben"],
    groupMemberIds: members,
  };

  it("accepts a complete expense and converts the amount to cents", () => {
    expect(validateExpense(base)).toEqual({
      ok: true,
      value: {
        description: "Electricity",
        amountCents: 6100,
        paidBy: "ana",
        spentOn: "2026-11-20",
        participantIds: ["ana", "ben"],
      },
    });
  });

  it("needs a description and a positive amount", () => {
    const result = validateExpense({ ...base, description: " ", amount: "0" });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.description).toMatch(/what the expense was for/);
    expect(result.errors.amount).toMatch(/greater than zero/);
  });

  it("refuses a payer from another group", () => {
    const result = validateExpense({ ...base, paidBy: "someone-else" });
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.errors.paidBy).toMatch(/in this group/);
  });

  it("needs at least one participant, all from this group", () => {
    const none = validateExpense({ ...base, participants: [] });
    expect(none.ok === false && none.errors.participants).toMatch(/at least one person/);

    const outsider = validateExpense({ ...base, participants: ["ana", "outsider"] });
    expect(outsider.ok === false && outsider.errors.participants).toMatch(/must be in this group/);
  });

  it("refuses an impossible date", () => {
    const result = validateExpense({ ...base, spentOn: "2026-02-30" });
    expect(result.ok === false && result.errors.spentOn).toMatch(/valid date/);
  });

  it("removes repeated participants, so nobody is charged twice", () => {
    const result = validateExpense({ ...base, participants: ["ana", "ana", "ben"] });
    expect(result.ok && result.value.participantIds).toEqual(["ana", "ben"]);
  });
});

describe("validateSettlement", () => {
  const base = {
    fromMember: "ben",
    toMember: "ana",
    amount: "10",
    settledOn: "2026-11-20",
    groupMemberIds: members,
  };

  it("accepts a payment between two members", () => {
    expect(validateSettlement(base)).toEqual({
      ok: true,
      value: { fromMember: "ben", toMember: "ana", amountCents: 1000, settledOn: "2026-11-20" },
    });
  });

  it("refuses a payment to the same person", () => {
    const result = validateSettlement({ ...base, toMember: "ben" });
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.errors.toMember).toMatch(/two different people/);
  });

  it("refuses someone outside the group and a bad amount", () => {
    const result = validateSettlement({ ...base, fromMember: "outsider", amount: "0" });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.fromMember).toMatch(/in this group/);
    expect(result.errors.amount).toMatch(/greater than zero/);
  });
});
