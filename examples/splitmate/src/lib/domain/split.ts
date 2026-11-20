/**
 * Splits an amount equally between participants, in whole cents.
 * Remainder cents go to the first participants in the given order, so the
 * shares always add up to the amount exactly.
 */
export function splitEqually(
  amountCents: number,
  memberIds: string[],
): Map<string, number> {
  if (!Number.isInteger(amountCents) || amountCents <= 0) {
    throw new Error("Amount must be a positive whole number of cents");
  }
  if (memberIds.length === 0) {
    throw new Error("At least one participant is required");
  }
  if (new Set(memberIds).size !== memberIds.length) {
    throw new Error("Participants must be unique");
  }

  const base = Math.floor(amountCents / memberIds.length);
  const remainder = amountCents - base * memberIds.length;

  return new Map(
    memberIds.map((memberId, index) => [
      memberId,
      base + (index < remainder ? 1 : 0),
    ]),
  );
}
