import { describe, expect, it } from "vitest";

import { checkEnvironment } from "../../scripts/check-env.mjs";

const cwd = "/project";

describe("the environment guard", () => {
  it("accepts the default local database", () => {
    const result = checkEnvironment({}, cwd);
    expect(result.ok).toBe(true);
    expect(result.databasePath).toBe("/project/.data/splitmate.db");
  });

  it("accepts a database file inside the project and an in-memory database", () => {
    expect(checkEnvironment({ SPLITMATE_DB: ".data/dev.db" }, cwd).ok).toBe(true);
    expect(checkEnvironment({ SPLITMATE_DB: ":memory:" }, cwd).ok).toBe(true);
  });

  it("refuses a database outside the project", () => {
    const result = checkEnvironment({ SPLITMATE_DB: "/etc/splitmate.db" }, cwd);
    expect(result.ok).toBe(false);
    expect(result.problems.join(" ")).toMatch(/SPLITMATE_DB points outside the project/);
  });

  it("refuses a hosted database or service address", () => {
    const result = checkEnvironment(
      { SUPABASE_URL: "https://abcdefgh.supabase.co" },
      cwd,
    );
    expect(result.ok).toBe(false);
    expect(result.problems.join(" ")).toMatch(/hosted service/);
  });

  it("allows a local Supabase address, which is what the local stack would use", () => {
    expect(checkEnvironment({ SUPABASE_URL: "http://127.0.0.1:54321" }, cwd).ok).toBe(true);
  });

  it("refuses hosted credentials of any kind", () => {
    const result = checkEnvironment({ SUPABASE_SERVICE_ROLE_KEY: "secret" }, cwd);
    expect(result.ok).toBe(false);
    expect(result.problems.join(" ")).toMatch(/never sit on this machine/);
  });
});
