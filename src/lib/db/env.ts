import { createHash } from "node:crypto";

/**
 * Local work (the dev server, scripts, tests) may only use the development database branch ("pembangunan") or a database on this
 * machine. Any other host is refused unless ALLOW_NON_DEV_DATABASE=yes is set on purpose. Vercel and GitHub Actions are exempt:
 * production runs there. Hosts are compared by SHA-256 so no infrastructure name is kept in this public repository.
 */
const DEV_DATABASE_HOST_SHA256 = new Set([
  "6972004e5d654e05b5df20e507d1e2ce7a265c49bf7e9088969857e40d5264bc", // pooled endpoint of the development branch
  "c5fe8746e6bc63790c6a66d636ddc13a85d5330d1ca59cabcd38fbe1cbf29269", // direct endpoint of the development branch
]);

export function isLocalDatabaseHost(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1" || hostname === "[::1]";
}

export function assertDatabaseAllowedHere(
  parsed: URL,
  variableName: string,
  env: Record<string, string | undefined> = process.env,
  sha256Hex: (text: string) => string = defaultSha256
): void {
  if (env.VERCEL || env.GITHUB_ACTIONS) return;
  if (env.ALLOW_NON_DEV_DATABASE === "yes") return;
  if (isLocalDatabaseHost(parsed.hostname)) return;
  if (DEV_DATABASE_HOST_SHA256.has(sha256Hex(parsed.hostname))) return;
  throw new Error(
    `${variableName} points at a database that is not the development branch. Local work must use the "pembangunan" branch. ` +
      "To use another database on purpose, set ALLOW_NON_DEV_DATABASE=yes for that one command."
  );
}

function defaultSha256(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

export function getRuntimeDatabaseUrl(): string | undefined {
  const value = process.env.DATABASE_URL?.trim();
  if (!value) return undefined;

  assertDatabaseAllowedHere(validatePostgresUrl(value, "DATABASE_URL"), "DATABASE_URL");
  return value;
}

function validatePostgresUrl(value: string, variableName: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`${variableName} must be a valid PostgreSQL connection URL.`);
  }

  if (parsed.protocol !== "postgresql:" && parsed.protocol !== "postgres:") {
    throw new Error(
      `${variableName} must use the postgres:// or postgresql:// protocol.`
    );
  }

  return parsed;
}

export function requireMigrationDatabaseUrl(): string {
  const value = process.env.DATABASE_URL_UNPOOLED?.trim();

  if (!value) {
    throw new Error(
      "DATABASE_URL_UNPOOLED is required for schema migrations."
    );
  }

  const parsed = validatePostgresUrl(value, "DATABASE_URL_UNPOOLED");
  assertDatabaseAllowedHere(parsed, "DATABASE_URL_UNPOOLED");

  if (parsed.hostname.includes("-pooler")) {
    throw new Error(
      "DATABASE_URL_UNPOOLED must use a direct connection, not a pooled endpoint."
    );
  }

  return value;
}

export function getDatabasePoolSize(): number {
  const raw = process.env.DATABASE_POOL_SIZE?.trim() || "5";
  const value = Number(raw);

  if (!Number.isInteger(value) || value < 1) {
    throw new Error("DATABASE_POOL_SIZE must be a positive integer.");
  }

  return value;
}

export function databaseSslEnabled(): boolean {
  return process.env.DATABASE_SSL === "true";
}
