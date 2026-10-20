/** Audit 19-20 Okt, kumpulan 3: no internal error text in responses, cross-site changes refused, plain dek, keyboard notes, unique emblem ids, targets. */
import fs from "node:fs";
import path from "node:path";
import { publicErrorMessage } from "../../src/lib/admin/api-errors";
import { plainDek } from "../../src/lib/reader/plain-dek";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}
const read = (...p: string[]) => fs.readFileSync(path.join(__dirname, "..", "..", ...p), "utf8").replace(/\r\n/g, "\n");
const walk = (d: string, out: string[] = []): string[] => { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); fs.statSync(p).isDirectory() ? walk(p, out) : out.push(p); } return out; };

// Error text: the application's own words pass, a driver's or a library's do not.
const quiet = console.error; console.error = () => undefined;
class DuplicateTermError extends Error {}
const driver = Object.assign(new Error('relation "glossary_terms" does not exist'), { code: "42P01" });
assert(publicErrorMessage(new Error("Istilah diperlukan."), "Ralat.") === "Istilah diperlukan.", "a message the application wrote is passed on");
assert(publicErrorMessage(new DuplicateTermError("Istilah itu sudah ada."), "Ralat.") === "Istilah itu sudah ada.", "so is one from the application's own error classes");
assert(publicErrorMessage(driver, "Ralat.") === "Ralat.", "a database error with a code is replaced");
assert(publicErrorMessage(new Error('duplicate key value violates unique constraint "works_slug_key"'), "Ralat.") === "Ralat.", "text that names a constraint is replaced");
assert(publicErrorMessage(new TypeError("Cannot read properties of undefined (reading 'id')"), "Ralat.") === "Ralat.", "a runtime error is replaced");
assert(publicErrorMessage(new Error("connect ECONNREFUSED 10.0.0.1:5432"), "Ralat.") === "Ralat.", "a network error is replaced");
assert(publicErrorMessage("teks", "Ralat.") === "Ralat." && publicErrorMessage(new Error("x".repeat(400)), "Ralat.") === "Ralat.", "a non-error or a very long message is replaced");
console.error = quiet;
const raw = walk(path.join(__dirname, "..", "..", "src", "app", "api")).filter((f) => /route\.tsx?$/.test(f) && /error instanceof Error \? error\.message/.test(fs.readFileSync(f, "utf8")));
assert(raw.length === 0, `no API route puts error.message straight into a response (${raw.length} left)`);

// Cross-site changes.
const mw = read("src", "middleware.ts");
assert(/pathname\.startsWith\("\/api\/admin\/"\) && request\.method !== "GET" && request\.method !== "HEAD"/.test(mw) && mw.includes("Permintaan dari laman lain ditolak."), "an admin change that names another site as its origin is refused");

// Plain dek.
assert(plainDek('Dia berkata "pergi" dan *terus* pergi') === "Dia berkata “pergi” dan terus pergi", "a dek for a description has no asterisks and the house quotes");
for (const f of ["src/app/kategori/[type]/[slug]/page.tsx", "src/app/kategori/bersiri/[seriesSlug]/[episodeSlug]/page.tsx", "src/app/kategori/bersiri/[seriesSlug]/page.tsx", "src/lib/seo-jsonld.ts", "src/app/cari/page.tsx"]) {
  assert(read(...f.split("/")).includes("plainDek("), `${f} uses the plain dek`);
}
assert(!/description: (work|series)\.dek \}/.test(read("src", "lib", "seo-jsonld.ts")), "structured data never carries the raw dek");

// Keyboard, ids, targets.
assert(read("src", "components", "reader", "FootnoteMargin.tsx").includes("if (event.detail === 0) return;"), "Enter on a note number follows the link to the notes list");
const emblem = read("src", "components", "reader", "JalinEmblem.tsx");
assert(emblem.includes("useId()") && !/id="je-Gradient/.test(emblem), "each emblem has its own gradient ids");
assert(/\.series-carousel-dot \{ position: relative; width: 24px; height: 24px;/.test(read("src", "app", "globals.css")), "the series dots are 24px targets");
assert(read("src", "components", "reader", "LockDialog.tsx").includes('event.key === "Tab" && panelRef.current'), "the lock dialog keeps Tab inside");
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
