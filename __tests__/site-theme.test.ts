/**
 * Home page block backgrounds (Tetapan > Warna blok laman utama). An editor picks a background for each block from the Jalin theme
 * colours only (the logo colours plus white and black), never a free colour. Every colour has a CSS rule, the text on a dark ground turns
 * light, and the text colours that go with each ground keep the readable contrast (WCAG AA, 4.5:1 for text).
 */
import fs from "node:fs";
import path from "node:path";
import { DEFAULT_GROUNDS, GROUNDS, HOME_BLOCKS, isGroundKey, isHomeBlockKey } from "../src/lib/site-theme";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string, detail?: unknown) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`, detail ?? ""); }
}
const read = (p: string) => fs.readFileSync(path.join(__dirname, "..", p), "utf8");

function luminance(hex: string): number {
  const n = parseInt(hex.replace("#", ""), 16);
  const f = (v: number) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  return 0.2126 * f((n >> 16) & 255) + 0.7152 * f((n >> 8) & 255) + 0.0722 * f(n & 255);
}
function ratio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const css = read("src/app/globals.css");
const page = read("src/app/page.tsx");
const api = read("src/app/api/admin/site-theme/route.ts");

const hexes = GROUNDS.map((g) => g.hex);
assert(hexes.includes("#ffffff") && hexes.includes("#000000"), "white and black are among the choices");
assert(hexes.includes("#18343c") && hexes.includes("#a76450") && hexes.includes("#d8b9a6"), "the logo colours (deep teal, terracotta, peach) are among the choices");
assert(GROUNDS.every((g) => /^#[0-9a-f]{6}$/i.test(g.hex)) && new Set(GROUNDS.map((g) => g.key)).size === GROUNDS.length, "every choice is a fixed theme colour with its own key");

assert(GROUNDS.every((g) => css.includes(`.homepage [data-ground="${g.key}"] { --ground-bg: ${g.hex}; }`)), "every choice has its CSS rule with the same colour");
assert(HOME_BLOCKS.every((b) => isGroundKey(b.default)), "every block's default is one of the choices");
assert(DEFAULT_GROUNDS.hero === "paper" && DEFAULT_GROUNDS.stats === "ink" && DEFAULT_GROUNDS.series === "paper" && DEFAULT_GROUNDS.latest === "paper" && DEFAULT_GROUNDS.categories === "sand", "until someone picks, the page looks as it did (paper, with the peach-tinted category block)");
assert(isHomeBlockKey("hero") && !isHomeBlockKey("footer") && !isGroundKey("#ff0000") && !isGroundKey("red"), "only known blocks and theme colours are accepted");

// Text on each ground: the colours the CSS gives the block must read at 4.5:1.
const DARK_TEXT: Record<string, string> = { ink: "#fbf8f2", black: "#fbf8f2", clay: "#ffffff" };
for (const g of GROUNDS) {
  if (g.tone === "dark") {
    assert(ratio(DARK_TEXT[g.key]!, g.hex) >= 4.5, `light text on ${g.label} reads at 4.5:1`, ratio(DARK_TEXT[g.key]!, g.hex));
  } else {
    const soft = g.key === "beige" ? "#34494f" : "#52656a";
    const accent = g.key === "beige" ? "#74392a" : "#9a5a47";
    assert(ratio("#18343c", g.hex) >= 4.5 && ratio(soft, g.hex) >= 4.5 && ratio(accent, g.hex) >= 4.5, `dark text, softer text and accent on ${g.label} read at 4.5:1`, [ratio("#18343c", g.hex), ratio(soft, g.hex), ratio(accent, g.hex)]);
  }
}
assert(css.includes('.homepage [data-ground="beige"] { --ink-soft: #34494f; --clay-text: #74392a; }'), "peach gets the darker softer-text and accent colours the test above measured");
assert(/\.homepage \[data-ground="ink"\], \.homepage \[data-ground="clay"\], \.homepage \[data-ground="black"\] \{[^}]*--ink: #fbf8f2/.test(css), "a dark ground turns the block's text light");
assert(/\.homepage \[data-ground="clay"\] \{ color: #ffffff; --ink: #ffffff;/.test(css), "terracotta uses pure white (the paper white is not quite readable enough on it)");
assert(/\.homepage \[data-ground\] \.latest-card, \.homepage \[data-ground\] \.category-explorer-card, \.homepage \[data-ground\] \.editorial-pick, \.homepage \[data-ground\] \.hero-carousel-btn \{[^}]*--ink: #18343c/.test(css), "cards and the carousel arrows keep their own light faces and dark text");
assert(/\.homepage \[data-ground="clay"\] \.home-work-meta--pills span \{ background: transparent;/.test(css), "the date pills stay readable on terracotta");

assert(page.includes("data-ground={ground}") && page.includes("data-ground={grounds.latest}") && page.includes("data-ground={grounds.categories}") && page.includes("ground={grounds.hero}") && page.includes("ground={grounds.series}"), "the four blocks of the home page carry their chosen background");
assert(css.includes('.homepage .series-highlight[data-ground]:not([data-ground="paper"]),') && css.includes('.homepage .latest-works[data-ground]:not([data-ground="paper"]) { padding-block: clamp(36px, 5vw, 56px); }'), "a coloured block has equal space above and below, and the paper blocks keep their own spacing");
assert(api.includes("getCurrentAdmin") && api.includes("isGroundKey(body.ground)") && api.includes("isHomeBlockKey(body.block)") && (api.match(/status: 401/g) ?? []).length === 2, "the admin route needs a signed-in admin and accepts only known blocks and theme colours");
assert(read("src/lib/site-theme.ts").includes("try {") && read("src/lib/site-theme.ts").includes("return { ...DEFAULT_GROUNDS };"), "a database problem shows the default colours, never an error page");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
