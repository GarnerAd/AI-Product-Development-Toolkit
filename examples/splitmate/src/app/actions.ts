"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  DuplicateMemberError,
  ExpenseNotFoundError,
  GroupNotFoundError,
  MemberInUseError,
  UnknownMemberError,
} from "@/lib/db/errors";
import { getRepository } from "@/lib/db/repository";
import { todayIso } from "@/lib/domain/money";
import { splitEqually } from "@/lib/domain/split";
import {
  validateExpense,
  validateGroup,
  validateMember,
  validateSettlement,
} from "@/lib/validation";

export type FormState = {
  status: "idle" | "success" | "error";
  message?: string;
  errors?: Record<string, string>;
};

export const INITIAL_FORM_STATE: FormState = { status: "idle" };

function value(formData: FormData, key: string): string {
  const field = formData.get(key);
  return typeof field === "string" ? field : "";
}

function values(formData: FormData, key: string): string[] {
  return formData.getAll(key).filter((item): item is string => typeof item === "string");
}

/** The one reading of an expense form, shared by adding and editing. */
function expenseInputFrom(formData: FormData, groupMemberIds: string[]) {
  return validateExpense({
    description: value(formData, "description"),
    amount: value(formData, "amount"),
    paidBy: value(formData, "paidBy"),
    spentOn: value(formData, "spentOn") || todayIso(),
    participants: values(formData, "participants"),
    groupMemberIds,
  });
}

export async function createGroupAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const result = validateGroup({
    name: value(formData, "name"),
    currency: value(formData, "currency"),
  });
  if (!result.ok) {
    return { status: "error", message: "Check the field below.", errors: result.errors };
  }

  const group = getRepository().createGroup(result.value);
  revalidatePath("/");
  redirect(`/groups/${group.id}`);
}

export async function addMemberAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const groupId = value(formData, "groupId");
  const result = validateMember({ name: value(formData, "name") });
  if (!result.ok) {
    return { status: "error", message: "Check the field below.", errors: result.errors };
  }

  try {
    getRepository().addMember({ groupId, name: result.value.name });
  } catch (error) {
    if (error instanceof DuplicateMemberError) {
      return {
        status: "error",
        message: "That person is already in this group.",
        errors: { name: "Use a different name, or a surname to tell them apart." },
      };
    }
    if (error instanceof GroupNotFoundError) {
      return { status: "error", message: "This group no longer exists." };
    }
    throw error;
  }

  revalidatePath(`/groups/${groupId}`);
  return { status: "success", message: `Added ${result.value.name}.` };
}

export async function addExpenseAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const groupId = value(formData, "groupId");
  const repository = getRepository();
  const members = repository.listMembers(groupId);

  const result = expenseInputFrom(
    formData,
    members.map((member) => member.id),
  );
  if (!result.ok) {
    return { status: "error", message: "Check the fields below.", errors: result.errors };
  }

  const shares = splitEqually(result.value.amountCents, result.value.participantIds);

  try {
    repository.addExpense({
      groupId,
      description: result.value.description,
      amountCents: result.value.amountCents,
      paidBy: result.value.paidBy,
      spentOn: result.value.spentOn,
      shares: [...shares].map(([memberId, amountCents]) => ({ memberId, amountCents })),
    });
  } catch (error) {
    if (error instanceof UnknownMemberError) {
      return {
        status: "error",
        message: "Someone chosen is not in this group any more. Reload the page.",
      };
    }
    if (error instanceof GroupNotFoundError) {
      return { status: "error", message: "This group no longer exists." };
    }
    throw error;
  }

  revalidatePath(`/groups/${groupId}`);
  return { status: "success", message: `Expense added: ${result.value.description}.` };
}

export async function recordPaymentAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const groupId = value(formData, "groupId");
  const repository = getRepository();
  const members = repository.listMembers(groupId);

  const result = validateSettlement({
    fromMember: value(formData, "fromMember"),
    toMember: value(formData, "toMember"),
    amount: value(formData, "amount"),
    settledOn: value(formData, "settledOn") || todayIso(),
    groupMemberIds: members.map((member) => member.id),
  });
  if (!result.ok) {
    return { status: "error", message: "Check the fields below.", errors: result.errors };
  }

  try {
    repository.addSettlement({ groupId, ...result.value });
  } catch (error) {
    if (error instanceof UnknownMemberError) {
      return {
        status: "error",
        message: "Someone chosen is not in this group any more. Reload the page.",
      };
    }
    if (error instanceof GroupNotFoundError) {
      return { status: "error", message: "This group no longer exists." };
    }
    throw error;
  }

  revalidatePath(`/groups/${groupId}`);
  return { status: "success", message: "Payment recorded." };
}

export async function updateExpenseAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const groupId = value(formData, "groupId");
  const expenseId = value(formData, "expenseId");
  const repository = getRepository();
  const members = repository.listMembers(groupId);

  const result = expenseInputFrom(
    formData,
    members.map((member) => member.id),
  );
  if (!result.ok) {
    return { status: "error", message: "Check the fields below.", errors: result.errors };
  }

  const shares = splitEqually(result.value.amountCents, result.value.participantIds);

  try {
    repository.updateExpense(expenseId, {
      groupId,
      description: result.value.description,
      amountCents: result.value.amountCents,
      paidBy: result.value.paidBy,
      spentOn: result.value.spentOn,
      shares: [...shares].map(([memberId, amountCents]) => ({ memberId, amountCents })),
    });
  } catch (error) {
    if (error instanceof ExpenseNotFoundError) {
      return { status: "error", message: "That expense no longer exists." };
    }
    if (error instanceof UnknownMemberError) {
      return {
        status: "error",
        message: "Someone chosen is not in this group any more. Reload the page.",
      };
    }
    throw error;
  }

  revalidatePath(`/groups/${groupId}`);
  revalidatePath(`/groups/${groupId}/expenses/${expenseId}/edit`);
  return { status: "success", message: `Expense updated: ${result.value.description}.` };
}

export async function deleteExpenseAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const groupId = value(formData, "groupId");
  const expenseId = value(formData, "expenseId");

  try {
    getRepository().deleteExpense(expenseId);
  } catch (error) {
    // Already gone counts as done: the owner wanted it removed and it is.
    if (!(error instanceof ExpenseNotFoundError)) throw error;
  }

  revalidatePath(`/groups/${groupId}`);
  redirect(`/groups/${groupId}?notice=expense-deleted`);
}

export async function removeMemberAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const groupId = value(formData, "groupId");
  const memberId = value(formData, "memberId");

  try {
    getRepository().deleteMember(memberId);
  } catch (error) {
    if (error instanceof MemberInUseError) {
      return { status: "error", message: error.message };
    }
    if (error instanceof UnknownMemberError) {
      return { status: "error", message: "That person is no longer in this group." };
    }
    throw error;
  }

  revalidatePath(`/groups/${groupId}`);
  return { status: "success", message: "Person removed." };
}
