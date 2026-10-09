/**
 * The Pengguna page (8 Okt loop) used the browser's own confirm box for switching an account off and for a password reset, and
 * changing a role, switching an account off or on said nothing at all when it worked. It now uses the admin's own dialog (named buttons,
 * destructive style) and every change says what happened, in a toast.
 */
import fs from "node:fs";
import path from "node:path";

let passed = 0, failed = 0;
function assert(c: boolean, m: string) { if (c) { passed++; console.log(`  ✓ ${m}`); } else { failed++; console.error(`  ✗ ${m}`); } }
const panel = fs.readFileSync(path.join(__dirname, "..", "src/app/admin/pengguna/UsersPanel.tsx"), "utf8").replace(/\r\n/g, "\n");

assert(!panel.includes("window.confirm"), "no browser confirm box any more");
assert(panel.includes('import { confirmAction, toast } from "../../../lib/admin/dialogs"'), "the admin's own dialog and toast are used");
assert(/confirmAction\(`Matikan akaun \$\{user\.displayName\}\?[^`]*`, \{ confirmLabel: "Ya, matikan akaun", danger: true \}\)/.test(panel), "switching an account off asks in the admin dialog, names the action on the button and is styled destructive");
assert(/Tetapkan semula kata laluan \$\{user\.displayName\}\?[^`]*`/.test(panel) && panel.includes('confirmLabel: unused ? "Ya, jemputan baharu" : "Ya, tetapkan semula", danger: true'), "a password reset (or a new invitation) asks the same way: named button, destructive style");
assert(panel.includes("await confirmAction(") && (panel.match(/await confirmAction\(/g) ?? []).length === 2, "the answer is awaited before anything is sent");

// Every change says what happened
for (const sentence of ["dimatikan.", "diaktifkan.", "ditukar kepada", "ditetapkan semula. Salin jemputan di atas dan hantar.", "Jemputan sedia. Salin dan hantar kepada orang itu."]) {
  assert(panel.includes(sentence), `a success message: "...${sentence}"`);
}
assert((panel.match(/"success"/g) ?? []).length >= 3, "success is announced for create, change (role, switch on or off) and reset");
assert((panel.match(/"error"\)/g) ?? []).length >= 3, "a failure is announced as an error toast in create, change and reset");
assert(panel.includes("Akaun tidak dapat dicipta:"), "a failed invitation says the account could not be created");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
