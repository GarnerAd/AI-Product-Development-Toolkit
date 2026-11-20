"use client";

import { useActionState } from "react";

import { createGroupAction, INITIAL_FORM_STATE } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, describedBy } from "@/components/ui/field";
import { CURRENCIES, type Currency } from "@/lib/domain/money";

import { FormMessage } from "./form-message";

const NAME_HINT = "A flat, a trip, a team. You can add people next.";

export function CreateGroupForm({ defaultCurrency }: { defaultCurrency: Currency }) {
  const [state, formAction, pending] = useActionState(createGroupAction, INITIAL_FORM_STATE);
  const nameError = state.errors?.name;
  const currencyError = state.errors?.currency;

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_9rem]">
        <Field label="Group name" htmlFor="group-name" hint={NAME_HINT} error={nameError}>
          <Input
            id="group-name"
            name="name"
            placeholder="Flat 3"
            autoComplete="off"
            aria-invalid={Boolean(nameError)}
            aria-describedby={describedBy("group-name", nameError, NAME_HINT)}
            required
          />
        </Field>
        <Field label="Currency" htmlFor="group-currency" error={currencyError}>
          <Select id="group-currency" name="currency" defaultValue={defaultCurrency}>
            {CURRENCIES.map((currency) => (
              <option key={currency} value={currency}>
                {currency}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button disabled={pending}>{pending ? "Creating…" : "Create group"}</Button>
        <FormMessage state={state} />
        <span className="text-xs text-muted">Currency is fixed once the group exists.</span>
      </div>
    </form>
  );
}
