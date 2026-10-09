/**
 * The admin menu (Izzat, 9 Okt 2026): one menu at the side that opens and closes; closed shows icons only. No button at the top right,
 * no drawer. A closed menu keeps its words for a screen reader and a tooltip.
 */
import fs from "node:fs";
import path from "node:path";

let passed = 0, failed = 0;
function assert(c: boolean, m: string) { if (c) { passed++; console.log(`  ✓ ${m}`); } else { failed++; console.error(`  ✗ ${m}`); } }
const root = path.join(__dirname, "..");
const shell = fs.readFileSync(path.join(root, "src/components/admin/AdminShell.tsx"), "utf8").replace(/\r\n/g, "\n");
const css = fs.readFileSync(path.join(root, "src/app/admin/admin.css"), "utf8").replace(/\r\n/g, "\n");

assert(!/a-topbar|a-drawer|a-menu-btn/.test(shell + css), "no top bar, drawer or top-right Menu button is left");
assert(shell.includes('className="a-side-toggle"'), "the side menu has its own button to open and close it");
assert(/aria-expanded=\{!collapsed\}/.test(shell), "the button says whether the menu is open (aria-expanded)");
assert(shell.includes('"Buka menu"') && shell.includes('"Tutup menu"'), "the button is named for what it will do");
assert((shell.match(/className="a-nav-label"/g) ?? []).length >= 4, "every item keeps its words in a label (hidden, not removed, when closed)");
assert(/title=\{item\.label\}/.test(shell), "every item shows its name as a tooltip");
assert(/localStorage\.setItem\(MENU_KEY/.test(shell), "the choice is kept");
assert(/\.a-shell\[data-menu="closed"\] \.a-nav-label/.test(css) && /clip: rect\(0 0 0 0\)/.test(css), "a closed menu hides the words visually but not from a screen reader");
assert(/--a-rail-w: 68px/.test(css), "a closed menu is a narrow rail");
assert(/\.a-main \{ margin-left: var\(--a-side-now\)/.test(css), "the page makes room for exactly the width the menu has");
assert(/@media \(max-width: 1099px\)[^]*?:not\(\[data-menu="open"\]\)/.test(css), "with no choice made the menu starts closed on a narrow window");

// Izzat, 9 Okt 2026: three menus shared one icon, which in the closed menu (icons only) made them impossible to tell apart.
const navBlock = shell.slice(shell.indexOf("const NAV"), shell.indexOf("const MENU_KEY"));
const icons = [...navBlock.matchAll(/label: "([^"]+)", icon: "([^"]+)"/g)].map((m) => ({ label: m[1]!, icon: m[2]! }));
// "Saiz teks karya" replaces Tetapan for a chief editor (unless: "site.manage"), so the two never show together.
const shown = icons.filter((item) => item.label !== "Saiz teks karya");
assert(shown.length >= 8, `the scan sees the menu items (${shown.length})`);
assert(new Set(shown.map((item) => item.icon)).size === shown.length, "every item that can show together has its own icon (" + shown.map((item) => item.icon).join(", ") + ")");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
