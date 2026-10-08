/**
 * Tetapan > Saiz teks karya (8 Okt): the chief editor (and the owner) set the story text size (px) and the sub-heading size (em) for every work.
 * Nothing saved means Jalin's own responsive sizes; a saved size is bounded, snapped to a step, and reaches the reader pages as one style rule.
 */
import fs from "node:fs";
import path from "node:path";
import { BODY_PX, HEADING_EM, NO_TYPOGRAPHY, TypographyInputError, cleanBodyPx, cleanHeadingEm, typographyCss } from "../src/lib/reader/reader-typography";
import { can, isAllowed, permissionFor } from "../src/lib/admin/permissions";
import { SETTINGS_TABS } from "../src/lib/admin/settings-tabs";

let passed = 0, failed = 0;
function assert(c: boolean, m: string) { if (c) { passed++; console.log(`  ✓ ${m}`); } else { failed++; console.error(`  ✗ ${m}`); } }
const read = (p: string) => fs.readFileSync(path.join(__dirname, "..", p), "utf8").replace(/\r\n/g, "\n");
const refuses = (fn: () => unknown) => { try { fn(); return false; } catch (e) { return e instanceof TypographyInputError; } };

// Numbers
assert(cleanBodyPx(20) === 20 && cleanBodyPx("18.5") === 18.5 && cleanBodyPx("18,5") === 18.5, "a size is a number (a comma is a decimal point)");
assert(cleanBodyPx(null) === null && cleanBodyPx("") === null && cleanBodyPx(undefined) === null && cleanHeadingEm("  ".trim()) === null, "empty means Jalin's own size");
assert(cleanBodyPx(20.26) === 20.5 && cleanBodyPx(20.24) === 20 && cleanHeadingEm(1.333) === 1.35, "a size is snapped to its step");
assert(refuses(() => cleanBodyPx(BODY_PX.min - 1)) && refuses(() => cleanBodyPx(BODY_PX.max + 1)) && refuses(() => cleanHeadingEm(HEADING_EM.min - 0.1)) && refuses(() => cleanHeadingEm(HEADING_EM.max + 0.1)), "a size outside the limits is refused");
assert(cleanBodyPx(BODY_PX.min) === BODY_PX.min && cleanBodyPx(BODY_PX.max) === BODY_PX.max && cleanHeadingEm(HEADING_EM.min) === HEADING_EM.min && cleanHeadingEm(HEADING_EM.max) === HEADING_EM.max, "the limits themselves are allowed");
for (const bad of ["abc", "20px", "NaN", "Infinity", {}, [], true, "1e3", "20; color:red"]) {
  assert(refuses(() => cleanBodyPx(bad)), `${JSON.stringify(bad)} is refused as text size`);
}
let message = "";
try { cleanBodyPx(99); } catch (e) { message = (e as Error).message; }
assert(message === "Saiz teks karya mesti antara 14 dan 28 px.", "the refusal is a Malay sentence with the limits");

// CSS
assert(typographyCss(NO_TYPOGRAPHY) === "", "no saved size gives no style at all");
assert(typographyCss({ bodyPx: 20, headingEm: null }) === "body .story-body{font-size:20px}", "only the text size");
assert(typographyCss({ bodyPx: null, headingEm: 1.4 }) === "body .story-body h2{font-size:1.4em}", "only the heading size");
assert(typographyCss({ bodyPx: 18.5, headingEm: 1.25 }) === "body .story-body{font-size:18.5px}body .story-body h2{font-size:1.25em}", "both sizes, with a selector stronger than Jalin's responsive rules");

// Who may
assert(can("owner", "typography.manage") && can("chief_editor", "typography.manage") && !can("editor", "typography.manage"), "owner and chief editor may set the sizes; an editor may not");
assert(!can("chief_editor", "site.manage"), "the chief editor still has no access to the rest of Tetapan");
assert(permissionFor("POST", "/api/admin/reader-typography") === "typography.manage" && !isAllowed("editor", "POST", "/api/admin/reader-typography") && isAllowed("chief_editor", "POST", "/api/admin/reader-typography"), "saving needs typography.manage");
assert(isAllowed("chief_editor", "GET", "/admin/settings/saiz-teks") && !isAllowed("editor", "GET", "/admin/settings/saiz-teks") && !isAllowed("chief_editor", "GET", "/admin/settings") && !isAllowed("chief_editor", "GET", "/admin/settings/saiz-teks/lain"), "the chief editor opens only the one panel's address");

// Wiring
const api = read("src/app/api/admin/reader-typography/route.ts");
assert(api.includes("getCurrentAdmin") && (api.match(/status: 401/g) ?? []).length === 2 && api.includes("TypographyInputError") && api.includes("status: 400"), "the API needs a session and answers a bad number with 400");
assert(SETTINGS_TABS.some((t) => t.id === "saiz-teks" && t.label === "Saiz teks karya") && read("src/app/admin/settings/page.tsx").includes('tab === "saiz-teks"'), "the owner sees it as a tab of Tetapan");
const shell = read("src/components/admin/AdminShell.tsx");
assert(shell.includes('href: "/admin/settings/saiz-teks"') && shell.includes('needs: "typography.manage", unless: "site.manage"'), "the chief editor's menu has the panel (the owner has Tetapan instead)");
assert(read("src/components/reader/WorkView.tsx").includes("<ReaderTypography />") && read("src/components/reader/EpisodeView.tsx").includes("<ReaderTypography />"), "single works, novela and episodes carry the style");
assert(!read("src/components/reader/ReaderTypography.tsx").includes("dangerouslySetInnerHTML"), "the style is plain text (no raw HTML)");
const panel = read("src/components/admin/ReaderTypographySettings.tsx");
assert(panel.includes("Kembali kepada saiz asal") && panel.includes("Saiz teks karya disimpan.") && panel.includes("tidak dapat disimpan"), "the panel can go back to Jalin's sizes and says what happened");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
