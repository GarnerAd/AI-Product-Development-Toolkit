import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AddMemberForm } from "@/components/forms/add-member-form";
import { ExpenseForm } from "@/components/forms/expense-form";
import { RecordPaymentForm } from "@/components/forms/record-payment-form";
import { BalanceBoard, TransferList } from "@/components/group/balances";
import { ExpenseList, PaymentList } from "@/components/group/lists";
import { MemberList } from "@/components/group/members";
import { Badge, Card, EmptyState } from "@/components/ui/card";
import { getRepository } from "@/lib/db/repository";
import { computeBalances, simplifyDebts, totalSpentCents } from "@/lib/domain/balances";
import { formatCents, todayIso } from "@/lib/domain/money";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const group = getRepository().getGroup(id);
  return { title: group ? group.name : "Group not found" };
}

function single(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" ? value : undefined;
}

export default async function GroupPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const query = await searchParams;
  const repository = getRepository();

  const group = repository.getGroup(id);
  if (!group) notFound();

  const members = repository.listMembers(id);
  const expenses = repository.listExpenses(id);
  const settlements = repository.listSettlements(id);

  const memberNames = new Map(members.map((member) => [member.id, member.name]));
  const memberIds = members.map((member) => member.id);
  const balances = computeBalances(memberIds, expenses, settlements);
  const transfers = simplifyDebts(balances);
  const totalCents = totalSpentCents(expenses);

  const prefillFrom = single(query.from);
  const prefillTo = single(query.to);
  const prefillAmount = single(query.amount);
  const defaults = {
    fromMember: prefillFrom && memberNames.has(prefillFrom) ? prefillFrom : undefined,
    toMember: prefillTo && memberNames.has(prefillTo) ? prefillTo : undefined,
    amount:
      prefillAmount && /^\d+(\.\d{1,2})?$/.test(prefillAmount) ? prefillAmount : undefined,
  };

  const today = todayIso();

  const notices: Record<string, string> = {
    "expense-deleted": "Expense deleted. Balances and suggested payments are up to date.",
  };
  const notice = notices[single(query.notice) ?? ""];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/"
          className="text-sm text-muted underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
        >
          ← All groups
        </Link>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{group.name}</h1>
          <Badge>{group.currency}</Badge>
          <Badge>{members.length === 1 ? "1 person" : `${members.length} people`}</Badge>
          <Badge>
            {expenses.length === 1 ? "1 expense" : `${expenses.length} expenses`}
          </Badge>
        </div>
        <p className="mt-2 text-sm text-muted">
          Total spent{" "}
          <span className="font-medium text-foreground tabular-nums">
            {formatCents(totalCents, group.currency)}
          </span>
        </p>
      </div>

      {notice ? (
        <p
          role="status"
          className="rounded-xl border border-accent/30 bg-accent/5 px-4 py-3 text-sm font-medium text-accent"
        >
          {notice}
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_17rem] lg:items-start">
        <div className="flex flex-col gap-6">
          <Card title="Balances" description="What each person paid, minus what they owe.">
            <BalanceBoard
              balances={balances}
              memberNames={memberNames}
              currency={group.currency}
              totalCents={totalCents}
            />
          </Card>

          <Card
            id="settle-up"
            title="Who pays whom"
            description="The fewest payments that clear every balance."
          >
            <div className="flex flex-col gap-4">
              <TransferList
                transfers={transfers}
                memberNames={memberNames}
                currency={group.currency}
                groupId={group.id}
              />

              {members.length >= 2 ? (
                <div id="record-payment" className="scroll-mt-6 border-t border-border pt-4">
                  <h3 className="text-sm font-semibold">Record a payment</h3>
                  <p className="mb-3 mt-1 text-xs text-muted">
                    For money that already changed hands outside Splitmate.
                  </p>
                  <RecordPaymentForm
                    groupId={group.id}
                    members={members}
                    today={today}
                    defaults={defaults}
                  />
                </div>
              ) : (
                <EmptyState>Add two people to record payments between them.</EmptyState>
              )}
            </div>
          </Card>

          <Card
            id="add-expense"
            title="Add an expense"
            description="Split equally between the people who shared it."
          >
            {members.length === 0 ? (
              <EmptyState>
                Add someone to the group first, then record what they paid.
              </EmptyState>
            ) : (
              <ExpenseForm mode="create" groupId={group.id} members={members} today={today} />
            )}
          </Card>

          <Card title="Expenses" description="Newest first, with who paid and who shared.">
            <ExpenseList
              groupId={group.id}
              expenses={expenses}
              memberNames={memberNames}
              currency={group.currency}
            />
          </Card>

          <Card title="Payments" description="Money that has already moved.">
            <PaymentList
              settlements={settlements}
              memberNames={memberNames}
              currency={group.currency}
            />
          </Card>
        </div>

        <aside className="flex flex-col gap-6">
          <Card title="People" description="Everyone who shares costs in this group.">
            <div className="flex flex-col gap-4">
              <MemberList groupId={group.id} members={members} />
              <AddMemberForm groupId={group.id} />
            </div>
          </Card>

          <Card title="How this works">
            <ul className="flex list-disc flex-col gap-2 pl-4 text-xs text-muted">
              <li>Amounts are stored in whole cents, so totals never drift.</li>
              <li>A balance is what someone paid minus their shares, plus payments made.</li>
              <li>The suggested payments are the shortest route to zero.</li>
              <li>Currency is {group.currency} for every amount in this group.</li>
            </ul>
          </Card>
        </aside>
      </div>
    </div>
  );
}
