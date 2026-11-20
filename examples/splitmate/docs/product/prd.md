# Product Requirements Document: Splitmate

**Status:** approved by the owner · 2026-11-20
**Product type:** web application (Next.js + Supabase + Vercel)

## 1. Introduction / Overview

Splitmate splits shared costs between friends, flatmates and travel groups without a spreadsheet. One person creates a group, adds the people in it, and records what was paid and who shared it. The app shows what each person has paid, what they owe, and the shortest set of payments that settles the group.

The first release is deliberately small: no accounts, no bank connections, no receipts. It replaces the "who owes what" message thread, and nothing else.

## 2. Goals / Objectives

- **G1.** A group can record its shared spending in under a minute per expense. Measure: median time to add a second expense is under 60 seconds in usability testing with 5 people.
- **G2.** The amount owed by each person is always explainable from the expenses listed. Measure: on every group page, each balance can be traced to the expense rows shown.
- **G3.** Settling a group takes one screen and no arithmetic. Measure: every group with a non-zero balance shows at most `members − 1` suggested payments.
- **G4.** Records survive a browser restart. Measure: an expense added, then the app restarted, is still listed.

## 3. Target Audience / User Personas

- **Ana, the organiser (primary).** Shares a flat with three people. Pays the electricity bill and buys household items. Wants to stop tracking in a notes app. Uses a laptop, occasionally a phone.
- **Ben, the participant.** Rarely opens the app, wants to see one number: what he owes. Needs the list to trust the number.
- **The travel group (secondary).** Four friends on a trip, one currency, many small expenses, settles once at the end.

## 4. User Stories / Use Cases

- As **Ana**, I create a group with a name and a currency, so everything after it is in the right unit.
- As **Ana**, I add the people in the group, so shares can be assigned to them.
- As **Ana**, I record an expense with a description, amount, payer and the people who shared it, so the group's balances update.
- As **Ben**, I open the group and see what I owe or am owed, and the expenses behind that number.
- As **Ana**, I record a payment someone made to someone else, so settled amounts stop showing as owed.
- As **Ana**, I see the fewest payments that clear the group, so settling takes one transfer each.

## 5. Functional Requirements

**Groups**
- FR-1. Create a group with a name (1–60 characters) and a currency from a fixed list.
- FR-2. List all groups with member count, total spent and the number of open balances.
- FR-3. Open a group page from the list.

**Members**
- FR-4. Add a member to a group with a display name (1–40 characters). Duplicate names in one group are refused.

**Expenses**
- FR-5. Add an expense: description (1–80 characters), amount greater than zero with at most two decimals, payer (a member of the group), date (defaults to today), and one or more participants.
- FR-6. Split the amount equally between the selected participants, in whole cents. Remainder cents go to the first participants in the order shown, so the shares always sum to the amount.
- FR-7. List a group's expenses newest first, showing description, date, amount, payer and the number of people who shared it.
- FR-8. Refuse an amount of zero, a negative amount, more than two decimals, a payer outside the group, or a participant outside the group, with a message next to the field.

**Balances and settling**
- FR-9. Show each member's net position: paid minus their shares, adjusted by recorded payments. Positive means the group owes them.
- FR-10. Show the suggested payments that clear all balances, using at most one payment fewer than the number of members with a non-zero balance.
- FR-11. Record a payment between two members of the group with an amount, a date and a direction. It changes the balances and stays listed.

**Failure handling**
- FR-12. A group with no expenses or no members shows guidance instead of an empty table.
- FR-13. An unknown group address shows a not-found page, not an error.

**Correcting records** (added 2026-11-20, owner's request)
- FR-14. Edit an expense: description, amount, payer, date and participants can all change. The shares are recalculated with the same rules as FR-6, so the old shares never linger.
- FR-15. Delete an expense. Its shares go with it, and every balance and suggested payment updates.
- FR-16. Remove a person from a group only while they have no expenses and no recorded payments. Otherwise the app explains why, and changes nothing.
- FR-17. Deleting an expense or removing a person is a separate, clearly labelled action from saving an edit.

## 6. Non-Functional Requirements

- **Performance:** group page server render under 300 ms with 500 expenses and 20 members on local hardware.
- **Accessibility:** every form field has a label, every action works with the keyboard, colour is never the only signal for positive or negative balances, and contrast meets WCAG 2.2 AA.
- **Security:** all input validated on the server; no user input reaches SQL as a string; amounts stored as integer cents.
- **Compatibility:** current Chrome, Safari, Firefox and Edge; usable at 360 px width.
- **Data integrity:** shares of an expense always sum to its amount; an expense can be edited or deleted and its shares follow it; a person with any expense or payment cannot be removed.
- **Privacy:** no analytics in the first release; no personal data beyond display names.

## 7. Design Considerations

- One visual system: neutral surfaces, a single accent colour, rounded cards, and tabular numbers for money.
- Money always shows its currency, from the group, never from the browser locale.
- Balances read as sentences ("Ben owes Ana 24.50"), not as signed numbers only.

## 8. Success Metrics

- **M1.** 70% of groups created in testing get at least three expenses.
- **M2.** 90% of test participants explain their own balance correctly without help.
- **M3.** Zero reports of a group whose balances do not sum to zero.

## 9. Open Questions / Future Considerations

- Accounts and shared access: one workspace is enough for a household, not for two households. Deferred until after launch.
- Unequal splits (exact amounts, percentages, shares). Excluded from the first release.
- Multiple currencies in one group, with conversion. Excluded.
- Recurring bills. Excluded.
- Deleting a whole group, and undoing a deletion. Excluded from the first release; recorded for the next one.

## Appendix: confirmed assumptions (owner, 2026-11-20)

1. A single shared workspace with no sign-in is acceptable for the first release. **Confirmed.**
2. Equal splitting is enough; unequal splits can wait. **Confirmed.**
3. A fixed list of ten common currencies is enough, chosen per group. **Confirmed.**
4. Recording payments is part of the first release, so balances can be cleared. **Confirmed.**

