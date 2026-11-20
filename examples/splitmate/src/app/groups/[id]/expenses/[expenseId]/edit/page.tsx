import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { DeleteExpenseForm } from "@/components/forms/delete-expense-form";
import { ExpenseForm } from "@/components/forms/expense-form";
import { Card } from "@/components/ui/card";
import { getRepository } from "@/lib/db/repository";
import { formatCents, todayIso } from "@/lib/domain/money";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ id: string; expenseId: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id, expenseId } = await params;
  const repository = getRepository();
  const group = repository.getGroup(id);
  const expense = repository.getExpense(expenseId);
  if (!group || !expense || expense.groupId !== group.id) return { title: "Expense not found" };
  return { title: `Edit ${expense.description}` };
}

export default async function EditExpensePage({ params }: PageProps) {
  const { id, expenseId } = await params;
  const repository = getRepository();

  const group = repository.getGroup(id);
  if (!group) notFound();

  const expense = repository.getExpense(expenseId);
  if (!expense || expense.groupId !== group.id) notFound();

  const members = repository.listMembers(id);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href={`/groups/${group.id}`}
          className="text-sm text-muted underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
        >
          ← Back to {group.name}
        </Link>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">Edit expense</h1>
        <p className="mt-2 text-sm text-muted">
          {expense.description} · {formatCents(expense.amountCents, group.currency)} ·{" "}
          {group.name}
        </p>
      </div>

      <Card
        title="The expense"
        description="Change anything and save. The shares are worked out again from the people ticked."
      >
        <ExpenseForm
          mode="edit"
          groupId={group.id}
          members={members}
          today={todayIso()}
          expense={expense}
        />
      </Card>

      <Card
        title="Delete this expense"
        description="Separate from saving, and permanent."
      >
        <DeleteExpenseForm
          groupId={group.id}
          expenseId={expense.id}
          description={expense.description}
        />
      </Card>
    </div>
  );
}
