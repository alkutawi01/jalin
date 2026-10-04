/** After signing in the editor goes back to the admin page they were on, and never to another site. */
import { safeReturnTo } from "../src/lib/admin/return-to";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}

assert(safeReturnTo("/admin/works/JLN-CER-0001") === "/admin/works/JLN-CER-0001", "an admin page is kept");
assert(safeReturnTo("/admin/works/JLN-CER-0001#content") === "/admin/works/JLN-CER-0001#content", "the tab (hash) is kept");
assert(safeReturnTo("/admin/series?x=1") === "/admin/series?x=1", "a query string is kept");
assert(safeReturnTo("/admin") === "/admin", "the admin home is kept");
assert(safeReturnTo(null) === "/admin" && safeReturnTo(undefined) === "/admin" && safeReturnTo("") === "/admin", "nothing given: the admin home");
assert(safeReturnTo("https://evil.example/admin") === "/admin", "another site is refused");
assert(safeReturnTo("//evil.example/admin") === "/admin", "a protocol-relative address is refused");
assert(safeReturnTo("/\\evil.example") === "/admin" && safeReturnTo("/admin\\..\\x") === "/admin", "backslash tricks are refused");
assert(safeReturnTo("/administrator") === "/admin" && safeReturnTo("/") === "/admin" && safeReturnTo("/kategori/cerpen") === "/admin", "paths outside the admin are refused");
assert(safeReturnTo("/admin/login") === "/admin" && safeReturnTo("/admin/login?returnTo=%2Fadmin") === "/admin", "the login page itself is not a destination");
assert(safeReturnTo("/admin/x\nSet-Cookie: a=b") === "/admin", "control characters are refused");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
