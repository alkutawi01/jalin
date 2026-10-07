/** After signing in the editor goes back to the admin page they were on, and never to another site. */
import fs from "node:fs";
import path from "node:path";
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

// The address asked for is remembered WITH its query: "/admin/settings?tab=audiens" was sent to the login page as "/admin/settings",
// so after signing in the visitor landed on another tab of Tetapan, or on an unfiltered list.
assert(safeReturnTo("/admin/settings?tab=audiens") === "/admin/settings?tab=audiens" && safeReturnTo("/admin/works?status=published") === "/admin/works?status=published", "a destination keeps its tab or its filter");
const middleware = fs.readFileSync(path.join(__dirname, "..", "src/middleware.ts"), "utf8");
assert((middleware.match(/searchParams\.set\("returnTo", pathname \+ request\.nextUrl\.search\)/g) ?? []).length === 2 && !middleware.includes('searchParams.set("returnTo", pathname)'), "both redirects to the login page send the query along");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
