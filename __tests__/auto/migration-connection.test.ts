import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { test } from "node:test";
import { Client } from "pg";
import { loadMigrationEnvironment, mergeMigrationEnvironment } from "../../scripts/lib/migration-env";
import { migrationConnection, migrationExpectedHost, migrationFailureMessage } from "../../src/lib/db/migration-connection";

// Deliberately fictitious credentials/hosts; these tests never connect to a database.
const direct = "postgresql://fixture:fixture@production.example.invalid/jalin";
const authorized = { DATABASE_URL_UNPOOLED: direct, ALLOW_NON_DEV_DATABASE: "yes" };
const expectedHost = "production.example.invalid";

test("shell wins over local and base env files; files cannot authorize production", () => {
  const shell = { DATABASE_URL_UNPOOLED: direct, DATABASE_SSL: "true", ALLOW_NON_DEV_DATABASE: "yes" };
  const base = { DATABASE_URL_UNPOOLED: "base", DATABASE_SSL: "false", BASE_ONLY: "base" };
  const local = { DATABASE_URL_UNPOOLED: "local", BASE_ONLY: "local", LOCAL_ONLY: "local" };
  assert.deepEqual(mergeMigrationEnvironment(shell, base, local), { ...base, ...local, ...shell });
  assert.equal(shell.DATABASE_URL_UNPOOLED, direct);
  const untrusted = mergeMigrationEnvironment({}, { ALLOW_NON_DEV_DATABASE: "yes" }, { VERCEL: "1", GITHUB_ACTIONS: "true" });
  for (const key of ["ALLOW_NON_DEV_DATABASE", "VERCEL", "GITHUB_ACTIONS"]) assert.equal(untrusted[key], undefined);
  assert.equal(mergeMigrationEnvironment({ DATABASE_URL_UNPOOLED: "" }, {}, local).DATABASE_URL_UNPOOLED, "");
  assert.equal(mergeMigrationEnvironment({ LOCAL_ONLY: undefined }, {}, local).LOCAL_ONLY, "local");
});

test("env files are read without modifying process.env or printing their contents", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "jalin-migration-env-test-"));
  const before = { ...process.env };
  try {
    fs.writeFileSync(path.join(dir, ".env"), "DATABASE_URL_UNPOOLED=base\nBASE_ONLY=base\n");
    fs.writeFileSync(path.join(dir, ".env.local"), "DATABASE_URL_UNPOOLED=local\nALLOW_NON_DEV_DATABASE=yes\nBASE_ONLY=local\n");
    const env = loadMigrationEnvironment(dir, { DATABASE_URL_UNPOOLED: direct });
    assert.equal(env.DATABASE_URL_UNPOOLED, direct);
    assert.equal(env.BASE_ONLY, "local");
    assert.equal(env.ALLOW_NON_DEV_DATABASE, undefined);
    // A failed assertion must never dump the process environment (it can carry real tokens).
    const after = { ...process.env };
    assert.equal(Object.keys(after).length === Object.keys(before).length &&
      Object.entries(before).every(([key, value]) => after[key] === value), true,
    "the process environment must remain unchanged");
    fs.unlinkSync(path.join(dir, ".env"));
    fs.unlinkSync(path.join(dir, ".env.local"));
    assert.deepEqual(loadMigrationEnvironment(dir, {}), {});
  } finally {
    for (const name of [".env", ".env.local"]) {
      const file = path.join(dir, name);
      if (fs.existsSync(file)) fs.unlinkSync(file);
    }
    fs.rmdirSync(dir);
  }
});

test("remote non-development database requires explicit shell permission and matching host", () => {
  for (const env of [
    { DATABASE_URL_UNPOOLED: direct },
    { DATABASE_URL_UNPOOLED: direct, VERCEL: "1" },
    { DATABASE_URL_UNPOOLED: direct, GITHUB_ACTIONS: "true" },
  ]) assert.throws(() => migrationConnection(env, expectedHost), /not the development branch/);
  assert.throws(() => migrationConnection(authorized), /--expected-host/);
  assert.throws(() => migrationConnection(authorized, "wrong.example.invalid"), /does not match/);
  assert.equal(migrationConnection(authorized, expectedHost).host, expectedHost);
  assert.equal(migrationExpectedHost(["--expected-host", expectedHost]), expectedHost);
  assert.equal(migrationExpectedHost([]), undefined);
  for (const args of [["--expected-host"], ["--unexpected", expectedHost], ["--expected-host", direct], ["--expected-host", expectedHost, "extra"]]) {
    assert.throws(() => migrationExpectedHost(args));
  }
});

