/**
 * Tetapan was one long page with seven sections and a row of jump links. It now has real tabs (Izzat, 7 Oct 2026): one panel
 * on the page at a time, each tab its own address, and an old "#section" link still lands on the right tab.
 */
import fs from "node:fs";
import path from "node:path";
import { DEFAULT_SETTINGS_TAB, SETTINGS_GROUPS, SETTINGS_TABS, movedTabTarget, settingsTabHref, settingsTabOf } from "../src/lib/admin/settings-tabs";
import { isAllowed } from "../src/lib/admin/permissions";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}
const read = (p: string) => fs.readFileSync(path.join(__dirname, "..", p), "utf8").replace(/\r\n/g, "\n");

assert(SETTINGS_TABS.map((t) => t.id).join() === "teks-awam,warna-blok,saiz-teks,audiens,nama-samaran,arahan-ai,alat-lain" && DEFAULT_SETTINGS_TAB === "teks-awam", "seven tabs, the texts editors change most first (Status sistem is on the dashboard)");
assert(movedTabTarget("status-sistem") === "/admin#status-sistem" && movedTabTarget(["status-sistem", "x"]) === "/admin#status-sistem" && movedTabTarget("audiens") === null && movedTabTarget(undefined) === null && movedTabTarget("toString") === null, "an old link to the Status sistem tab goes to the dashboard");
assert(settingsTabOf("audiens") === "audiens" && settingsTabOf(["arahan-ai", "x"]) === "arahan-ai", "an address opens the tab it names");
assert(settingsTabOf(undefined) === "teks-awam" && settingsTabOf("") === "teks-awam" && settingsTabOf("tiada") === "teks-awam" && settingsTabOf("<script>") === "teks-awam", "nothing, or a tab that does not exist, opens the first tab");
assert(settingsTabHref("teks-awam") === "/admin/settings" && settingsTabHref("nama-samaran") === "/admin/settings?tab=nama-samaran", "each tab has its own address; the first is the plain one");

const page = read("src/app/admin/settings/page.tsx");
assert(page.includes("settingsTabOf(asked)") && page.includes("if (moved) redirect(moved)") && page.includes('className="a-settings-tabs"') && page.includes('aria-current={t.id === tab ? "page" : undefined}'), "the page reads the tab from its address and marks the open tab for a screen reader");
for (const tab of SETTINGS_TABS) {
  assert(page.includes(`tab === "${tab.id}" ?`), `the panel of ${tab.id} is drawn only when its tab is open`);
}
assert((page.match(/<section /g) ?? []).length === 1 && !page.includes('href="#'), "one panel on the page, and no jump links");
assert(page.includes("async function AiPromptsPanel()") && page.indexOf("loadPrompts(") > page.indexOf("async function AiPromptsPanel()") && !/export default async function SettingsPage[\s\S]*loadPrompts\(/.test(page), "the long AI instructions are read only when their tab is open");

const redirect = read("src/components/admin/SettingsHashRedirect.tsx");
assert(page.includes("<SettingsHashRedirect current={tab} />") && redirect.includes("window.location.hash") && redirect.includes("window.location.replace(settingsTabHref(tab.id))"), "an old link to a section (#nama-samaran) is taken to that tab");
assert(read("src/components/admin/AiCreditPicker.tsx").includes('href="/admin/settings?tab=nama-samaran"'), "the credit picker links straight to the tab");

const dashboard = read("src/app/admin/page.tsx");
assert(dashboard.includes('id="status-sistem"') && dashboard.includes("<h2>Status sistem</h2>") && dashboard.includes("Pangkalan data") && dashboard.includes("Storan gambar") && !page.includes("hasDb()"), "Status sistem is on the dashboard (database and picture storage), no longer in Tetapan");
assert(redirect.includes("MOVED_TABS[id]"), "an old #status-sistem link goes to the dashboard too");

const css = read("src/app/admin/admin.css");
const tabsRule = (css.match(/.a-shell .a-settings-tabs {[^}]*}/) ?? [""])[0];
// Izzat, 9 Okt 2026: a column of links beside the panel made every form narrow (the Audiens table was cut off). The parts are a row of tabs above it.
const layoutRule = (css.match(/.a-shell .a-settings-layout {[^}]*}/) ?? [""])[0];
assert(layoutRule.includes("display: block") && !layoutRule.includes("grid-template-columns") && !/\.a-settings-tabs \{[^}]*position: sticky/.test(css), "the panel has the whole width: no column beside it");
assert(tabsRule.includes("display: flex") && tabsRule.includes("flex-wrap: wrap") && !tabsRule.includes("flex-direction: column") && !tabsRule.includes("overflow") && css.includes(".a-shell .a-settings-tabs a.active"), "the parts are a row of tabs above the panel that wraps (never cut off or scrolled sideways), and the open one is marked");
assert(css.includes(".a-shell .a-settings-group, .a-shell .a-settings-tabs ul { display: contents; }") && /a-settings-group-title \{[^}]*clip: rect\(0 0 0 0\)/.test(css), "the groups flow as one row; their headings stay for a screen reader");
assert(!read("src/components/admin/SettingsHashRedirect.tsx").includes("scrollIntoView"), "nothing scrolls the list of parts");
assert(/.a-shell .a-settings-tabs a {[^}]*min-height: 40px/.test(css), "a link is tall enough to tap");
assert(SETTINGS_GROUPS.join() === "Laman awam,Penulisan dan AI,Lain-lain" && SETTINGS_TABS.every((t) => (SETTINGS_GROUPS as readonly string[]).includes(t.group)), "every part belongs to a group");
assert(SETTINGS_GROUPS.every((g) => SETTINGS_TABS.some((t) => t.group === g)), "no group is empty");
assert(page.includes("SETTINGS_GROUPS.map((group)") && page.includes('className="a-settings-group-title"') && page.includes('className="a-settings-layout"'), "the page lists the parts under their group headings");
assert(!isAllowed("editor", "GET", "/admin/settings") && isAllowed("owner", "GET", "/admin/settings"), "who may open Tetapan is unchanged");
// The menu links sit in list items, so the "link inside running text" rule (underlined, accent colour) caught them (seen in a screenshot).
assert(page.includes('"a-nav-plain active" : "a-nav-plain"'), "each menu link carries a-nav-plain");
assert(css.includes(".a-shell li a:not(.admin-btn):not(.a-nav-plain),"), "the running-text link rule leaves a-nav-plain links alone");
assert(/\.a-shell \.a-settings-tabs a \{ color: var\(--a-ink\); text-decoration: none;/.test(css), "a menu link is plain dark text, not underlined");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
