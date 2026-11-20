/** Errors the data layer raises for conditions the forms handle. */

export class DuplicateMemberError extends Error {
  constructor(name: string) {
    super(`"${name}" is already in this group.`);
    this.name = "DuplicateMemberError";
  }
}

export class UnknownMemberError extends Error {
  constructor(memberId: string) {
    super(`Member ${memberId} is not part of this group.`);
    this.name = "UnknownMemberError";
  }
}

export class GroupNotFoundError extends Error {
  constructor(groupId: string) {
    super(`Group ${groupId} does not exist.`);
    this.name = "GroupNotFoundError";
  }
}

export class ExpenseNotFoundError extends Error {
  constructor(expenseId: string) {
    super(`Expense ${expenseId} does not exist.`);
    this.name = "ExpenseNotFoundError";
  }
}

export class MemberInUseError extends Error {
  readonly memberName: string;

  constructor(memberName: string) {
    super(
      `${memberName} has expenses or payments in this group. Remove those first, or keep the person.`,
    );
    this.name = "MemberInUseError";
    this.memberName = memberName;
  }
}
