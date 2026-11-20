"use client";

import { useActionState, useEffect, useRef } from "react";

import { INITIAL_FORM_STATE, addExpenseAction, updateExpenseAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, describedBy } from "@/components/ui/field";
import type { Expense } from "@/lib/types";

import { FormMessage } from "./form-message";

export type MemberOption = { id: string; name: string };

export function ExpenseForm({
  mode,
  groupId,
  members,
  today,
  expense,
}: {
  mode: "create" | "edit";
  groupId: string;
  members: MemberOption[];
  today: string;
  expense?: Expense;
}) {
  const action = mode === "edit" ? updateExpenseAction : addExpenseAction;
  const [state, formAction, pending] = useActionState(action, INITIAL_FORM_STATE);
  const formRef = useRef<HTMLFormElement>(null);
  const errors = state.errors ?? {};

  useEffect(() => {
    if (mode === "create" && state.status === "success") formRef.current?.reset();
  }, [mode, state]);

  const chosen = new Set(
    expense ? expense.shares.map((share) => share.memberId) : members.map((member) => member.id),
  );
  const amount = expense ? (expense.amountCents / 100).toFixed(2) : "";

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="groupId" value={groupId} />
      {mode === "edit" && expense ? (
        <input type="hidden" name="expenseId" value={expense.id} />
      ) : null}

      <Field label="What was it for?" htmlFor="expense-description" error={errors.description}>
        <Input
          id="expense-description"
          name="description"
          placeholder="Electricity bill"
          defaultValue={expense?.description ?? ""}
          autoComplete="off"
          aria-invalid={Boolean(errors.description)}
          aria-describedby={describedBy("expense-description", errors.description)}
          required
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field
          label="Amount"
          htmlFor="expense-amount"
          hint="Two decimals at most"
          error={errors.amount}
        >
          <Input
            id="expense-amount"
            name="amount"
            inputMode="decimal"
            placeholder="0.00"
            defaultValue={amount}
            autoComplete="off"
            aria-invalid={Boolean(errors.amount)}
            aria-describedby={describedBy("expense-amount", errors.amount, "Two decimals at most")}
            required
          />
        </Field>

        <Field label="Paid by" htmlFor="expense-paid-by" error={errors.paidBy}>
          <Select
            id="expense-paid-by"
            name="paidBy"
            defaultValue={expense?.paidBy ?? members[0]?.id ?? ""}
            aria-invalid={Boolean(errors.paidBy)}
            aria-describedby={describedBy("expense-paid-by", errors.paidBy)}
          >
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Date" htmlFor="expense-date" error={errors.spentOn}>
          <Input
            id="expense-date"
            name="spentOn"
            type="date"
            defaultValue={expense?.spentOn ?? today}
            aria-invalid={Boolean(errors.spentOn)}
            aria-describedby={describedBy("expense-date", errors.spentOn)}
            required
          />
        </Field>
      </div>

      <fieldset aria-describedby={errors.participants ? "participants-error" : undefined}>
        <legend className="text-sm font-medium">Who shared it?</legend>
        <p className="mt-1 text-xs text-muted">Split equally between everyone ticked.</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {members.map((member) => (
            <label
              key={member.id}
              className="flex cursor-pointer items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-sm has-[:checked]:border-accent has-[:checked]:bg-accent/5"
            >
              <input
                type="checkbox"
                name="participants"
                value={member.id}
                defaultChecked={chosen.has(member.id)}
                className="size-4 accent-accent"
              />
              {member.name}
            </label>
          ))}
        </div>
        {errors.participants ? (
          <p id="participants-error" role="alert" className="mt-2 text-xs font-medium text-negative">
            {errors.participants}
          </p>
        ) : null}
      </fieldset>

      <div className="flex flex-wrap items-center gap-3">
        <Button disabled={pending}>
          {pending ? "Saving…" : mode === "edit" ? "Save changes" : "Add expense"}
        </Button>
        <FormMessage state={state} />
      </div>
    </form>
  );
}
