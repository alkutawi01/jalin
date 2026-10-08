/**
 * Found in the 8 Okt simulation as an editor: the work page offered "Terbitkan" as the next step, "Padam karya ini" and, on a public work,
 * "Arkibkan" (which takes it off the site, and the server allowed it for an editor). Now the page offers only what the role may do, and the
 * server refuses an editor who tries to archive a work that is public.
 */
import fs from "node:fs";
import path from "node:path";
import { can } from "../src/lib/admin/permissions";

let passed = 0, failed = 0;
function assert(c: boolean, m: string) { if (c) { passed++; console.log(`  ✓ ${m}`); } else { failed++; console.error(`  ✗ ${m}`); } }
const read = (p: string) => fs.readFileSync(path.join(__dirname, "..", p), "utf8").replace(/\r\n/g, "\n");

// The permissions the page depends on
assert(can("owner", "work.publish") && can("owner", "work.delete") && !can("chief_editor", "work.publish") && !can("editor", "work.publish"), "only the owner publishes");
assert(can("owner", "work.delete") && !can("chief_editor", "work.delete") && !can("editor", "work.delete"), "only the owner deletes a draft");

// The server refuses an editor who archives a public work
const route = read("src/app/api/admin/works/[id]/route.ts");
const guard = route.indexOf('body.status === "archived" && existing.status === "published"');
assert(guard > 0 && route.slice(guard, guard + 500).includes('can(role, "work.publish")') && route.slice(guard, guard + 600).includes("status: 403"), "archiving a published work needs work.publish (403 otherwise)");
assert(guard < route.indexOf("reconcileEdit(") && guard < route.indexOf("await updateWork("), "the check comes before anything is changed");
assert(route.includes("Hanya pemilik boleh mengarkibkan karya yang sudah terbit."), "the refusal is a Malay sentence");

// The page offers only what the role may do
const shell = read("src/app/admin/layout.tsx");
assert(shell.includes("<AdminRoleProvider role={role}>"), "the admin layout gives pages the role");
const role = read("src/components/admin/AdminRole.tsx");
assert(role.includes('createContext<Role>("owner")') && role.includes("export function useAdminCan"), "a page outside the shell assumes the owner (keeps every button)");
const page = read("src/app/admin/works/[id]/page.tsx");
assert(page.includes('useAdminCan("work.publish")') && page.includes('useAdminCan("work.delete")'), "the work page asks what the role may do");
assert(page.includes('form.status !== "archived" && (form.status !== "published" || canPublish)'), "'Arkibkan' on a public work is for those who may publish");
assert(page.includes('form.status !== "published" && !everPublic && canDelete'), "'Padam karya ini' is for those who may delete");
const panel = read("src/components/admin/WorkStatusPanel.tsx");
assert(panel.includes('useAdminCan("work.publish")') && panel.includes("Menunggu pemilik menerbitkannya.") && panel.includes("Perubahan ini menunggu pemilik menerbitkan semula."), "without publish rights the panel says the work waits for the owner");
assert(/!canPublish && next[^]*?Hantar untuk semakan[^]*?Tandakan sedia/.test(panel), "an editor's next step is the one they can take (send for review, mark ready), never 'Terbitkan'");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
