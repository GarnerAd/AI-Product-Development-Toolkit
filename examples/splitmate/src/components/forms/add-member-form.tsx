"use client";

import { useActionState, useEffect, useRef } from "react";

import { addMemberAction, INITIAL_FORM_STATE } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";

import { FormMessage } from "./form-message";

export function AddMemberForm({ groupId }: { groupId: string }) {
  const [state, formAction, pending] = useActionState(addMemberAction, INITIAL_FORM_STATE);
  const formRef = useRef<HTMLFormElement>(null);
  const error = state.errors?.name;

  useEffect(() => {
    if (state.status === "success") formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="groupId" value={groupId} />
      <Field label="Add a person" htmlFor="member-name" error={error}>
        <Input
          id="member-name"
          name="name"
          placeholder="Name"
          autoComplete="off"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "member-name-error" : undefined}
          required
        />
      </Field>
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="secondary" disabled={pending}>
          {pending ? "Adding…" : "Add person"}
        </Button>
        <FormMessage state={state} />
      </div>
    </form>
  );
}
