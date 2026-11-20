import { LinkButton } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/card";
import { formatCents, formatDate } from "@/lib/domain/money";
import type { Expense, Settlement } from "@/lib/types";

const people = (count: number) => (count === 1 ? "1 person" : `${count} people`);

export function ExpenseList({
  groupId,
  expenses,
  memberNames,
  currency,
}: {
  groupId: string;
  expenses: Expense[];
  memberNames: Map<string, string>;
  currency: string;
}) {
  if (expenses.length === 0) {
    return <EmptyState>No expenses yet. Add the first one above and balances update.</EmptyState>;
  }

  return (
    <ul className="divide-y divide-border">
      {expenses.map((expense) => (
        <li
          key={expense.id}
          className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2 py-3"
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{expense.description}</p>
            <p className="text-xs text-muted">
              {formatDate(expense.spentOn)} · Paid by{" "}
              {memberNames.get(expense.paidBy) ?? "someone"} · Shared by{" "}
              {people(expense.shares.length)}
            </p>
          </div>
          <div className="flex items-baseline gap-3">
            <p className="text-sm font-semibold tabular-nums">
              {formatCents(expense.amountCents, currency)}
            </p>
            <LinkButton
              href={`/groups/${groupId}/expenses/${expense.id}/edit`}
              className="h-8 px-2.5 text-xs"
              aria-label={`Edit ${expense.description}`}
            >
              Edit
            </LinkButton>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function PaymentList({
  settlements,
  memberNames,
  currency,
}: {
  settlements: Settlement[];
  memberNames: Map<string, string>;
  currency: string;
}) {
  if (settlements.length === 0) {
    return <EmptyState>No payments recorded yet. Settled balances show here.</EmptyState>;
  }

  return (
    <ul className="divide-y divide-border">
      {settlements.map((settlement) => (
        <li
          key={settlement.id}
          className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-3"
        >
          <p className="text-sm">
            <strong className="font-semibold">
              {memberNames.get(settlement.fromMember) ?? "Someone"}
            </strong>{" "}
            paid{" "}
            <strong className="font-semibold">
              {memberNames.get(settlement.toMember) ?? "someone"}
            </strong>
          </p>
          <p className="flex items-baseline gap-3 text-sm">
            <span className="text-xs text-muted">{formatDate(settlement.settledOn)}</span>
            <span className="font-medium tabular-nums">
              {formatCents(settlement.amountCents, currency)}
            </span>
          </p>
        </li>
      ))}
    </ul>
  );
}
