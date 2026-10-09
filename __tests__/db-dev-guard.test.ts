/**
 * Local work could write to the production database because the dev server and every script read the same DATABASE_URL.
 * Locally only the development branch (or a database on this machine) is allowed; Vercel and CI are exempt.
 */
import { createHash } from "node:crypto";
import { assertDatabaseAllowedHere, isLocalDatabaseHost } from "../src/lib/db/env";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string, detail?: unknown) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`, detail ?? ""); }
}
const HASH_POOLED = "6972004e5d654e05b5df20e507d1e2ce7a265c49bf7e9088969857e40d5264bc";
const HASH_DIRECT = "c5fe8746e6bc63790c6a66d636ddc13a85d5330d1ca59cabcd38fbe1cbf29269";
// Stand-in names for the two development endpoints, so no real host name is written in this public repository.
const standIn = (host: string) => (host === "dev-pooled.invalid" ? HASH_POOLED : host === "dev-direct.invalid" ? HASH_DIRECT : createHash("sha256").update(host).digest("hex"));
const refused = (url: string, env: Record<string, string | undefined> = {}) => {
  try { assertDatabaseAllowedHere(new URL(url), "DATABASE_URL", env, standIn); return false; } catch { return true; }
};

const devPooled = "dev-pooled.invalid";
const devDirect = "dev-direct.invalid";

assert(!refused(`postgresql://u:p@${devPooled}/jalin`), "the development branch (pooled endpoint) is allowed locally");
assert(!refused(`postgresql://u:p@${devDirect}/jalin`), "the development branch (direct endpoint) is allowed locally");
assert(!refused("postgresql://u:p@localhost:5432/jalin") && !refused("postgres://u:p@127.0.0.1/jalin") && !refused("postgres://u:p@[::1]/jalin"), "a database on this machine is allowed");
assert(refused("postgresql://u:p@ep-other-thing-pooler.c-4.ap-southeast-1.aws.neon.tech/jalin"), "any other host is refused locally");
assert(refused("postgresql://u:p@ep-other-thing.c-4.ap-southeast-1.aws.neon.tech/jalin", { NODE_ENV: "production" }), "a production build run on this machine is still refused");
assert(!refused("postgresql://u:p@ep-other-thing.c-4.ap-southeast-1.aws.neon.tech/jalin", { VERCEL: "1" }), "Vercel is exempt (production runs there)");
assert(!refused("postgresql://u:p@ep-other-thing.c-4.ap-southeast-1.aws.neon.tech/jalin", { GITHUB_ACTIONS: "true" }), "GitHub Actions is exempt");
assert(!refused("postgresql://u:p@ep-other-thing.c-4.ap-southeast-1.aws.neon.tech/jalin", { ALLOW_NON_DEV_DATABASE: "yes" }), "the explicit override works");
assert(refused("postgresql://u:p@ep-other-thing.c-4.ap-southeast-1.aws.neon.tech/jalin", { ALLOW_NON_DEV_DATABASE: "true" }), "only the exact word yes overrides");
assert(isLocalDatabaseHost("localhost") && !isLocalDatabaseHost("localhost.evil.example"), "a host that merely starts with localhost is not local");
assert(refused("postgresql://u:p@localhost.evil.example/jalin"), "a look-alike local name is refused");

// The repository keeps only hashes: neither endpoint name may appear in the source.
import fs from "node:fs";
import path from "node:path";
const source = fs.readFileSync(path.join(__dirname, "..", "src/lib/db/env.ts"), "utf8");
assert(!/neon\.tech/.test(source), "no database host name is written in the source");
assert(source.includes(HASH_POOLED) && source.includes(HASH_DIRECT), "the stored hashes are those of the development endpoints");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
