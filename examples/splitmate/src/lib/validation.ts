/**
 * Server-side validation for every form. The browser may show the same rules,
 * but this module is the source of truth: actions call it before touching data.
 */

import { isCurrency, isIsoDate, parseAmountToCents, type Currency } from "./domain/money";

export type FieldErrors = Record<string, string>;

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; errors: FieldErrors };

export const LIMITS = {
  groupName: 60,
  memberName: 40,
  description: 80,
} as const;

function text(value: unknown): string {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

export function validateGroup(input: { name: string; currency: string }): ValidationResult<{
  name: string;
  currency: Currency;
}> {
  const errors: FieldErrors = {};
  const name = text(input.name);

  if (name.length === 0) errors.name = "Give the group a name.";
  else if (name.length > LIMITS.groupName) {
    errors.name = `Use ${LIMITS.groupName} characters or fewer.`;
  }

  if (!isCurrency(input.currency)) errors.currency = "Choose a currency from the list.";

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, value: { name, currency: input.currency as Currency } };
}

export function validateMember(input: { name: string }): ValidationResult<{ name: string }> {
  const errors: FieldErrors = {};
  const name = text(input.name);

  if (name.length === 0) errors.name = "Enter the person's name.";
  else if (name.length > LIMITS.memberName) {
    errors.name = `Use ${LIMITS.memberName} characters or fewer.`;
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, value: { name } };
}

export function validateExpense(input: {
  description: string;
  amount: string;
  paidBy: string;
  spentOn: string;
  participants: string[];
  groupMemberIds: string[];
}): ValidationResult<{
  description: string;
  amountCents: number;
  paidBy: string;
  spentOn: string;
  participantIds: string[];
}> {
  const errors: FieldErrors = {};
  const description = text(input.description);
  const amountCents = parseAmountToCents(input.amount ?? "");
  const participantIds = [...new Set(input.participants.filter(Boolean))];
  const memberIds = new Set(input.groupMemberIds);

  if (description.length === 0) errors.description = "Say what the expense was for.";
  else if (description.length > LIMITS.description) {
    errors.description = `Use ${LIMITS.description} characters or fewer.`;
  }

  if (amountCents === null) {
    errors.amount = "Enter an amount greater than zero, with at most two decimals.";
  }

  if (!input.paidBy) errors.paidBy = "Choose who paid.";
  else if (!memberIds.has(input.paidBy)) errors.paidBy = "Choose someone in this group.";

  if (participantIds.length === 0) errors.participants = "Tick at least one person who shared it.";
  else if (participantIds.some((id) => !memberIds.has(id))) {
    errors.participants = "Everyone ticked must be in this group.";
  }

  if (!isIsoDate(input.spentOn)) errors.spentOn = "Choose a valid date.";

  if (Object.keys(errors).length > 0 || amountCents === null) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    value: {
      description,
      amountCents,
      paidBy: input.paidBy,
      spentOn: input.spentOn,
      participantIds,
    },
  };
}

export function validateSettlement(input: {
  fromMember: string;
  toMember: string;
  amount: string;
  settledOn: string;
  groupMemberIds: string[];
}): ValidationResult<{
  fromMember: string;
  toMember: string;
  amountCents: number;
  settledOn: string;
}> {
  const errors: FieldErrors = {};
  const amountCents = parseAmountToCents(input.amount ?? "");
  const memberIds = new Set(input.groupMemberIds);

  if (!input.fromMember) errors.fromMember = "Choose who paid.";
  else if (!memberIds.has(input.fromMember)) errors.fromMember = "Choose someone in this group.";

  if (!input.toMember) errors.toMember = "Choose who received the payment.";
  else if (!memberIds.has(input.toMember)) errors.toMember = "Choose someone in this group.";

  if (input.fromMember && input.fromMember === input.toMember) {
    errors.toMember = "A payment needs two different people.";
  }

  if (amountCents === null) {
    errors.amount = "Enter an amount greater than zero, with at most two decimals.";
  }

  if (!isIsoDate(input.settledOn)) errors.settledOn = "Choose a valid date.";

  if (Object.keys(errors).length > 0 || amountCents === null) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    value: {
      fromMember: input.fromMember,
      toMember: input.toMember,
      amountCents,
      settledOn: input.settledOn,
    },
  };
}
