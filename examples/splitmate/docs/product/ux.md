# UX and User Flows: Splitmate

**Status:** draft for owner approval · 2026-11-20 · derived from `prd.md`

## 1. Screens

| # | Screen | Address | Purpose |
| --- | --- | --- | --- |
| S1 | Groups | `/` | All groups, create a group, reach a group |
| S2 | Group | `/groups/<id>` | Balances, suggested payments, expenses, members |
| S3 | Add expense | `/groups/<id>#add-expense` (same page, card in the flow) | Record one expense |
| S4 | Record payment | `/groups/<id>#record-payment` (same page) | Mark a debt as paid |
| S5 | Not found | any unknown group address | Explain and offer the way back |
| S6 | Edit expense | `/groups/<id>/expenses/<expenseId>/edit` | Correct or delete one expense |

S2 carries four blocks in this order: **balances**, **who pays whom**, **expenses**, **members**. On narrow screens they stack in that order; the add-expense form sits directly under the balances so the arithmetic result and the next action are adjacent.

## 2. Flow A: set up a group and record the first expense

1. S1 empty state: "No groups yet. Create one for your flat, trip or team." Form: group name, currency (defaults to the browser's currency, else USD).
2. Submit with an empty name → message under the field, other values kept.
3. Success → S2 with an empty state on each block: "Add the people who share costs" and "No expenses yet".
4. Add members on S2; each add appears in the member list and in the expense form's payer and participant lists without a page reload.
5. Fill the expense form: description, amount, payer, date (today), participants (all ticked by default).
6. Submit with `0` → "Enter an amount greater than zero." With `12.345` → "Use at most two decimals."
7. Success → the expense appears at the top of the list, balances and suggested payments update, the form clears, and a short confirmation names the expense.

## 3. Flow B: understand a balance

1. S2 balances block lists each member with a sentence: "Ana is owed 24.50", "Ben owes 12.25", "Cleared". Signed amounts are secondary, in tabular figures.
2. A total line reads "Total spent: 61.00" and "Balances add up to 0.00", which is the proof the arithmetic is closed.
3. The expenses block lists, newest first: description, date, payer, amount and "shared by N".
4. Numbers and their explanation sit on one screen, so a reader can add them up by hand (PRD G2).

## 4. Flow C: settle up

1. S2 "Who pays whom" shows at most `members − 1` rows: "Ben pays Ana 12.25". Each row is one transfer, in the group's currency.
2. The owner makes the transfer outside the app, then uses the record-payment form with the same two people and the same amount (prefilled by a button on the row).
3. On submit, balances and suggestions recompute; settled rows disappear; the payment appears in a "Payments" list under the expenses.
4. When everything is settled, the block reads "Everyone is settled up" and the form stays available.

## 5. Flow D: correct a mistake, and remove a person

1. Each row in the expenses block carries an **Edit** link. It opens S6 with the expense's description, amount, payer, date and ticked participants, plus a link back to the group.
2. Saving runs the same checks as adding. Invalid input shows the message next to the field and changes nothing; saving valid input replaces the shares completely, so no old share survives.
3. Saving a valid change replaces the shares completely, clears the field errors and reads "Expense updated: <description>". The link back to the group shows the corrected balances, suggested payments and row.
4. **Delete this expense** sits apart from Save, styled as a destructive action, and asks for confirmation that names the expense. Confirming returns to S2 with "Expense deleted"; cancelling changes nothing.
5. In the People block, each person has **Remove**. A person with no expenses or payments is removed after a confirmation. A person with records is not removed; the app says why, in words ("Chloé has expenses in this group. Remove the expenses first, or keep the person."), and changes nothing.
6. Removing a person keeps the group's arithmetic intact: no expense loses a share.

## 6. Interface requirements

- **Money:** always `formatCents(amount, group.currency)`; never rely on the browser locale; tabular figures in lists and totals.
- **Forms:** labels above fields; errors directly under the field, in text, with `aria-describedby`; required fields marked.
- **Keyboard:** every control reachable in reading order; the participant list is a normal set of checkboxes, not a custom widget.
- **Empty states:** each block explains what to do next and links to the form that does it.
- **Not found:** unknown group → "We couldn't find that group" with a link to the groups list; the HTTP status is 404.
- **Responsive:** single column under 768 px; balances first, forms full width; no horizontal scrolling at 360 px.
- **Feedback:** after a successful action, a status message names what happened ("Expense added: Electricity, 61.00"). It is announced, not only coloured.
- **Accessibility:** WCAG 2.2 AA contrast; the positive/negative meaning is in words as well as colour.

## 7. Out of scope for this UX pass

Accounts and invites, deleting a whole group, undo, filtering, charts, onboarding tours, notifications. Recorded in `docs/product/mvp.md` as out of the MVP.

## Appendix: assumptions to confirm with the owner

1. Balances and the add-expense form share one page; no separate expense screen.
2. One form per action, all visible, no steps or modals.
3. English only, one currency per group.
