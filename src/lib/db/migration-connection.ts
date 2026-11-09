import type { PoolConfig } from "pg";
import { assertDatabaseAllowedHere, isLocalDatabaseHost, requireMigrationDatabaseUrl } from "./env";

type Environment = Record<string, string | undefined>;

export function migrationExpectedHost(args: string[]): string | undefined {
  if (args.length === 0) return undefined;
  if (args.length !== 2 || args[0] !== "--expected-host" || !/^[a-z0-9.:[\]-]+$/i.test(args[1])) {
    throw new Error("Expected --expected-host followed by a hostname only.");
  }
  return args[1].toLowerCase();
}

/** Build options only; no connection or migration is performed here. */
export function migrationConnection(env: Environment, expectedHost?: string): { host: string; poolOptions: PoolConfig } {
  if (/[<>]/.test(env.DATABASE_URL_UNPOOLED ?? "")) {
    throw new Error("DATABASE_URL_UNPOOLED must not contain a placeholder.");
  }
  // CI/runtime bypasses do not authorize schema changes.
  const guardedEnv = { ...env, VERCEL: undefined, GITHUB_ACTIONS: undefined };
  const parsed = new URL(requireMigrationDatabaseUrl(guardedEnv));
  const host = parsed.hostname.toLowerCase();
  if (!host || !/^[a-z0-9.:[\]-]+$/i.test(host)) throw new Error("Invalid migration database hostname.");
  if (expectedHost !== undefined && host !== expectedHost.toLowerCase()) {
    throw new Error("Migration database does not match --expected-host.");
  }
  let isDevelopment = true;
  try {
    assertDatabaseAllowedHere(parsed, "DATABASE_URL_UNPOOLED", {});
  } catch {
    isDevelopment = false;
  }
  if (!isDevelopment && !expectedHost) {
    throw new Error("Non-development migrations require --expected-host as well as ALLOW_NON_DEV_DATABASE=yes in the shell.");
  }
  // pg lets URL query parameters override authority fields and explicit Pool SSL options.
  for (const key of ["host", "hostaddr", "port", "user", "password", "database", "sslcert", "sslkey", "sslrootcert"]) {
    if (parsed.searchParams.has(key)) throw new Error("Migration URL contains an unsupported connection override.");
  }
  const local = isLocalDatabaseHost(host);
  const sslModes = parsed.searchParams.getAll("sslmode");
  const sslValues = parsed.searchParams.getAll("ssl");
  if (sslModes.length > 1 || sslValues.length > 1) throw new Error("Migration URL contains duplicate TLS options.");
  if (!local) {
    if (env.DATABASE_SSL === "false" || env.DATABASE_SSL_INSECURE === "true") {
      throw new Error("Remote migrations require certificate-verified TLS.");
    }
    if (sslModes.some((mode) => !["require", "verify-ca", "verify-full"].includes(mode)) ||
        sslValues.some((value) => !["true", "1"].includes(value))) {
      throw new Error("Migration URL must not disable TLS verification.");
    }
  }
  const ssl = !local || env.DATABASE_SSL === "true" ||
    sslValues.some((value) => ["true", "1"].includes(value)) ||
    sslModes.some((mode) => ["require", "verify-ca", "verify-full"].includes(mode));
  for (const key of ["sslmode", "ssl", "uselibpqcompat"]) parsed.searchParams.delete(key);
  return {
    host,
    poolOptions: {
      connectionString: parsed.toString(),
      ssl: ssl ? { rejectUnauthorized: true } : false,
      max: 1,
      connectionTimeoutMillis: 15_000,
    },
  };
}

/** Never pass driver messages/details through: they can include credentials or row values. */
export function migrationFailureMessage(error: unknown): string {
  const code = typeof error === "object" && error !== null && "code" in error ? error.code : undefined;
  return typeof code === "string" && /^[A-Z0-9_]{2,40}$/.test(code)
    ? `Migration failed (code ${code}).`
    : "Migration failed. Connection details have been withheld.";
}
