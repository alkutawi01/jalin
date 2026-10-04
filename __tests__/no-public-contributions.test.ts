/** Contribution data is not served publicly: no route under /api/public, and the privacy projection still exists. */
import fs from "node:fs";
import path from "node:path";
import { toPublicProjection, verifyPrivacyBoundary } from "../src/lib/admin/identity-handshake";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}

const apiRoot = path.join(__dirname, "..", "src", "app", "api");
function routes(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? routes(path.join(dir, e.name)) : e.name === "route.ts" ? [path.join(dir, e.name)] : []));
}
const all = routes(apiRoot).map((f) => path.relative(apiRoot, f).split(path.sep).join("/"));

assert(!fs.existsSync(path.join(apiRoot, "public")), "there is no /api/public tree");
assert(!all.some((r) => /contribution/i.test(r) && !r.startsWith("admin/")), "every contribution route is under /api/admin (behind the session check)");
assert(typeof toPublicProjection === "function" && typeof verifyPrivacyBoundary === "function", "the privacy projection helpers remain for future use");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
