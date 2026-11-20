"use client";

import { useActionState } from "react";

import { INITIAL_FORM_STATE, removeMemberAction } from "@/app/actions";
import { Button } from "@/components/ui/button";

import { FormMessage } from "./form-message";

export function RemoveMemberForm({
  groupId,
  memberId,
  name,
}: {
  groupId: string;
  memberId: string;
  name: string;
}) {
  const [state, formAction, pending] = useActionState(removeMemberAction, INITIAL_FORM_STATE);

  return (
    <form
      action={formAction}
      className="flex flex-col items-end gap-1"
      onSubmit={(event) => {
        const ok = window.confirm(`Remove ${name} from this group?`);
        if (!ok) event.preventDefault();
      }}
    >
      <input type="hidden" name="groupId" value={groupId} />
      <input type="hidden" name="memberId" value={memberId} />
      <Button
        variant="ghost"
        className="h-8 px-2.5 text-xs"
        disabled={pending}
        aria-label={`Remove ${name}`}
      >
        {pending ? "Removing…" : "Remove"}
      </Button>
      <FormMessage state={state} />
    </form>
  );
}
