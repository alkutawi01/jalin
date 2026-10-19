/** 19 Okt: the admin session lapsed after 24 h (owner) / 12 h (staff). An editor stays signed in until they sign out. */
import fs from "node:fs";
import path from "node:path";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}
const auth = fs.readFileSync(path.join(__dirname, "..", "..", "src", "lib", "admin", "auth.ts"), "utf8").replace(/\r\n/g, "\n");
const days = (name: string) => {
  const line = auth.split("\n").find((l) => l.startsWith(`const ${name} = `)) ?? "";
  const m = line.match(/= (\d+) \* 24 \* 60 \* 60 \* 1000/);
  return m ? Number(m[1]) : 0;
};
assert(days("SESSION_EXPIRY") >= 90, "the owner's session lasts at least 90 days");
assert(days("STAFF_SESSION_EXPIRY") >= 90, "a staff session lasts at least 90 days");
assert(auth.includes("getStaff(") && auth.includes("!row.active"), "a staff account is still checked against the table on every request, so switching one off is immediate");
assert(auth.includes("cookieStore.delete(SESSION_COOKIE)"), "signing out clears the cookie");
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
