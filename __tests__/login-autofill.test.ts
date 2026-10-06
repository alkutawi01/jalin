/** The login fields had no name or autocomplete, so a password manager could not tell what to fill or save. */
import fs from "node:fs";
import path from "node:path";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}
const page = fs.readFileSync(path.join(__dirname, "../src/app/admin/login/page.tsx"), "utf8").replace(/\r\n/g, "\n");
assert(/id="email"\s+name="email"\s+type="email"\s+autoComplete="username"/.test(page), "the e-mail field is named and marked as the username");
assert(/id="password"\s+name="password"\s+type="password"\s+autoComplete="current-password"/.test(page), "the password field is named and marked as the current password");
console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