test("missing, malformed, pooled and placeholder URLs fail before constructing a pool", () => {
  for (const url of ["", "fixture-not-a-url", "https://production.example.invalid", "postgresql://<paste>", direct.replace("production.", "production-pooler.")]) {
    assert.throws(() => migrationConnection({ ...authorized, DATABASE_URL_UNPOOLED: url }, expectedHost));
  }
});

test("URL query parameters cannot redirect the host or override connection credentials", () => {
  for (const key of ["host", "hostaddr", "port", "user", "password", "database", "sslrootcert", "sslcert", "sslkey"]) {
    assert.throws(() => migrationConnection({ ...authorized, DATABASE_URL_UNPOOLED: `${direct}?${key}=fixture` }, expectedHost), /unsupported connection override/);
  }
});

test("effective pg TLS options always verify certificates for a remote database", () => {
  for (const query of ["", "?sslmode=require", "?sslmode=verify-ca", "?sslmode=verify-full", "?ssl=true", "?ssl=1", "?sslmode=require&uselibpqcompat=true", "?application_name=jalin-migration"]) {
    const { poolOptions } = migrationConnection({ ...authorized, DATABASE_URL_UNPOOLED: direct + query }, expectedHost);
    // Constructing a Client parses options but does not open a socket.
    const client = new Client(poolOptions) as unknown as { connectionParameters: { host: string; ssl: unknown } };
    assert.equal(client.connectionParameters.host, expectedHost);
    assert.deepEqual(client.connectionParameters.ssl, { rejectUnauthorized: true });
    assert.equal(poolOptions.max, 1);
    assert.equal(poolOptions.connectionTimeoutMillis, 15_000);
  }
});

test("TLS downgrade attempts and ambiguous duplicate options are rejected", () => {
  for (const query of ["?sslmode=disable", "?sslmode=prefer", "?sslmode=no-verify", "?ssl=false", "?ssl=0", "?sslmode=require&sslmode=disable", "?ssl=true&ssl=false"]) {
    assert.throws(() => migrationConnection({ ...authorized, DATABASE_URL_UNPOOLED: direct + query }, expectedHost));
  }
  for (const env of [{ ...authorized, DATABASE_SSL: "false" }, { ...authorized, DATABASE_SSL_INSECURE: "true" }]) {
    assert.throws(() => migrationConnection(env, expectedHost), /certificate-verified TLS/);
  }
});

test("local databases can use plaintext explicitly; local TLS still verifies certificates", () => {
  for (const host of ["localhost", "127.0.0.1", "[::1]"]) {
    const env = { DATABASE_URL_UNPOOLED: `postgresql://fixture:fixture@${host}/jalin` };
    assert.equal(migrationConnection(env).poolOptions.ssl, false);
    assert.deepEqual(migrationConnection({ ...env, DATABASE_SSL: "true" }).poolOptions.ssl, { rejectUnauthorized: true });
  }
});

test("both CLI entry points reject unsafe input without revealing a URL or connecting", () => {
  const root = path.resolve(__dirname, "..", "..");
  for (const [file, args] of [
    ["db-schema-migrate.ts", []],
    ["db-run-one-migration.ts", ["036_card_channel_and_redeem_by"]],
  ] as const) {
    const result = spawnSync(process.execPath, [path.join(root, "node_modules", "tsx", "dist", "cli.mjs"), path.join(root, "scripts", file), ...args], {
      cwd: root,
      env: { ...process.env, DATABASE_URL_UNPOOLED: "postgresql://fixture-password@<placeholder>/jalin", ALLOW_NON_DEV_DATABASE: "", VERCEL: "", GITHUB_ACTIONS: "" },
      encoding: "utf8",
      timeout: 15_000,
    });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /must not contain a placeholder/);
    assert.doesNotMatch(result.stderr + result.stdout, /fixture-password|postgresql:|Database host:|Running schema|applied/);
  }
});

test("driver errors expose only a validated error code", () => {
  assert.equal(migrationFailureMessage({ code: "ECONNREFUSED", message: direct }), "Migration failed (code ECONNREFUSED).");
  assert.equal(migrationFailureMessage({ code: direct, detail: direct }), "Migration failed. Connection details have been withheld.");
  assert.doesNotMatch(migrationFailureMessage(new Error(direct)), /fixture|postgresql:/);
});
