# Rules for CI

`.github/workflows/ci.yml` is the only workflow. It runs on every push and pull request and uses the local database and fakes only.

## What must stay true
- **Minimal permissions.** `contents: read`, nothing else; checkout keeps no credentials.
- **One place to look.** Lint, types, tests, build and the smoke test run in that order; a failure stops the run.
- **Local only.** The job sets `SPLITMATE_DB` inside the workspace. No hosted credentials, no Supabase or Vercel tokens, no database URLs.
- **No double build.** The smoke test runs with `SKIP_BUILD=1` after `npm run build`.
- **Bounded.** A job timeout and a concurrency group that cancels superseded runs.

## Not built yet
Staging and production workflows, with migrations before code, arrive with the Supabase adapter (see *Deferred* in `docs/decisions.md`). Until then this repository has no deployment workflow, which is deliberate: nothing here can reach a hosted environment.

## When changing it
Read the current GitHub Actions and Next.js documentation for the versions in use, then record the source in this file. Ask the owner before changing anything a deploy depends on.
