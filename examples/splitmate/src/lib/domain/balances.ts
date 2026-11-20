/** Net positions and the shortest set of payments that clears them. */

export type BalanceExpense = {
  paidBy: string;
  shares: { memberId: string; amountCents: number }[];
};

export type BalanceSettlement = {
  fromMember: string;
  toMember: string;
  amountCents: number;
};

export type Balance = {
  memberId: string;
  /** Positive: the group owes this member. Negative: the member owes the group. */
  netCents: number;
};

export type Transfer = {
  fromMember: string;
  toMember: string;
  amountCents: number;
};

/**
 * Paid minus owed, adjusted by recorded payments, for every member given.
 * Members with no activity are included with zero, so the whole group is listed.
 */
export function computeBalances(
  memberIds: string[],
  expenses: BalanceExpense[],
  settlements: BalanceSettlement[] = [],
): Balance[] {
  const net = new Map<string, number>(memberIds.map((id) => [id, 0]));

  const move = (memberId: string, cents: number) => {
    net.set(memberId, (net.get(memberId) ?? 0) + cents);
  };

  for (const expense of expenses) {
    const total = expense.shares.reduce((sum, share) => sum + share.amountCents, 0);
    move(expense.paidBy, total);
    for (const share of expense.shares) {
      move(share.memberId, -share.amountCents);
    }
  }

  for (const settlement of settlements) {
    move(settlement.fromMember, settlement.amountCents);
    move(settlement.toMember, -settlement.amountCents);
  }

  return memberIds.map((memberId) => ({
    memberId,
    netCents: net.get(memberId) ?? 0,
  }));
}

/**
 * Fewest-arithmetic settlement: repeatedly match the largest debtor with the
 * largest creditor. Produces at most (non-zero members - 1) transfers.
 */
export function simplifyDebts(balances: Balance[]): Transfer[] {
  const creditors = balances
    .filter((balance) => balance.netCents > 0)
    .map((balance) => ({ ...balance }))
    .sort((a, b) => b.netCents - a.netCents || a.memberId.localeCompare(b.memberId));

  const debtors = balances
    .filter((balance) => balance.netCents < 0)
    .map((balance) => ({ memberId: balance.memberId, netCents: -balance.netCents }))
    .sort((a, b) => b.netCents - a.netCents || a.memberId.localeCompare(b.memberId));

  const transfers: Transfer[] = [];
  let debtorIndex = 0;
  let creditorIndex = 0;

  while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
    const debtor = debtors[debtorIndex];
    const creditor = creditors[creditorIndex];
    const amountCents = Math.min(debtor.netCents, creditor.netCents);

    if (amountCents > 0) {
      transfers.push({
        fromMember: debtor.memberId,
        toMember: creditor.memberId,
        amountCents,
      });
    }

    debtor.netCents -= amountCents;
    creditor.netCents -= amountCents;

    if (debtor.netCents === 0) debtorIndex += 1;
    if (creditor.netCents === 0) creditorIndex += 1;
  }

  return transfers;
}

/** Total of all expenses, in cents. */
export function totalSpentCents(expenses: BalanceExpense[]): number {
  return expenses.reduce(
    (sum, expense) =>
      sum + expense.shares.reduce((shareSum, share) => shareSum + share.amountCents, 0),
    0,
  );
}

/** Reads as a sentence: "Ana is owed 12.50", "Ben owes 4.00", "Cy is settled up". */
export function describeBalance(
  netCents: number,
  name: string,
  format: (cents: number) => string,
): string {
  if (netCents > 0) return `${name} is owed ${format(netCents)}`;
  if (netCents < 0) return `${name} owes ${format(-netCents)}`;
  return `${name} is settled up`;
}
