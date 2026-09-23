export function getRuntimeDatabaseUrl(): string | undefined {
  const value = process.env.DATABASE_URL?.trim();
  if (!value) return undefined;

  validatePostgresUrl(value, "DATABASE_URL");
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
