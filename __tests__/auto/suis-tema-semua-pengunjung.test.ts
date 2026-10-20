/** 20 Okt: anyone can choose the theme from the footer (kept in this browser only); the dark theme's colours stay in harmony. */
import fs from "node:fs";
import path from "node:path";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}
const read = (...p: string[]) => fs.readFileSync(path.join(__dirname, "..", "..", ...p), "utf8").replace(/\r\n/g, "\n");

const sw = read("src", "components", "reader", "ThemeSwitch.tsx");
for (const label of ["Ikut peranti", "Cerah", "Sepia", "Gelap"]) assert(sw.includes(`label: "${label}"`), `the switch offers "${label}"`);
assert(sw.includes('localStorage.setItem(THEME_KEY, next)') && sw.includes("applyTheme(next)"), "a choice is kept in this browser and applied at once");
assert(!/fetch\(|XMLHttpRequest|sendBeacon/.test(sw), "nothing is sent anywhere");
assert(sw.includes('role="group"') && sw.includes('aria-label="Tema laman"') && sw.includes("aria-pressed={choice === c.value}"), "the switch is a labelled group of toggle buttons (keyboard and screen reader)");
assert(read("src", "components", "reader", "StoryChrome.tsx").includes("<ThemeSwitch />"), "the switch is in the footer of every public page");

const css = read("src", "app", "globals.css");
assert(/\.theme-switch-btn \{ min-height: 32px;/.test(css), "each button is at least 32px high");
assert(css.includes(".theme-switch-btn:focus-visible") && css.includes('.theme-switch-btn[aria-pressed="true"]'), "focus and the chosen button are visible");
assert(css.includes("@media print { .theme-switch { display: none; } }"), "the switch is not printed");

// Harmony: no clay wash is left at its fixed light-theme value, the category band borders follow the theme.
assert(!/rgba\(\s*167\s*,\s*100\s*,\s*80\s*,/.test(css.split("\n").filter((l) => !/shadow/.test(l)).join("\n")), "every clay tint (hover washes, highlights, hairlines) follows the accent of the theme");
assert(!css.includes("border-top-color: #ecd9cc"), "the category band borders follow the theme");
const themes = read("src", "app", "themes.css");
assert(themes.includes("--clay-rgb: 167 100 80") && themes.includes("--clay-rgb: 217 165 140") && themes.includes("--clay-rgb: 143 79 58"), "the clay accent has a value in each theme (light unchanged)");

const product = read("docs", "PRODUCT.md");
assert(product.includes("Pindaan 20 Okt 2026") && product.includes("suis di kaki halaman"), "the product contract records the owner's decision");
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
