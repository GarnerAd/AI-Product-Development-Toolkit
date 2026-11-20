import { describe, expect, it } from "vitest";

import { splitEqually } from "@/lib/domain/split";

const sum = (shares: Map<string, number>) =>
  [...shares.values()].reduce((total, value) => total + value, 0);

describe("splitEqually", () => {
  it("splits evenly when the amount divides cleanly", () => {
    expect([...splitEqually(1000, ["a", "b"]).values()]).toEqual([500, 500]);
  });

  it("gives the remainder cents to the first people and still adds up", () => {
    const shares = splitEqually(1000, ["a", "b", "c"]);
    expect([...shares]).toEqual([
      ["a", 334],
      ["b", 333],
      ["c", 333],
    ]);
    expect(sum(shares)).toBe(1000);
  });

  it("handles amounts smaller than the number of people", () => {
    const shares = splitEqually(2, ["a", "b", "c"]);
    expect([...shares]).toEqual([
      ["a", 1],
      ["b", 1],
      ["c", 0],
    ]);
    expect(sum(shares)).toBe(2);
  });

  it("refuses amounts that are not positive whole cents", () => {
    expect(() => splitEqually(0, ["a"])).toThrow(/positive/);
    expect(() => splitEqually(-100, ["a"])).toThrow(/positive/);
    expect(() => splitEqually(10.5, ["a"])).toThrow(/positive/);
  });

  it("refuses an empty or duplicated participant list", () => {
    expect(() => splitEqually(100, [])).toThrow(/participant/);
    expect(() => splitEqually(100, ["a", "a"])).toThrow(/unique/);
  });
});
