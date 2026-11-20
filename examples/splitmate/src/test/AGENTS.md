# Rules for tests

Tests sit next to the code they cover (`*.test.ts`, `*.test.tsx`). This folder holds the tests that need their own place, such as the environment guard.

## Layers
- **Domain** (`src/lib/domain/*.test.ts`): pure functions, node environment. Balances, splitting and money parsing live here; every money rule gets a test.
- **Data layer** (`src/lib/db/*.test.ts`): `createDatabase(":memory:")` in `beforeEach`, closed in `afterEach`. Never touch `.data/`.
- **Actions** (`src/app/actions.test.ts`): real repository on an in-memory database, with `next/cache` and `next/navigation` mocked. These tests prove validation, splitting, saving and the message the owner sees.
- **Components** (`src/components/**/*.test.tsx`): first line `// @vitest-environment jsdom`, `afterEach(cleanup)`. Assert what a person can read or operate: roles, accessible names, sentences.

## Rules
- Tests follow the requirement, not the current output. Never weaken, skip or delete one to get a pass.
- Every test that matters covers one failure path as well as the happy path: a refused amount, a person from another group, a duplicate name.
- Amounts in tests are integer cents; assert totals, not formatted strings, except where formatting is the point.
- Fixtures are small and built in the test (`form({...})`, `seedGroupWithPeople`). No shared mutable fixtures across files.
- Run everything with `npm test`; one file with `npx vitest run <path>`; types are part of `npm run verify`.
