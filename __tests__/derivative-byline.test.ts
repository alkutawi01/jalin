/**
 * Izzat: "dalam sinopsis dan fragmen: hanya pengarang sebenar novel dipaparkan namanya di bawah tajuk. nama2 penyumbang disebut di
 * editorial sahaja." Sinopsis and fragmen are only ever taken from a real work (a novel) that was already published elsewhere, never
 * first published in Jalin. So under their title there is one name, the author of the original work, shown automatically from the
 * source record, and "Nama di bawah tajuk" does not apply to any of their credits.
 *
 * Found while reading how this works: the dashboard said "Keberangkatan ke Padang Panjang tiada penulis awam" (it only counted credits
 * of a registered contributor, while the author of a fragmen is the original author), and the publication gate counted any ticked
 * credit, including the original author's. And the status panel of the editor was not refreshed after a credit was added or deleted,
 * so a published work whose credits changed never offered "Terbitkan semula" until the page was reloaded.
 */
import fs from "node:fs";
import path from "node:path";
import { isDerivativeType, isOriginalAuthorRole } from "../src/lib/credit-roles";
import { bylineFor, projectEditorialCredits } from "../src/lib/reader/credit-projection";
import { projectCardAttribution } from "../src/lib/reader/card-attribution";
import { evaluatePublicationReadinessFromData } from "../src/lib/admin/publication-readiness";
import { buildImportPlan } from "../src/lib/admin/import/plan";
import { buildContentChecks } from "../src/lib/admin/dashboard-labels";
import type { EditorialHealth } from "../src/lib/admin/editorial-health";
import type { ContributorRef, Work } from "../src/lib/content/types";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string, detail?: unknown) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`, detail === undefined ? "" : JSON.stringify(detail)); }
}
const read = (p: string) => fs.readFileSync(path.join(__dirname, "..", p), "utf8").replace(/\r\n/g, "\n");

assert(isDerivativeType("sinopsis") && isDerivativeType("fragmen") && !isDerivativeType("cerpen") && !isDerivativeType("novela") && !isDerivativeType("bersiri") && !isDerivativeType(undefined), "the rule is for sinopsis and fragmen only");
assert(isOriginalAuthorRole("author") && isOriginalAuthorRole("Pengarang asal") && !isOriginalAuthorRole("initial_draft") && !isOriginalAuthorRole("final_editor"), "'author' is the original author's role");

// ── the name under the title ──
const hamka: ContributorRef = { slug: "guest:Hamka", role: "author", byline: true };
const editor: ContributorRef = { slug: "izzat-anas", role: "final_editor", byline: false, displayName: "Izzat Anas", kind: "human" };
const nara: ContributorRef = { slug: "claude", role: "initial_draft", byline: true, displayName: "Nara Zahin", kind: "virtual" };
const source = { author: "Hamka" };

assert(bylineFor({ type: "fragmen", credits: [hamka, editor], sourceWork: source }).map((p) => p.name).join() === "Hamka", "a fragmen: under the title only the original author");
assert(bylineFor({ type: "sinopsis", credits: [{ ...hamka, byline: false }, editor], sourceWork: source }).map((p) => p.name).join() === "Hamka", "a sinopsis: the author is shown even when his credit is not ticked (it is automatic)");
assert(bylineFor({ type: "sinopsis", credits: [hamka, nara], sourceWork: source }).map((p) => p.name).join() === "Hamka", "a Jalin writer ticked 'Nama di bawah tajuk' on a sinopsis is NOT shown under the title");
assert(bylineFor({ type: "fragmen", credits: [hamka, hamka], sourceWork: source }).length === 1, "the author appears once");
assert(bylineFor({ type: "sinopsis", credits: [hamka], sourceWork: { author: "  " } }).map((p) => p.name).join() === "Hamka", "no author in the source record: the public credit that names the original author stands in");
assert(bylineFor({ type: "sinopsis", credits: [nara, editor] }).length === 0, "no original author anywhere: nothing under the title (never a Jalin writer)");
assert(bylineFor({ type: "cerpen", credits: [nara, editor] }).map((p) => p.name).join() === "Nara Zahin", "other types are unchanged: the credits ticked 'Nama di bawah tajuk'");
assert(bylineFor({ type: "novela", credits: [nara], sourceWork: source }).map((p) => p.name).join() === "Nara Zahin", "...and a novela ignores any source record");

// ── contributors are in the editorial block, which is left as it was ──
const editorial = projectEditorialCredits([hamka, editor, nara]);
assert(editorial.some((e) => e.names.includes("Izzat Anas")) && editorial.some((e) => e.names.includes("Hamka")), "the editorial block still lists every public credit, as before", editorial);

// ── the list cards ──
const work = (over: Partial<Work>): Work => ({ id: "W", slug: "w", title: "Karya", type: "sinopsis", status: "published", dek: "d", credits: [], visuals: [], glossary: [], ...over } as unknown as Work);
const card = projectCardAttribution(work({ type: "sinopsis", credits: [nara], sourceWork: { title: "The Great Gatsby", author: "F. Scott Fitzgerald", language: "Inggeris" } as Work["sourceWork"] }));
assert(!JSON.stringify(card).includes("Nara") && !(card?.primary ?? "").startsWith("Sinopsis oleh"), "a sinopsis card never names a Jalin writer", card);
assert(JSON.stringify(card).includes("F. Scott Fitzgerald"), "...it names the original author", card);

// ── the publication gate (real data of the published fragmen, with the Editor credit just added) ──
const fragmenWork = { id: "JLN-FRA-0002", slug: "x", title: "Keberangkatan ke Padang Panjang", type: "fragmen", status: "published", body: "kata ".repeat(1500), dek: "Satu dek yang cukup panjang untuk lulus semakan dek karya ini.", genre: "Tragedi Romantik", audience: null, version: "v1.1", published_at: "2026-10-02T11:23:58Z", editorial_history: [], metadata: { fragmenTextLanguage: "Bahasa Indonesia" } };
const credit = (id: number, slug: string | null, guest: string | null, role: string, byline: boolean) => ({ id, work_id: "JLN-FRA-0002", contributor_slug: slug, guest_name: guest, role_label: role, byline, is_public: true, sort_order: id });
const sourceRow = { original_title: "Tenggelamnya Kapal Van Der Wijck", author: "Hamka", original_language: "Bahasa Indonesia", source_edition: "1976", source_url: null, source_locator: "Bab 8", source_text_basis: null, publication_year: 1931, rights_status: "public_domain", rights_notes: "-", rights_evidence: "-", rights_history: [], reviewed_by: "a@b.c", reviewed_at: "2026-10-01T23:37:46Z", approved_material_hash: null };
const ready = (over: Record<string, unknown>) => evaluatePublicationReadinessFromData({
  work: fragmenWork, credits: [credit(1, null, "Hamka", "author", false), credit(2, "izzat-anas", null, "final_editor", false)], visuals: [], glossary: [], visualRequests: [],
  sourceWork: sourceRow, knownContributorSlugs: new Set(["izzat-anas"]), publishedSourcePeers: [], ...over
} as never) as { blockers: { code: string }[]; warnings: { code: string }[] };
const codes = (r: { blockers: { code: string }[]; warnings: { code: string }[] }) => [...r.blockers, ...r.warnings].map((i) => i.code);
assert(!codes(ready({})).includes("byline_missing"), "a fragmen needs no credit ticked 'Nama di bawah tajuk'");
assert(!codes(ready({ work: { ...fragmenWork, status: "draft" } })).includes("byline_missing"), "...also while it is still a draft");
assert(ready({ work: { ...fragmenWork, status: "draft" }, sourceWork: { ...sourceRow, author: "" } }).blockers.some((b) => b.code === "source_incomplete"), "its author comes from the source record, which the gate requires");
assert(codes(ready({ work: { ...fragmenWork, type: "cerpen", status: "draft", metadata: null }, sourceWork: null })).includes("byline_missing"), "a cerpen still needs a ticked credit (unchanged)");

// ── the dashboard check ──
assert(buildContentChecks({ authors: { status: "pass", issues: [], items: [] }, revisions: { status: "pass", issues: [], items: [] }, visuals: { status: "pass", issues: [], items: [] }, translations: { status: "pass", issues: [], items: [] }, rights: { status: "pass", issues: [], items: [] } } as EditorialHealth).needAttention.length === 0, "baseline: nothing to do");
const health = read("src/lib/admin/editorial-health.ts");
assert(health.includes("isDerivativeType(work.type)") && health.includes('.selectFrom("source_works")') && health.includes('tab: derivative ? "source" : "credits"'), "the dashboard counts the original author (source record) for a sinopsis or fragmen, not a registered contributor");
assert(read("src/lib/admin/dashboard-labels.ts").includes("pengarang asal (tab Sumber) bagi sinopsis dan fragmen") && read("src/app/admin/page.tsx").includes("{item.fix ?? row.fix}"), "the dashboard words it that way and the button says 'Isi pengarang asal'");

// ── the chatbot import ──
const answer = (type: string) => "JSON\n" + JSON.stringify({
  parserVersion: "v3", type, title: "Ujian", slug: "ujian", dek: "Satu dek.", genre: "drama", audience: "13-17", readingMinutes: 1,
  author: { name: "tidak dinyatakan", credit: "author" }, source: { title: "The Great Gatsby", author: "F. Scott Fitzgerald", language: "Inggeris", provenance: "edisi" },
  characters: [], locations: [], themes: [], glossary: [], sections: [], visualBible: { characters: [], objects: [], settings: [], colors: [] }, visualSuggestions: []
}, null, 2) + "\nEditor Report\n\nKekuatan:\n- ok";
const sinopsisPlan = buildImportPlan(answer("sinopsis"), "Isi sinopsis yang cukup.", { mode: "data", writerName: "Nara Zahin" });
assert(Boolean(sinopsisPlan.plan) && sinopsisPlan.plan!.credits.every((c) => !c.byline) && sinopsisPlan.plan!.credits.some((c) => c.roleLabel === "author") && sinopsisPlan.plan!.credits.some((c) => c.guestName === "Nara Zahin"), "import: a sinopsis' credits are none of them under the title (original author and Jalin's writer are both only credits)", sinopsisPlan.plan?.credits);
assert(!sinopsisPlan.warnings.some((w) => w.code === "byline_missing"), "import: no 'byline missing' warning for a sinopsis");
const cerpenPlan = buildImportPlan(answer("cerpen"), "Isi cerpen yang cukup.", { mode: "data", writerName: "Nara Zahin" });
assert(cerpenPlan.plan?.credits.find((c) => c.guestName === "Nara Zahin")?.byline === true, "import: a cerpen's writer is still under the title");

// ── the credit service and the editor ──
const service = read("src/lib/admin/credit-service.ts");
assert(service.includes("const byline = input.byline && (await bylineAllowed(db, input.workId));") && service.includes("updateData.byline = input.byline && (current ? await bylineAllowed(db, current.work_id) : true)"), "the server never stores a ticked credit on a sinopsis or fragmen, whoever calls it");
const editorPage = read("src/app/admin/works/[id]/page.tsx");
assert(editorPage.includes("{!isDerivativeType(form.type) ? <th>Nama di bawah tajuk</th> : null}") && editorPage.includes("byline: isDerivativeType(form.type) ? false : editingCredit.byline"), "the editor has no such tick for a sinopsis or fragmen, in the form or the table");
assert(editorPage.includes('id="derivative-byline-note"') && editorPage.includes("ialah pengarang karya asal. Ia dipaparkan automatik daripada tab Sumber"), "...and says why");
for (const fn of ["handleSaveCredit", "handleDeleteCredit", "handleSaveVisual", "handleReplaceVisual", "handleDeleteVisual", "handleSaveGlossary", "handleDeleteGlossary", "handleSaveCharacters"]) {
  const start = editorPage.indexOf(`async function ${fn}(`);
  const body = editorPage.slice(start, editorPage.indexOf("\n  }\n", start));
  assert(start > 0 && body.includes("await loadReadiness()"), `${fn} refreshes the status panel, so "Terbitkan semula" appears at once`);
}
const agents = read("AGENTS.md");
assert(agents.includes("25. ") && agents.includes("Sinopsis dan fragmen hanya diambil daripada karya"), "AGENTS.md records the rule");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
