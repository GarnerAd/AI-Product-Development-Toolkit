#!/usr/bin/env node
/**
 * Environment guard. Runs before dev, build, test and every database command.
 * It refuses a database outside the project and any hosted service address,
 * because this machine is never allowed to hold hosted credentials.
 */

import { isAbsolute, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "0.0.0.0", "[::1]"]);

/** Variables a hosted setup would use. Any value that is not local is refused. */
const ADDRESS_VARIABLES = [
  "DATABASE_URL",
  "POSTGRES_URL",
  "POSTGRES_PRISMA_URL",
  "SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
];

/** Variables that must not exist on a development machine at all. */
const CREDENTIAL_VARIABLES = [
  "SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_DB_PASSWORD",
  "VERCEL_TOKEN",
];

export const DEFAULT_DB = ".data/splitmate.db";

function hostOf(value) {
  try {
    return new URL(value).hostname;
  } catch {
    return value.replace(/^[a-z]+:\/\//i, "").split("/")[0].split(":")[0];
  }
}

function isLocalAddress(value) {
  const host = hostOf(value);
  return LOCAL_HOSTS.has(host) || host.endsWith(".localhost");
}

/**
 * @param {Record<string, string | undefined>} env
 * @param {string} cwd
 * @returns {{ ok: boolean, problems: string[], databasePath: string }}
 */
export function checkEnvironment(env = process.env, cwd = process.cwd()) {
  const problems = [];

  const configured = (env.SPLITMATE_DB ?? "").trim();
  let databasePath = resolve(cwd, DEFAULT_DB);

  if (configured === ":memory:") {
    databasePath = ":memory:";
  } else if (configured !== "") {
    databasePath = isAbsolute(configured) ? resolve(configured) : resolve(cwd, configured);
    const rel = relative(cwd, databasePath);
    if (rel === "" || rel.startsWith("..") || isAbsolute(rel)) {
      problems.push(
        `SPLITMATE_DB points outside the project (${databasePath}). Keep the database inside the project folder.`,
      );
    }
  }

  for (const name of ADDRESS_VARIABLES) {
    const value = env[name];
    if (value && !isLocalAddress(value)) {
      problems.push(
        `${name} points at a hosted service (${hostOf(value)}). This project only talks to local addresses.`,
      );
    }
  }

  for (const name of CREDENTIAL_VARIABLES) {
    if (env[name]) {
      problems.push(
        `${name} is set. Hosted credentials never sit on this machine; store them in the hosting and CI settings.`,
      );
    }
  }

  return { ok: problems.length === 0, problems, databasePath };
}

function main() {
  const { ok, problems, databasePath } = checkEnvironment();
  if (!ok) {
    console.error("Stopped by the environment guard:");
    for (const problem of problems) console.error(` - ${problem}`);
    console.error(
      "Fix the value, or unset it, then run the same command again. Nothing was changed.",
    );
    process.exit(1);
  }
  const shown = databasePath === ":memory:" ? ":memory:" : relative(process.cwd(), databasePath);
  console.log(`Environment guard passed. Database: ${shown || databasePath}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
