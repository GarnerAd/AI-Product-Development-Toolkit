# Known issues

Open problems only. Delete an entry when it's fixed; Git keeps the history. This isn't a task list: work on an issue only when a slice or the owner asks for it.

<!-- Entry format:
## KI-<n> · <one-line title>
**Found:** <date> · **Severity:** high / medium / low
What happens and how to reproduce it. What's known about the cause, with guesses labelled as guesses. What fixing it involves.
-->

## KI-1 · No hosted database adapter yet
**Found:** 2026-11-20 · **Severity:** medium
Development runs on an embedded SQLite file. A hosted deploy needs a Supabase adapter behind `Repository` in `src/lib/db/`, plus migrations applied by CI. Until then, staging and production cannot be created, and the Supabase CLI is not installed. Fixing it means writing the adapter, moving the SQL migrations to `supabase/migrations/`, and adding the pipeline slices.

## KI-2 · No browser end-to-end tests
**Found:** 2026-11-20 · **Severity:** medium
Forms are covered by tests that call the server actions and by a smoke test that reads the rendered pages, but no test drives a real browser. Playwright needs a browser download that this machine may not reach. Fixing it means adding Playwright, a browser install step in CI, and one journey test: create a group, add two people, add an expense, correct it, settle it.

## KI-3 · No way to delete a whole group
**Found:** 2026-11-20 · **Severity:** low
A group can be created but not deleted, so test groups stay in the list. Deleting a group would take its expenses, shares and payments with it, and needs its own confirmation. Recorded under *Deferred* in `docs/decisions.md`.

## KI-4 · One workspace, no accounts
**Found:** 2026-11-20 · **Severity:** low
Every visitor of a running instance sees every group. Fine for a single household on one machine; not safe once the app is online. Hosted access control is a launch item.

## KI-5 · The 404 page is painted after hydration
**Found:** 2026-11-20 · **Severity:** low
Next.js 16 answers `notFound()` from a dynamic page with the 404 status and a shell whose body is filled by the browser. People see the explanation as soon as the page loads; clients without JavaScript (and some crawlers) receive an empty body. Fixing it means a static not-found route for unknown group addresses, or a route handler that returns the HTML with the 404 status. The smoke test checks the status and the returned flight payload.
