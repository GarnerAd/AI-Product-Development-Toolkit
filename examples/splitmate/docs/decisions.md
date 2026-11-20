# Decisions

Decisions that shape the app, one line each: `YYYY-MM-DD · decision · consequence`. When a decision changes, replace its line; Git keeps the old one. Agents read the section their task touches.

## Environments and accounts

- 2026-11-20 · Development uses a local database and fake providers; staging and production are separate hosted environments; hosted credentials never sit on a development machine · This machine holds no keys, and production changes run only from the production workflow
- 2026-11-20 · Development data lives in an embedded SQLite file (`.data/splitmate.db`) behind one data-layer interface, because the Supabase local stack needs Docker and this machine has none · The same interface gets a Supabase adapter before the first hosted deploy; product code never imports the database driver
- 2026-11-20 · `SPLITMATE_DB` selects the database; it must resolve inside the project or be `:memory:` · A hosted database address is refused before dev, build, test and database commands run

## Data

- 2026-11-20 · Five tables: `groups`, `members`, `expenses`, `expense_shares`, `settlements`, all with text UUIDs and integer cents · Shares always sum to their expense; no floating-point money
- 2026-11-20 · Schema changes ship as ordered SQL migrations applied by the data layer at startup, recorded in `schema_migrations` · Hosted migrations reuse the same SQL files
- 2026-11-20 · Expense shares are stored per member, not recomputed on read · A later change to splitting cannot rewrite history
- 2026-11-20 · Editing an expense replaces its shares in one transaction instead of adjusting them · A correction cannot leave a stale share or a half-applied change
- 2026-11-20 · A person named in any expense, share or payment cannot be removed; the app explains why · Balances stay zero-sum and no record loses a participant
- 2026-11-20 · Deleting an expense removes its shares through the foreign key, and deleting is permanent (no undo) · The delete action asks for confirmation that names the expense

## Product

- 2026-11-20 · The owner approved `docs/product/prd.md`, `ux.md` and `mvp.md`, including the four assumptions at the end of the PRD · The build follows those documents; only the owner changes them

## Access

- 2026-11-20 · One shared workspace, no accounts or sign-in in the MVP · Every visitor of a local instance sees every group; hosted access control is a launch item
- 2026-11-20 · No hosted auth provider is wired in the MVP · Sign-in becomes its own slice, reviewed independently when it arrives

## External services

- 2026-11-20 · No payments, email, background jobs or file storage in the MVP · Nothing leaves the machine, and no provider keys exist to test against

## Money and legal

- 2026-11-20 · Amounts are integer cents, one currency per group, chosen from a fixed list of ten at creation · Changing a group's currency is out of scope; it would rewrite meanings
- 2026-11-20 · Equal splitting distributes remainder cents to the first participants in list order · Deterministic totals, no rounding drift
- 2026-11-20 · Splitmate is not a payment service and moves no money; it records what people paid · No licence, tax or refund questions are answered by the app

## Launch

- 2026-11-20 · Launch is not part of this build session · Domain, search engines, privacy pages, alerts and hosted access control are decided in stage 5

## Deferred

<!-- YYYY-MM-DD · what · decide by <when> · affects <what> -->
- 2026-11-20 · GitHub repository (public or private), hosting and database accounts, region and plan limits · decide by the end of stage 3, when the app goes online · affects CI and the pipeline
- 2026-11-20 · Supabase adapter, hosted migrations and row-level access rules · decide by the first hosted deploy · affects the data layer and every hosted environment
- 2026-11-20 · Deleting personal data on request, and how long data is kept · decide before the first piece of work that stores personal data beyond a local demo · affects member records
- 2026-11-20 · Domain, search engines, alerts, cookies and tracking, legal pages, tax and receipts · decide in stage 5 · affects launch
- 2026-11-20 · Browser end-to-end tests (Playwright); the runner needs a browser download this machine may block · decide when CI runs them · affects `test:e2e`
- 2026-11-20 · Editing and deleting expenses and removing people are done (slices 6–8); unequal splits, multiple currencies, receipts, exports and deleting a whole group remain · decide after the first real usage feedback · affects the next release
- 2026-11-20 · Stage 3's staging and production workflows for Supabase and Vercel · decide when those accounts exist · affects CI until then
