/**
 * Tetapan was one long page with seven sections and a row of jump links. It now has real tabs (Izzat, 7 Oct 2026): one panel
 * on the page at a time, each tab its own address, and an old "#section" link still lands on the right tab.
 */
import fs from "node:fs";
import path from "node:path";
import { DEFAULT_SETTINGS_TAB, SETTINGS_TABS, settingsTabHref, settingsTabOf } from "../src/lib/admin/settings-tabs";
import { isAllowed } from "../src/lib/admin/permissions";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}
const read = (p: string) => fs.readFileSync(path.join(__dirname, "..", p), "utf8").replace(/\r\n/g, "\n");

assert(SETTINGS_TABS.map((t) => t.id).join() === "teks-awam,warna-blok,saiz-teks,audiens,nama-samaran,arahan-ai,alat-lain,status-sistem" && DEFAULT_SETTINGS_TAB === "teks-awam", "eight tabs, the texts editors change most first");
assert(settingsTabOf("audiens") === "audiens" && settingsTabOf(["arahan-ai", "x"]) === "arahan-ai", "an address opens the tab it names");
assert(settingsTabOf(undefined) === "teks-awam" && settingsTabOf("") === "teks-awam" && settingsTabOf("tiada") === "teks-awam" && settingsTabOf("<script>") === "teks-awam", "nothing, or a tab that does not exist, opens the first tab");
assert(settingsTabHref("teks-awam") === "/admin/settings" && settingsTabHref("nama-samaran") === "/admin/settings?tab=nama-samaran", "each tab has its own address; the first is the plain one");

const page = read("src/app/admin/settings/page.tsx");
assert(page.includes("settingsTabOf((await searchParams).tab)") && page.includes('className="a-settings-tabs"') && page.includes('aria-current={t.id === tab ? "page" : undefined}'), "the page reads the tab from its address and marks the open tab for a screen reader");
for (const tab of SETTINGS_TABS) {
  assert(page.includes(`tab === "${tab.id}" ?`), `the panel of ${tab.id} is drawn only when its tab is open`);
}
assert((page.match(/<section /g) ?? []).length === 1 && !page.includes('href="#'), "one panel on the page, and no jump links");
assert(page.includes("async function AiPromptsPanel()") && page.indexOf("loadPrompts(") > page.indexOf("async function AiPromptsPanel()") && !/export default async function SettingsPage[\s\S]*loadPrompts\(/.test(page), "the long AI instructions are read only when their tab is open");

const redirect = read("src/components/admin/SettingsHashRedirect.tsx");
assert(page.includes("<SettingsHashRedirect current={tab} />") && redirect.includes("window.location.hash") && redirect.includes("window.location.replace(settingsTabHref(tab.id))"), "an old link to a section (#nama-samaran) is taken to that tab");
assert(read("src/components/admin/AiCreditPicker.tsx").includes('href="/admin/settings?tab=nama-samaran"'), "the credit picker links straight to the tab");

const css = read("src/app/admin/admin.css");
const tabsRule = (css.match(/.a-shell .a-settings-tabs {[^}]*}/) ?? [""])[0];
assert(tabsRule.includes("flex-wrap: wrap") && !tabsRule.includes("overflow") && css.includes(".a-shell .a-settings-tabs a.active"), "the tabs wrap onto another line when they do not fit (none is ever cut off or scrolled out of view), and the open one is marked");
assert(!read("src/components/admin/SettingsHashRedirect.tsx").includes("scrollIntoView"), "nothing scrolls the row of tabs");
assert(/.a-shell .a-settings-tabs a {[^}]*min-height: 40px/.test(css), "a tab is tall enough to tap");
assert(!isAllowed("editor", "GET", "/admin/settings") && isAllowed("owner", "GET", "/admin/settings"), "who may open Tetapan is unchanged");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
