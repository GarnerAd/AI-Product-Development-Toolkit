/** Shared type declarations for the data layer. Amounts are integer cents. */

export type Group = {
  id: string;
  name: string;
  currency: string;
  createdAt: string;
};

export type Member = {
  id: string;
  groupId: string;
  name: string;
  createdAt: string;
};

export type ExpenseShare = {
  memberId: string;
  amountCents: number;
};

export type Expense = {
  id: string;
  groupId: string;
  description: string;
  amountCents: number;
  paidBy: string;
  spentOn: string;
  createdAt: string;
  shares: ExpenseShare[];
};

export type Settlement = {
  id: string;
  groupId: string;
  fromMember: string;
  toMember: string;
  amountCents: number;
  settledOn: string;
  createdAt: string;
};

export type GroupSummary = Group & {
  memberCount: number;
  expenseCount: number;
  totalCents: number;
};

export type NewExpense = {
  groupId: string;
  description: string;
  amountCents: number;
  paidBy: string;
  spentOn: string;
  shares: ExpenseShare[];
};

export type NewSettlement = {
  groupId: string;
  fromMember: string;
  toMember: string;
  amountCents: number;
  settledOn: string;
};
