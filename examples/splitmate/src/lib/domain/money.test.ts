import { describe, expect, it } from "vitest";

import {
  formatCents,
  formatDate,
  isIsoDate,
  parseAmountToCents,
  todayIso,
} from "@/lib/domain/money";

describe("parseAmountToCents", () => {
  it("reads plain amounts", () => {
    expect(parseAmountToCents("12")).toBe(1200);
    expect(parseAmountToCents("12.5")).toBe(1250);
    expect(parseAmountToCents("12.50")).toBe(1250);
    expect(parseAmountToCents(" 0.01 ")).toBe(1);
  });

  it("ignores thousands separators and currency symbols", () => {
    expect(parseAmountToCents("1,234.56")).toBe(123456);
    expect(parseAmountToCents("€9.99")).toBe(999);
  });

  it("refuses zero, negatives, extra decimals and junk", () => {
    expect(parseAmountToCents("0")).toBeNull();
    expect(parseAmountToCents("0.00")).toBeNull();
    expect(parseAmountToCents("-5")).toBeNull();
    expect(parseAmountToCents("12.345")).toBeNull();
    expect(parseAmountToCents("abc")).toBeNull();
    expect(parseAmountToCents("")).toBeNull();
    expect(parseAmountToCents("1.2.3")).toBeNull();
  });

  it("refuses amounts too large to be a shared bill", () => {
    expect(parseAmountToCents("10000000")).toBeNull();
  });
});

describe("formatCents", () => {
  it("uses the group's currency, not the machine's locale", () => {
    expect(formatCents(6100, "EUR")).toBe("€61.00");
    expect(formatCents(1000, "USD")).toBe("$10.00");
    expect(formatCents(0, "GBP")).toBe("£0.00");
  });

  it("falls back to USD for an unknown currency instead of throwing", () => {
    expect(formatCents(500, "not-a-currency")).toBe("$5.00");
  });
});

describe("dates", () => {
  it("writes today in local time", () => {
    expect(todayIso(new Date(2026, 10, 20, 23, 30))).toBe("2026-11-20");
  });

  it("accepts real calendar dates only", () => {
    expect(isIsoDate("2026-11-20")).toBe(true);
    expect(isIsoDate("2024-02-29")).toBe(true);
    expect(isIsoDate("2026-02-29")).toBe(false);
    expect(isIsoDate("2026-13-01")).toBe(false);
    expect(isIsoDate("20-11-2026")).toBe(false);
  });

  it("shows dates in a short readable form", () => {
    expect(formatDate("2026-11-20")).toBe("20 Nov 2026");
    expect(formatDate("not a date")).toBe("not a date");
  });
});
