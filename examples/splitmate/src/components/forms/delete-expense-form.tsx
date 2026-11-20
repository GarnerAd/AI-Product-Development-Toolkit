"use client";

import { useActionState } from "react";

import { INITIAL_FORM_STATE, deleteExpenseAction } from "@/app/actions";
import { Button } from "@/components/ui/button";

import { FormMessage } from "./form-message";

export function DeleteExpenseForm({
  groupId,
  expenseId,
  description,
}: {
  groupId: string;
  expenseId: string;
  description: string;
}) {
  const [state, formAction, pending] = useActionState(deleteExpenseAction, INITIAL_FORM_STATE);

  return (
    <form
      action={formAction}
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        const ok = window.confirm(
          `Delete “${description}”? Its shares and its effect on the balances go with it. This cannot be undone.`,
        );
        if (!ok) event.preventDefault();
      }}
    >
      <input type="hidden" name="groupId" value={groupId} />
      <input type="hidden" name="expenseId" value={expenseId} />
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="danger" disabled={pending}>
          {pending ? "Deleting…" : "Delete this expense"}
        </Button>
        <FormMessage state={state} />
      </div>
      <p className="text-xs text-muted">
        Deleting removes the expense, its shares and its effect on every balance. It cannot be
        undone.
      </p>
    </form>
  );
}
