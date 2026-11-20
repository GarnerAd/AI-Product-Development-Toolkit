# MVP Concept Description: Splitmate

**Status:** approved by the owner · 2026-11-20 · derived from `prd.md`

## 1. Core MVP Hypothesis / Goal

**Hypothesis:** a shared household or travel group will keep using Splitmate instead of a notes app if recording an expense takes under a minute and the resulting "who owes whom" needs no arithmetic.

**Primary learning objective:** does the group return to record a *second* and *third* expense, and do they trust the balance enough to settle from it? This tests PRD goals G1 and G3.

## 2. Target Audience (MVP Subset)

One organiser in a group of 2–6 people who already share costs regularly: a flatmate who pays the bills, or one traveller who fronts the bookings. No organisers with formal accounting needs, no businesses, no groups spread across several currencies.

## 3. Problem Solved (MVP Focus)

The organiser cannot answer "who owes what" without re-adding a list of expenses, and the group cannot settle without trusting that arithmetic. Splitmate keeps the list and does the arithmetic, so the group acts on one trustworthy number.

## 4. Minimum Feature Set

**IN**
- Create a group with a name and a currency (PRD FR-1, FR-3).
- Add members by name (PRD FR-4).
- Add an expense with description, amount, payer, date and participants, split equally to the cent (PRD FR-5, FR-6, FR-8).
- List expenses newest first (PRD FR-7).
- Show each member's net balance (PRD FR-9).
- Show the shortest set of payments that clears the group (PRD FR-10).
- Record a payment between two members (PRD FR-11).
- Empty and not-found states with guidance (PRD FR-12, FR-13).
- Validation on the server with a message next to the field (PRD FR-8).
- Edit an expense, recalculating its shares (PRD FR-14).
- Delete an expense, with a confirmation (PRD FR-15, FR-17).
- Remove a person who has no expenses or payments (PRD FR-16).

**OUT (this MVP)**
- Accounts, sign-in, invitations, sharing between devices (one workspace on one machine).
- Deleting a whole group; undoing a delete.
- Unequal splits: exact amounts, percentages, weighted shares.
- Multiple currencies in one group, conversion, rounding rules across currencies.
- Receipts, images, attachments.
- Recurring expenses, budgets, categories, charts.
- Notifications, email, exports (CSV/PDF), payment provider links.
- Search and filtering; pagination (the list is capped by the group's own size).
- Mobile app; offline use.

## 5. Key Constraints (MVP Specific)

- **Stack:** Next.js App Router, strict TypeScript, Tailwind, Supabase for hosted data, Vercel for hosting, Vitest/Testing Library/Playwright for tests, GitHub Actions for CI.
- **Local development:** the starter's local stack needs Docker. This build machine has no Docker, so development runs on an embedded SQLite file behind the same data-layer interface; the Supabase adapter is the hosted path. Recorded in `docs/decisions.md`.
- **No hosted credentials on the development machine**, including test keys.
- **Money in integer cents**, never floats.
- **One currency per group**, fixed at creation.
- **Timeline:** first working version in one build session; launch later.

## 6. Initial Success Metrics Idea

- **Return rate:** 7 of 10 test groups add a third expense within a week of the first.
- **Trust:** 9 of 10 participants state their own balance correctly from the group page.
- **Settlement:** every test group settles using at most `members − 1` suggested transfers, with no balance left non-zero.
