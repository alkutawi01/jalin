/**
 * The permission map for the admin: every admin API route and page is covered by a rule, and the roles can reach what they should and no more.
 * A new admin route without a rule fails here (and would be owner-only until it has one).
 */
import fs from "node:fs";
import path from "node:path";
import { ROLES, PERMISSIONS, ROLE_PERMISSIONS, can, isAllowed, permissionFor, roleFromClaim } from "../src/lib/admin/permissions";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}
const root = path.join(__dirname, "..");

// 1) coverage: every route file's exported methods, and every admin page
const apiRoutes: { url: string; methods: string[] }[] = [];
function walk(dir: string, visit: (file: string) => void) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, visit);
    else visit(full);
  }
}
walk(path.join(root, "src/app/api/admin"), (file) => {
  if (path.basename(file) !== "route.ts") return;
  const source = fs.readFileSync(file, "utf8");
  const methods = [...source.matchAll(/export\s+(?:async\s+)?function\s+(GET|POST|PATCH|PUT|DELETE)\b/g)].map((m) => m[1]!);
  const url = "/" + path.relative(path.join(root, "src/app"), path.dirname(file)).split(path.sep).join("/");
  apiRoutes.push({ url: url.replace(/\[[^\]]+\]/g, "x"), methods });
});
const pages: string[] = [];
walk(path.join(root, "src/app/admin"), (file) => {
  if (path.basename(file) !== "page.tsx") return;
  pages.push(("/" + path.relative(path.join(root, "src/app"), path.dirname(file)).split(path.sep).join("/")).replace(/\[[^\]]+\]/g, "x"));
});
const uncovered: string[] = [];
let checked = 0;
for (const route of apiRoutes) {
  for (const method of route.methods) {
    checked++;
    if (route.url === "/api/admin/auth/login") continue; // open by design (middleware lets it through)
    if (permissionFor(method, route.url) === null) uncovered.push(`${method} ${route.url}`);
  }
}
for (const page of pages) {
  checked++;
  if (page === "/admin/login") continue;
  if (permissionFor("GET", page) === null) uncovered.push(`GET ${page}`);
}
assert(apiRoutes.length > 60 && pages.length > 15, `the routes and pages were found (${apiRoutes.length} routes, ${pages.length} pages)`);
assert(uncovered.length === 0, `every admin route and page has a rule (${checked} checked)${uncovered.length ? ": missing " + uncovered.join(", ") : ""}`);

// 2) the owner can do everything; today's "admin" session is the owner
assert(roleFromClaim("admin") === "owner" && roleFromClaim("editor") === "editor" && roleFromClaim("root") === null && roleFromClaim(undefined) === null, "today's 'admin' session means owner; an unknown role means nothing");
assert(ROLES.every((r) => ROLE_PERMISSIONS[r].every((p) => (PERMISSIONS as readonly string[]).includes(p))), "every role only holds real permissions");
assert(PERMISSIONS.every((p) => can("owner", p)), "the owner holds every permission");
let ownerBlocked = 0;
for (const route of apiRoutes) for (const method of route.methods) if (!isAllowed("owner", method, route.url)) ownerBlocked++;
assert(ownerBlocked === 0, "the owner can use every admin route");

// 3) the answers Izzat gave: only the owner publishes; AI generation for the chief editor and up; editors upload pictures made elsewhere
const publish = [["POST", "/api/admin/works/w1/publish"], ["POST", "/api/admin/publish"]] as const;
assert(publish.every(([m, u]) => isAllowed("owner", m, u) && !isAllowed("chief_editor", m, u) && !isAllowed("editor", m, u)), "only the owner publishes");
assert(!isAllowed("chief_editor", "POST", "/api/admin/works/w1/revisions/r1/revert") && !isAllowed("chief_editor", "DELETE", "/api/admin/works/w1"), "restoring a version and deleting a work are the owner's");
const generate = [["POST", "/api/admin/generate"], ["POST", "/api/admin/visual-requests/v1/generate"], ["POST", "/api/admin/visual-requests/v1/poll"]] as const;
assert(generate.every(([m, u]) => isAllowed("chief_editor", m, u) && !isAllowed("editor", m, u)), "generating with an AI service (money) is for the chief editor and up, not an editor");
assert(isAllowed("editor", "POST", "/api/admin/works/w1/visuals/upload") && isAllowed("editor", "POST", "/api/admin/visual-requests/v1/upload"), "an editor can upload a picture made with an outside tool");
assert(!isAllowed("editor", "POST", "/api/admin/visual-requests/v1/approve") && isAllowed("chief_editor", "POST", "/api/admin/visual-requests/v1/approve"), "approving a generated picture is the chief editor's");

