# Splitmate

Split shared costs with a group and see who owes whom, without a spreadsheet.

> This is the worked example in the [AI Product Development Toolkit](../../README.md). It was built with the [AI App Starter](../../starters/nextjs-supabase-vercel/README.md), from the product documents to the tests, and you can read every decision that shaped it in [`docs/`](./docs/).

Create a group, add the people in it, record what each person paid, and Splitmate keeps every balance and works out the fewest payments that settle the group. Record a payment when the money has actually moved, and the balances clear. Correct or delete an entry and every balance follows.

## Quick start

You need Node.js 24 and Git.

```bash
npm ci
npm run dev
```

Open <http://localhost:3000>. Create a group, add two people, and add an expense. To see a group with history first:

```bash
npm run db:seed   # adds «Flat 3»: four people, four expenses, one payment
npm run dev
```

No Docker, no accounts and no keys are needed: the app keeps its data in a local SQLite file at `.data/splitmate.db`.

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the app on port 3000, with the environment guard |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint, including the Next.js rules |
| `npm run typecheck` | TypeScript, no output files |
| `npm test` | Unit, data-layer, action and component tests (Vitest) |
| `npm run test:watch` | The same tests, watching |
| `npm run verify` | Lint, types, tests and build, in that order |
| `npm run db:seed` | Add the demo group to the local database |
| `npm run db:reset` | Delete the local database; the next command recreates it |
| `npm run smoke` | Build if needed, start the app, and check real pages over HTTP |

A single test file: `npx vitest run src/lib/domain/balances.test.ts`.

## How the data is stored

- Five tables: `groups`, `members`, `expenses`, `expense_shares`, `settlements`. Amounts are integer cents.
- Schema changes are ordered SQL migrations in `src/lib/db/schema.ts`. The data layer applies any migration that has not run yet and records it in `schema_migrations`. Append a new migration; never edit one that has already run.
- All database access goes through the `Repository` interface in `src/lib/db/repository.ts`. Product code never imports the driver.
- `SPLITMATE_DB` points at another file, or `:memory:`. The environment guard refuses a path outside the project.

## Environments

| Environment | Database | Providers | Who changes it |
| --- | --- | --- | --- |
| Local (this machine) | SQLite file, disposable | None: no payment service, no email | You, with `npm run db:reset` |
| Staging | Not set up yet: a Supabase project | None yet | CI, once the Supabase adapter exists |
| Production | Not set up yet: a Supabase project | None yet | You, from a production workflow only |

The hosted environments are not built yet. What is missing is in `KNOWN-ISSUES.md` and under *Deferred* in `docs/decisions.md`, with its due moment.

## Secrets

None are needed to run the app locally, and none may be added to this machine. Hosted credentials belong in the hosting and CI settings, never in `.env.local`:

- **Supabase:** the project URL and anon key for the app; a service-role key only in server code, never sent to the browser.
- **Vercel:** a deploy token stored as a GitHub secret, not on any laptop.
- **GitHub:** repository secrets for the staging and production workflows, scoped to each environment.

`.env.example` lists the names, so a later setup does not invent new ones.

## Owner setup steps (once hosting is wanted)

1. Create a GitHub repository and push this project (the agent never pushes).
2. Create the Supabase project for staging, then one for production. Note both project URLs and anon keys; keep the service-role keys out of the repository.
3. In Vercel, import the repository twice: one project for staging (branch `main`) and one for production (production branch, manual promotions only).
4. Add the environment variables above in Vercel per environment, and the deploy token as a GitHub secret scoped to the `production` environment.
5. Merge a pull request and watch staging receive the migrations before the new code.
6. Only then decide the domain, search-engine settings and privacy pages (stage 5).

## Where the code lives

| Path | What it holds |
| --- | --- |
| `src/app/page.tsx` | Groups list and the create-group form |
| `src/app/groups/[id]/page.tsx` | One group: balances, who pays whom, expenses, payments, people |
| `src/app/groups/[id]/expenses/[expenseId]/edit/page.tsx` | Correct or delete one expense |
| `src/app/actions.ts` | Server actions for every form: validate, save, revalidate |
| `src/lib/domain/` | Money parsing, equal splitting, balances, debt simplification |
| `src/lib/validation.ts` | Server-side validation for every form; the source of truth |
| `src/lib/db/` | Schema, local connection, repository (the only data access) |
| `src/components/ui/` | Shared, accessible building blocks (button, field, card) |
| `src/components/forms/` | One client form per action, with pending and error states |
| `src/components/group/` | Read-only group views (balances, transfers, lists) |
| `scripts/` | Environment guard, reset, seed and smoke test |
| `docs/` | Product documents, decisions and the plan |
