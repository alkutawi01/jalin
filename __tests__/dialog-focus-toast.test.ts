/**
 * The admin's confirmation dialog and toasts (8 Okt loop): "Padam karya ini selama-lamanya?" started with the focus on the
 * destructive button, so an Enter pressed by habit confirmed it; Tab could leave the dialog for the page behind it; the focus was not
 * given back when it closed; and a failure toast vanished after 4.5 seconds like a success.
 */
import fs from "node:fs";
import path from "node:path";

let passed = 0, failed = 0;
function assert(c: boolean, m: string) { if (c) { passed++; console.log(`  ✓ ${m}`); } else { failed++; console.error(`  ✗ ${m}`); } }
const host = fs.readFileSync(path.join(__dirname, "..", "src/components/admin/DialogHost.tsx"), "utf8").replace(/\r\n/g, "\n");
const css = fs.readFileSync(path.join(__dirname, "..", "src/app/admin/admin.css"), "utf8").replace(/\r\n/g, "\n");

// Focus starts on the safe answer for a destructive question
assert(host.includes("(request.danger ? cancelRef : confirmRef).current?.focus()"), "a destructive question starts on Batal; an ordinary one on the confirm button");
assert(host.includes("ref={cancelRef}") && host.includes("ref={confirmRef}"), "both buttons can take the focus");

// Tab stays inside the dialog
assert(host.includes('e.key !== "Tab"') && host.includes("e.shiftKey && document.activeElement === first") && host.includes("!e.shiftKey && document.activeElement === last"), "Tab and Shift+Tab go round the two buttons");
assert(host.includes('e.key === "Escape") return answer(false)'), "Escape still cancels");
assert(host.includes('aria-modal="true"') && host.includes('aria-labelledby="a-modal-title"'), "the dialog is announced as a modal with its title");

// Focus goes back
assert(host.includes("opener.current = document.activeElement instanceof HTMLElement") && host.includes("back?.focus?.()") && host.includes("window.requestAnimationFrame"), "when the dialog closes the focus returns to the button that opened it");

// Toasts
const ms = host.match(/TOAST_MS = \{ success: (\d+), info: (\d+), error: (\d+) \}/);
assert(!!ms && Number(ms![3]) >= 3 * Number(ms![1]) && Number(ms![3]) >= 10000, `a failure toast stays at least 10 s and 3x a success (${ms?.[3]} ms against ${ms?.[1]} ms)`);
assert(host.includes("TOAST_MS[event.toast.kind]"), "each toast uses the time of its kind");
assert(host.includes('role={t.kind === "error" ? "alert" : undefined}') && host.includes('aria-label="Tutup pemberitahuan"') && host.includes("closeToast(t.id)"), "a failure toast is announced at once and can be closed");
assert(!/t\.kind === "error" \? \(\s*<button[^]*success/.test(host), "a success toast has no close button (it goes by itself)");
assert(css.includes(".a-shell .a-toast-close"), "the close button is styled");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
