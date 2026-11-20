# Rules for this folder (data layer)

The only place that talks to the database. Product code imports this folder, never `node:sqlite`.

## Working here
- **One interface.** Everything goes through `Repository` in `repository.ts`. Need a query? Add a method to the interface, implement it, and add a test; never import the driver from `src/app/` or `src/components/`.
- **Migrations only.** Schema changes are new entries in `MIGRATIONS` in `schema.ts`. Never edit an entry that has run anywhere: local databases, staging and production have already applied it. Name it `NNN-short-name`.
- **Cents, integers.** Money is integer cents in every column, type and function. No floats, no formatted strings.
- **SQL rules.** Positional parameters only; no string interpolation. Write statements once per repository (`db.prepare` at construction), keep the SQL in this folder, and let foreign keys enforce membership.
- **Integrity checks.** Shares must add up to the expense amount; a payer and every participant must belong to the group. Throw the typed errors in `errors.ts` so the forms can explain the problem.
- **Transactions.** Multi-row writes run inside `BEGIN`/`COMMIT` with `ROLLBACK` on failure, as `addExpense` does.

## Database files
- Local file: `.data/splitmate.db`, chosen by `SPLITMATE_DB`. Keep it inside the project; the environment guard refuses anything else.
- Tests use `createDatabase(":memory:")` per test; never a file, never the app's singleton.
- `:memory:` databases cannot use WAL; `createDatabase` already skips it for them.

## Hosted path
The Supabase adapter replaces this module behind the same interface. When it arrives: move the SQL into `supabase/migrations/`, keep the same column names, and keep every method's behaviour identical, including ordering.
