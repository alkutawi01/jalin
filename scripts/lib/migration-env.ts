import fs from "node:fs";
import path from "node:path";
import { parse } from "dotenv";

type Environment = Record<string, string | undefined>;

/** Shell > .env.local > .env, without changing the parent process environment. */
export function mergeMigrationEnvironment(
  shell: Environment,
  base: Environment,
  local: Environment,
): Environment {
  const result: Environment = { ...base, ...local };
  // A file must never grant permission to operate on a non-development database.
  for (const key of ["ALLOW_NON_DEV_DATABASE", "VERCEL", "GITHUB_ACTIONS"]) delete result[key];
  for (const [key, value] of Object.entries(shell)) {
    if (value !== undefined) result[key] = value;
  }
  return result;
}

export function loadMigrationEnvironment(root: string, shell: Environment = process.env): Environment {
  const read = (name: string): Environment => {
    const file = path.join(root, name);
    try {
      return parse(fs.readFileSync(file));
    } catch (error) {
      if (error instanceof Error && "code" in error && error.code === "ENOENT") return {};
      throw new Error("Unable to read migration environment file.");
    }
  };
  return mergeMigrationEnvironment(shell, read(".env"), read(".env.local"));
}
