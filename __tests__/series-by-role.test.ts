/**
 * Found in the 8 Okt simulation as an editor: the Siri list offered "+ Tambah siri" and "Edit", and the pages behind them opened,
 * although only the chief editor and the owner may manage series (every save ended in "Anda tidak mempunyai kebenaran").
 */
import fs from "node:fs";
import path from "node:path";
import { can, isAllowed, permissionFor } from "../src/lib/admin/permissions";

let passed = 0, failed = 0;
function assert(c: boolean, m: string) { if (c) { passed++; console.log(`  ✓ ${m}`); } else { failed++; console.error(`  ✗ ${m}`); } }
const read = (p: string) => fs.readFileSync(path.join(__dirname, "..", p), "utf8").replace(/\r\n/g, "\n");

assert(can("owner", "series.manage") && can("chief_editor", "series.manage") && !can("editor", "series.manage"), "owner and chief editor manage series; an editor does not");
assert(isAllowed("editor", "GET", "/admin/series") && isAllowed("chief_editor", "GET", "/admin/series"), "every role may see the list of series");
assert(!isAllowed("editor", "GET", "/admin/series/new") && !isAllowed("editor", "GET", "/admin/series/abc-123") && isAllowed("chief_editor", "GET", "/admin/series/new") && isAllowed("chief_editor", "GET", "/admin/series/abc-123") && isAllowed("owner", "GET", "/admin/series/abc-123"), "the new-series and edit pages are for those who manage series");
assert(permissionFor("GET", "/admin/series/abc-123") === "series.manage" && permissionFor("GET", "/admin/series") === "content.read", "only the single-series pages need series.manage, not the list");
assert(!isAllowed("editor", "POST", "/api/admin/series") && isAllowed("chief_editor", "POST", "/api/admin/series"), "the API rule is unchanged");

const page = read("src/app/admin/series/page.tsx");
assert(page.includes('can((admin && roleFromClaim(admin.role)) || "owner", "series.manage")'), "the list asks what the role may do (the owner is assumed in dev)");
assert(page.includes("{canManage ? (") && page.includes("+ Tambah siri") && page.indexOf("{canManage ? (") < page.indexOf("+ Tambah siri"), "'+ Tambah siri' is offered only to those who manage series");
assert(page.includes("{canManage ? <a href={`/admin/series/${s.id}`}") && (page.match(/\{canManage \? \(/g) ?? []).length === 2, "the title link and the Edit button are offered only to them; an editor sees the title as plain text");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
