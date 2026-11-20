import { LinkButton } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/card";
import { cx } from "@/lib/cx";
import { describeBalance, type Balance, type Transfer } from "@/lib/domain/balances";
import { formatCents } from "@/lib/domain/money";

export function BalanceBoard({
  balances,
  memberNames,
  currency,
  totalCents,
}: {
  balances: Balance[];
  memberNames: Map<string, string>;
  currency: string;
  totalCents: number;
}) {
  if (balances.length === 0) {
    return <EmptyState>Add the people who share costs, then balances appear here.</EmptyState>;
  }

  const sum = balances.reduce((total, balance) => total + balance.netCents, 0);
  const format = (cents: number) => formatCents(cents, currency);

  return (
    <div>
      <ul className="divide-y divide-border">
        {balances.map((balance) => {
          const name = memberNames.get(balance.memberId) ?? "Unknown person";
          return (
            <li
              key={balance.memberId}
              className={cx(
                "flex items-baseline justify-between gap-4 py-2.5 text-sm",
                balance.netCents > 0 && "text-positive",
                balance.netCents < 0 && "text-negative",
              )}
            >
              <span>{describeBalance(balance.netCents, name, format)}</span>
              <span className="font-medium tabular-nums">
                {format(Math.abs(balance.netCents))}
              </span>
            </li>
          );
        })}
      </ul>
      <dl className="mt-3 flex flex-wrap justify-between gap-x-6 gap-y-1 border-t border-border pt-3 text-sm text-muted">
        <div className="flex gap-1">
          <dt>Total spent</dt>
          <dd className="font-medium text-foreground tabular-nums">{format(totalCents)}</dd>
        </div>
        <div className="flex gap-1">
          <dt>Balances add up to</dt>
          <dd className="font-medium text-foreground tabular-nums">{format(sum)}</dd>
        </div>
      </dl>
    </div>
  );
}

export function TransferList({
  transfers,
  memberNames,
  currency,
  groupId,
}: {
  transfers: Transfer[];
  memberNames: Map<string, string>;
  currency: string;
  groupId: string;
}) {
  if (transfers.length === 0) {
    return (
      <p className="rounded-xl border border-border bg-background/60 px-4 py-3 text-sm">
        Everyone is settled up. Nothing to pay.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {transfers.map((transfer) => {
        const from = memberNames.get(transfer.fromMember) ?? "Unknown person";
        const to = memberNames.get(transfer.toMember) ?? "Unknown person";
        const amount = formatCents(transfer.amountCents, currency);
        const prefill = new URLSearchParams({
          from: transfer.fromMember,
          to: transfer.toMember,
          amount: (transfer.amountCents / 100).toFixed(2),
        });

        return (
          <li
            key={`${transfer.fromMember}-${transfer.toMember}`}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-background/60 px-4 py-3"
          >
            <span className="text-sm">
              <strong className="font-semibold">{from}</strong> pays{" "}
              <strong className="font-semibold">{to}</strong>{" "}
              <span className="font-medium tabular-nums">{amount}</span>
            </span>
            <LinkButton
              href={`/groups/${groupId}?${prefill.toString()}#record-payment`}
              aria-label={`Record that ${from} paid ${to} ${amount}`}
            >
              Record this
            </LinkButton>
          </li>
        );
      })}
    </ul>
  );
}
