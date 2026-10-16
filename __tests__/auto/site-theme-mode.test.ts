/** Mod gelap/sepia/ikut peranti: one resolver, the script before first paint agrees with it, the admin is never themed, light is untouched. */
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { THEME_INIT_SCRIPT, THEME_KEY, ACCOUNT_THEME_KEY, chosenTheme, resolveTheme } from "../../src/lib/site-theme-mode";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}
const read = (...p: string[]) => fs.readFileSync(path.join(__dirname, "..", "..", ...p), "utf8").replace(/\r\n/g, "\n");

assert(resolveTheme("sistem", true) === "gelap" && resolveTheme("sistem", false) === "cerah", "'sistem' follows the device");
assert(resolveTheme("sepia", true) === "sepia" && resolveTheme("cerah", true) === "cerah", "an explicit choice beats the device");
assert(chosenTheme(null, null) === "sistem", "a visitor with nothing stored follows the device");
assert(chosenTheme(null, "gelap") === "gelap", "a signed-in reader's saved theme is kept (never silently turned into 'sistem')");
assert(chosenTheme("sistem", "gelap") === "sistem" && chosenTheme("sepia", "gelap") === "sepia", "this device's own choice wins over the account's");
assert(chosenTheme("rosak", "rosak") === "sistem", "a corrupt stored value falls back to the device");

// The inline script and the functions must give the same answer in every case.
function runScript(pathname: string, store: Record<string, string>, dark: boolean) {
  const attrs: Record<string, string> = {};
  const metas = [{ content: "", attrs: {} as Record<string, string>, setAttribute(k: string, v: string) { (this as any).attrs[k] = v; if (k === "content") this.content = v; }, removeAttribute(k: string) { delete (this as any).attrs[k]; } }];
  const ctx = {
    document: { documentElement: { setAttribute: (k: string, v: string) => { attrs[k] = v; } }, querySelectorAll: () => metas },
    location: { pathname },
    localStorage: { getItem: (k: string) => store[k] ?? null },
    window: { matchMedia: () => ({ matches: dark }) }
  };
  (ctx as any).window.matchMedia = () => ({ matches: dark });
  (ctx as any).matchMedia = (ctx as any).window.matchMedia;
  vm.runInNewContext(THEME_INIT_SCRIPT, ctx);
  return { attrs, bar: metas[0].content };
}
for (const [local, account, dark] of [[null, null, true], [null, null, false], [null, "gelap", false], ["sistem", "gelap", false], ["sepia", "gelap", true], ["cerah", null, true], ["rosak", null, true]] as const) {
  const store: Record<string, string> = {};
  if (local) store[THEME_KEY] = local;
  if (account) store[ACCOUNT_THEME_KEY] = account;
  const out = runScript("/", store, dark);
  assert(out.attrs["data-theme"] === resolveTheme(chosenTheme(local, account), dark), `script = resolver for local=${local} account=${account} dark=${dark}`);
}
assert(Object.keys(runScript("/admin/works", { [THEME_KEY]: "gelap" }, true).attrs).length === 0, "the admin is never themed");
assert(runScript("/", {}, true).bar === "#101e22", "the browser bar takes the dark page colour");

// The stylesheet side.
const themes = read("src", "app", "themes.css");
assert(/html\[data-theme="gelap"\]\s*\{\s*color-scheme: dark;/.test(themes) && /html\[data-theme="sepia"\]\s*\{\s*color-scheme: light;/.test(themes), "each theme sets the browser's colour scheme");
assert(themes.includes("--paper: #101e22") && themes.includes("--ink: #eee8dd") && themes.includes("--clay: #d9a58c"), "Gelap uses the agreed palette (teal ink, ivory text, soft clay)");
assert(themes.includes("@media screen"), "themes apply on screen only, print stays on paper");
const lightTokens = [...themes.split("html[data-theme")[0].matchAll(/--x-([0-9a-f]{6})-(?:bg|fg|ln): (#[0-9a-f]{6});/g)];
assert(lightTokens.length > 40 && lightTokens.every((m) => m[2] === "#" + m[1]), "in the light theme every colour token equals the hex it replaced");
assert(read("src", "app", "layout.tsx").includes("THEME_INIT_SCRIPT") && read("src", "app", "layout.tsx").includes("suppressHydrationWarning"), "the theme is set before the first paint");
assert(!/theme === "gelap"|THEMES\[/.test(read("src", "components", "reader", "ReadingTracker.tsx")), "the reading page no longer paints its own theme beside the site's");
assert(fs.existsSync(path.join(__dirname, "..", "..", "public", "brand", "jalin-wordmark-reversed.svg")), "there is a reversed wordmark for dark grounds");
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