// 4) what an editor can and cannot reach
assert(isAllowed("editor", "PATCH", "/api/admin/works/w1") && isAllowed("editor", "POST", "/api/admin/works/w1/sections") && isAllowed("editor", "PATCH", "/api/admin/works/w1/characters"), "an editor edits works, sections and characters");
assert(isAllowed("editor", "POST", "/api/admin/credits") && isAllowed("editor", "POST", "/api/admin/glossary"), "an editor edits credits and the glossary");
assert(!isAllowed("editor", "POST", "/api/admin/series") && !isAllowed("editor", "PUT", "/api/admin/works/w1/source-rights") && isAllowed("chief_editor", "POST", "/api/admin/series") && isAllowed("chief_editor", "PUT", "/api/admin/works/w1/source-rights"), "series and source rights are the chief editor's");
const ownerOnly = [["POST", "/api/admin/contributors"], ["PATCH", "/api/admin/contributors/claude"], ["POST", "/api/admin/site-copy"], ["POST", "/api/admin/site-theme"], ["POST", "/api/admin/audience-bands"], ["POST", "/api/admin/authoring/settings"], ["POST", "/api/admin/prompts"], ["POST", "/api/admin/ai-personas"]] as const;
assert(ownerOnly.every(([m, u]) => isAllowed("owner", m, u) && !isAllowed("chief_editor", m, u) && !isAllowed("editor", m, u)), "contributors, personas, site settings and writing prompts are the owner's");
assert(isAllowed("editor", "POST", "/api/admin/authoring/prompt") && isAllowed("editor", "GET", "/api/admin/works") && isAllowed("editor", "GET", "/api/admin/editorial-dashboard"), "an editor can copy a chatbot prompt and read works and reports");
assert(!isAllowed("editor", "GET", "/admin/settings") && !isAllowed("chief_editor", "GET", "/admin/contributors") && isAllowed("editor", "GET", "/admin/works") && isAllowed("editor", "GET", "/admin"), "the settings and contributor pages are the owner's; the works pages are everyone's");
assert(isAllowed("editor", "POST", "/api/admin/auth/logout"), "everyone can log out");

// Readers, access and codes (Langganan): the owner only, every method, because they show e-mail addresses and give or take access.
const langganan: [string, string][] = [
  ["GET", "/api/admin/langganan/pembaca"], ["GET", "/api/admin/langganan/pembaca/abc"], ["POST", "/api/admin/langganan/pembaca/abc/beri"], ["POST", "/api/admin/langganan/entitlements/abc/batal"],
  ["POST", "/api/admin/langganan/batch"], ["POST", "/api/admin/langganan/batch/abc"], ["GET", "/api/admin/langganan/label-ujian"], ["POST", "/api/admin/langganan/kod/JLN-26-000001"],
  ["POST", "/api/admin/langganan/kod-kongsi"], ["PATCH", "/api/admin/langganan/kod-kongsi/abc"], ["POST", "/api/admin/langganan/suis"], ["GET", "/api/admin/langganan/eksport"],
  ["GET", "/admin/langganan"], ["GET", "/admin/langganan/kad"], ["GET", "/admin/langganan/kod-kongsi"], ["GET", "/admin/langganan/pembaca"]
];
assert(langganan.every(([m, u]) => isAllowed("owner", m, u) && !isAllowed("chief_editor", m, u) && !isAllowed("editor", m, u)), "the Langganan pages and their API are for the owner only, reads included");
assert(!can("chief_editor", "subscription.manage") && !can("editor", "subscription.manage") && can("owner", "subscription.manage"), "only the owner holds the subscription permission");
const panel: [string, string][] = [
  ["POST", "/api/admin/panel/snapshot"], ["POST", "/api/admin/panel/snapshot/abc/rating"], ["POST", "/api/admin/panel/rating/abc/void"], ["GET", "/admin/panel"], ["GET", "/admin/panel/work/abc"]
];
assert(panel.every(([m, u]) => isAllowed("owner", m, u) && isAllowed("chief_editor", m, u) && !isAllowed("editor", m, u)), "the Panel pages and API are for the owner and chief editor, never the editor, reads included");
assert(isAllowed("chief_editor", "PUT", "/api/admin/panel/settings") && isAllowed("owner", "PUT", "/api/admin/panel/settings") && !isAllowed("editor", "PUT", "/api/admin/panel/settings") && isAllowed("chief_editor", "GET", "/api/admin/panel/settings") && isAllowed("chief_editor", "GET", "/api/admin/panel/view") && isAllowed("chief_editor", "GET", "/api/admin/panel/summary"), "the Panel settings can be changed by the chief editor and the owner only");

// 5) fail closed
assert(permissionFor("POST", "/api/admin/something-new") === null && !isAllowed("editor", "POST", "/api/admin/something-new") && !isAllowed("chief_editor", "DELETE", "/api/admin/something-new") && isAllowed("owner", "POST", "/api/admin/something-new"), "an address with no rule is for the owner only");
assert(permissionFor("GET", "/api/admin/something-new") === null && !isAllowed("editor", "GET", "/api/admin/something-new") && isAllowed("owner", "GET", "/api/admin/something-new"), "unknown GET APIs are owner-only rather than generic content reads");
assert(permissionFor("GET", "/api/admin/works/") === permissionFor("GET", "/api/admin/works"), "a trailing slash does not change the answer");

// 6) wired in
const middleware = fs.readFileSync(path.join(root, "src/middleware.ts"), "utf8").replace(/\r\n/g, "\n");
assert(middleware.includes("isAllowed(role, request.method, pathname)") && middleware.includes("status: 403"), "the middleware checks the permission after the session");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
