"use client";

import { useActionState, useEffect, useRef } from "react";

import { recordPaymentAction, INITIAL_FORM_STATE } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, describedBy } from "@/components/ui/field";

import { FormMessage } from "./form-message";
import type { MemberOption } from "./expense-form";

export function RecordPaymentForm({
  groupId,
  members,
  today,
  defaults,
}: {
  groupId: string;
  members: MemberOption[];
  today: string;
  defaults: { fromMember?: string; toMember?: string; amount?: string };
}) {
  const [state, formAction, pending] = useActionState(recordPaymentAction, INITIAL_FORM_STATE);
  const formRef = useRef<HTMLFormElement>(null);
  const errors = state.errors ?? {};
  const first = defaults.fromMember ?? members[0]?.id ?? "";
  const second = defaults.toMember ?? members[1]?.id ?? members[0]?.id ?? "";

  useEffect(() => {
    if (state.status === "success") formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="groupId" value={groupId} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="From" htmlFor="payment-from" error={errors.fromMember}>
          <Select
            id="payment-from"
            name="fromMember"
            defaultValue={first}
            aria-invalid={Boolean(errors.fromMember)}
            aria-describedby={describedBy("payment-from", errors.fromMember)}
          >
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="To" htmlFor="payment-to" error={errors.toMember}>
          <Select
            id="payment-to"
            name="toMember"
            defaultValue={second}
            aria-invalid={Boolean(errors.toMember)}
            aria-describedby={describedBy("payment-to", errors.toMember)}
          >
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Amount" htmlFor="payment-amount" error={errors.amount}>
          <Input
            id="payment-amount"
            name="amount"
            inputMode="decimal"
            placeholder="0.00"
            defaultValue={defaults.amount}
            autoComplete="off"
            aria-invalid={Boolean(errors.amount)}
            aria-describedby={describedBy("payment-amount", errors.amount)}
            required
          />
        </Field>

        <Field label="Date" htmlFor="payment-date" error={errors.settledOn}>
          <Input
            id="payment-date"
            name="settledOn"
            type="date"
            defaultValue={today}
            aria-invalid={Boolean(errors.settledOn)}
            aria-describedby={describedBy("payment-date", errors.settledOn)}
            required
          />
        </Field>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button variant="secondary" disabled={pending}>
          {pending ? "Recording…" : "Record payment"}
        </Button>
        <FormMessage state={state} />
      </div>
    </form>
  );
}
