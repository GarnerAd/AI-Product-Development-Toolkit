/** Money helpers. Amounts are integer cents everywhere outside the database's text columns. */

export const CURRENCIES = [
  "USD",
  "EUR",
  "GBP",
  "CAD",
  "AUD",
  "CHF",
  "SEK",
  "PLN",
  "INR",
  "JPY",
] as const;

export type Currency = (typeof CURRENCIES)[number];

export const DEFAULT_CURRENCY: Currency = "USD";

export function isCurrency(value: string): value is Currency {
  return (CURRENCIES as readonly string[]).includes(value);
}

/** Formats integer cents in the given currency, independent of the browser's locale. */
export function formatCents(cents: number, currency: string): string {
  const safeCurrency = isCurrency(currency) ? currency : DEFAULT_CURRENCY;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: safeCurrency,
  }).format(cents / 100);
}

/**
 * Reads a human amount ("12", "12.5", "1,234.56", "€9.99") into integer cents.
 * Returns null when the text is not a positive amount with at most two decimals.
 */
export function parseAmountToCents(input: string): number | null {
  const cleaned = input
    .trim()
    .replace(/^[^\d.,-]+/u, "")
    .replace(/,/g, "");
  if (!/^\d{1,9}(\.\d{1,2})?$/.test(cleaned)) return null;
  const value = Number.parseFloat(cleaned);
  if (!Number.isFinite(value) || value <= 0) return null;
  const cents = Math.round(value * 100);
  if (cents <= 0 || cents > 999_999_999) return null;
  return cents;
}

/** Today's date as YYYY-MM-DD in local time, the default for a new expense. */
export function todayIso(now: Date = new Date()): string {
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** True for a real calendar date in YYYY-MM-DD form. */
export function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

/** Short, readable date for lists: 20 Nov 2026. */
export function formatDate(isoDate: string): string {
  if (!isIsoDate(isoDate)) return isoDate;
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}
