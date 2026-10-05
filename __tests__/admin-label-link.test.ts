/**
 * Audit finding: many admin forms have a <label> beside a box with no `for`/`id`, so a screen reader names the box nothing and clicking
 * the label does nothing. The shell now ties them (link-labels.ts). A minimal fake DOM is enough to check the pairing rules.
 */
import fs from "node:fs";
import path from "node:path";
import { linkLabels } from "../src/components/admin/link-labels";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}

type Fake = { htmlFor?: string; id?: string; attrs: Record<string, string>; inner?: boolean; getAttribute(n: string): string | null; querySelector(sel: string): unknown };
const control = (attrs: Record<string, string> = {}, id = ""): Fake => ({ id, attrs, getAttribute: (n) => attrs[n] ?? null, querySelector: () => null });
const label = (htmlFor = "", wraps = false): Fake => ({ htmlFor, attrs: {}, getAttribute: () => null, querySelector: () => (wraps ? {} : null) });
const group = (l: Fake | null, c: Fake | null) => ({
  querySelector: (sel: string) => (sel.includes("label") ? l : c),
});
const root = (groups: ReturnType<typeof group>[]) => ({ querySelectorAll: () => ({ forEach: (fn: (g: unknown) => void) => groups.forEach(fn) }) }) as unknown as ParentNode;

const l1 = label(), c1 = control();
assert(linkLabels(root([group(l1, c1)])) === 1 && c1.id !== "" && l1.htmlFor === c1.id, "a label beside an unlabelled box is tied to it, giving the box an id");
const l2 = label(), c2 = control({}, "mine");
linkLabels(root([group(l2, c2)]));
assert(l2.htmlFor === "mine" && c2.id === "mine", "an id the box already has is kept");
const l3 = label("x"), c3 = control();
assert(linkLabels(root([group(l3, c3)])) === 0 && c3.id === "", "a label that already has `for` is left alone");
const l4 = label("", true), c4 = control();
assert(linkLabels(root([group(l4, c4)])) === 0, "a label that wraps its box is left alone");
const l5 = label(), c5 = control({ "aria-label": "Nama" });
assert(linkLabels(root([group(l5, c5)])) === 0, "a box with its own aria-label is left alone");
assert(linkLabels(root([group(null, control())])) === 0 && linkLabels(root([group(label(), null)])) === 0, "no label or no box: nothing to do");
const l6 = label(), c6 = control(), l7 = label(), c7 = control();
linkLabels(root([group(l6, c6), group(l7, c7)]));
assert(c6.id !== c7.id, "each box gets its own id");

const shell = fs.readFileSync(path.join(__dirname, "../src/components/admin/AdminShell.tsx"), "utf8");
assert(shell.includes("linkLabels(document)") && shell.includes("MutationObserver"), "the admin shell runs it on load and whenever a page redraws");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
