/**
 * From a Codex session adding episode 3 (8 Okt): a draft held the prompt's own placeholders as real data ("(satu genre dalam satu atau
 * dua patah perkataan)" as genre, "(tahun, tempoh atau era)" as a time) and the readiness check let it through; the preview showed other
 * bylines than the published page; the tab counts read "(0)" before the lists loaded.
 */
import fs from "node:fs";
import path from "node:path";
import { isPlaceholder, placeholderFields } from "../src/lib/admin/authoring/placeholder";
import { parseGlossaryPaste } from "../src/lib/admin/authoring/glossary-paste";
import { evaluatePublicationReadinessFromData, type EvaluatePublicationReadinessInput, type ReadinessWorkInput } from "../src/lib/admin/publication-readiness";

let passed = 0, failed = 0;
function assert(c: boolean, m: string) { if (c) { passed++; console.log(`  ✓ ${m}`); } else { failed++; console.error(`  ✗ ${m}`); } }
const read = (p: string) => fs.readFileSync(path.join(__dirname, "..", p), "utf8").replace(/\r\n/g, "\n");

assert(isPlaceholder("(tahun, tempoh atau era)") && isPlaceholder("(2 hingga 8 patah perkataan)") && isPlaceholder("(perkataan seperti dieja dalam teks)"), "the prompt's placeholders are recognised");
assert(!isPlaceholder("Kedai (lama) Pak Din") && !isPlaceholder("(Wan)") && !isPlaceholder("Mei 1969") && !isPlaceholder("") && !isPlaceholder(null), "real values and short bracketed names are not");

const work = (over: Partial<ReadinessWorkInput> = {}): ReadinessWorkInput => ({
  id: "JLN-CER-0001", slug: "kisah-uji-baca", title: "Kisah Uji Baca", type: "cerpen", status: "ready",
  body: "Di bawah langit Senai yang kelabu, Aminah menunggu bas sekolah.", dek: "Sebuah cerpen tentang menunggu.", genre: "Keluarga",
  audience: "remaja", version: "v1.0", published_at: null, editorial_history: "[]", ...over
});
const input = (w: ReadinessWorkInput, glossary = [{ id: 1, work_id: "JLN-CER-0001", term: "simpul", meaning: "cekal", source: "Kamus Dewan" }]): EvaluatePublicationReadinessInput => ({
  work: w,
  credits: [{ id: 1, work_id: "JLN-CER-0001", contributor_slug: "izzat-anas", guest_name: null, role_label: "Penulis", byline: true, is_public: true, sort_order: 0 }],
  visuals: [{ id: 10, work_id: "JLN-CER-0001", role: "hero", src: "https://x.storage.neon.tech/jalin-visuals/assets/visuals/vr-1-v1-abc12345.png", alt: "Bayang", provider: "magnific", creation_id: "c", anchor: null, place: "after", sort_order: 0, is_asset_finalized: true } as never],
  glossary, visualRequests: [], knownContributorSlugs: new Set(["izzat-anas"]), slugTakenByOther: false
});

assert(evaluatePublicationReadinessFromData(input(work())).blockers.every((b) => b.code !== "placeholder_text"), "a work with real text has no placeholder blocker");
const cases: Array<[string, Partial<ReadinessWorkInput>, string]> = [
  ["dek", { dek: "(satu atau dua ayat yang menarik pembaca)" }, "Dek"],
  ["genre", { genre: "(satu genre dalam satu atau dua patah perkataan)" }, "Genre"],
  ["time", { metadata: { times: [{ name: "(tahun, tempoh atau era)", description: "(2 hingga 8 patah perkataan)" }] } }, "Latar masa"],
  ["place", { metadata: { places: [{ name: "(nama tempat)" }] } }, "Latar tempat"],
  ["character", { metadata: { characters: [{ name: "(nama watak seperti dalam teks)", role: "Jiran" }] } }, "Watak"]
];
for (const [label, over, expected] of cases) {
  const r = evaluatePublicationReadinessFromData(input(work(over)));
  const hit = r.blockers.find((b) => b.code === "placeholder_text");
  assert(!!hit && hit.message.includes(expected) && r.ready === false, `placeholder ${label} blocks publication and names "${expected}"`);
}
const g = evaluatePublicationReadinessFromData(input(work(), [{ id: 1, work_id: "JLN-CER-0001", term: "(perkataan seperti dieja dalam teks)", meaning: "(maksud ringkas)", source: "x" }]));
assert(g.blockers.some((b) => b.code === "placeholder_text" && b.message.includes("Glosari")), "a placeholder glossary term blocks publication");
assert(placeholderFields(work({ dek: "(satu atau dua ayat)", genre: "(satu genre dalam satu patah)" }), []).join() === "Dek,Genre", "all fields with leftovers are listed together");

// Glossary paste drops placeholders
const pasted = parseGlossaryPaste("[GLOSARI]\nIstilah: (perkataan seperti dieja dalam teks)\nMaksud: (maksud ringkas)\n____\nIstilah: simpul\nMaksud: Ikatan tali.", "Dia membuat simpul pada tali.", []);
assert(pasted.items.length === 1 && pasted.items[0]!.term === "simpul", "a pasted glossary placeholder is not added; the real term is");

// Preview uses the database names
const preview = read("src/app/pratonton/[id]/page.tsx");
assert(preview.includes('selectFrom("contributors")') && preview.includes("displayName: String(row.display_name)") && preview.includes('"is_visible", "=", true'), "the preview takes contributor names from the table (visible ones), as the published page does");
// Tab counts
const page = read("src/app/admin/works/[id]/page.tsx");
assert(page.includes("const countOf = (key: string, n: number) => (loadedLists[key] ?") && page.includes('Glosari{countOf("glossary", glossaryTerms.length)}') && page.includes('Watak &amp; latar{countOf("characters", characters.length)}') && !page.includes("Watak &amp; latar ({characters.length})"), "tab counts appear only after their list has loaded");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
