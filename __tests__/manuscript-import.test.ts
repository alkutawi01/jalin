/**
 * Manuscript import (pure modules): chatbot answer parsing, chapter
 * splitting, anchor resolution and plan building. No database.
 */

import { splitIntoSections, prepareSingleBody, resolveAnchor, toParagraphs } from "../src/lib/admin/import/manuscript";
import { extractParserJson, readParserAnswer } from "../src/lib/admin/import/parser-output";
import { buildImportPlan } from "../src/lib/admin/import/plan";
import { countWords, estimateReadingMinutes, slugify } from "../src/lib/admin/import/text-utils";

let passed = 0;
let failed = 0;

function assert(condition: boolean, description: string) {
  if (condition) {
    console.log(`  ✓ ${description}`);
    passed++;
  } else {
    console.log(`  ✗ ${description}`);
    failed++;
  }
}

console.log("manuscript import tests\n");

// ── text utils ────────────────────────────────────────────────
assert(countWords("  satu dua\ntiga  ") === 3, "countWords counts whitespace-separated words");
assert(estimateReadingMinutes(10048) === 50, "10,048 words is 50 minutes at 200 wpm");
assert(estimateReadingMinutes(10) === 1, "reading minutes has a floor of 1");
assert(slugify("Sekuntum Bunga untuk Alia!") === "sekuntum-bunga-untuk-alia", "slugify strips punctuation");
assert(slugify("Ça va très bien") === "ca-va-tres-bien", "slugify strips diacritics");

// ── fixtures ──────────────────────────────────────────────────
const MANUSCRIPT = [
  "Kisah Lampu Lama",
  "Sebuah novelet",
  "",
  "BAB 1",
  "MALAM PERTAMA",
  "Lampu di hujung koridor menyala. “Siapa di situ?” tanya Adi. Dia mahu membuat audit kecil sebelum pulang.",
  "Bunyi kipas berdengung perlahan.",
  "- baris ini bermula dengan sengkang",
  "BAB 2",
  "AUDIT",
  "Kak Nur datang membawa fail. Dia berkata bahawa audit sudah lama tertangguh, dan Adi mengangguk.",
  "Mereka membaca fail itu hingga subuh.",
  "BAB 3",
  "PILIHAN",
  "Pagi itu Adi memilih untuk memadam lampu lama. Sebuah bunga kertas berwarna biru kelabu terletak di atas meja."
].join("\n");

const JSON_BODY = {
  parserVersion: "v3",
  type: "novela",
  title: "Kisah Lampu Lama",
  slug: "kisah-lampu-lama",
  dek: "Seorang lelaki menemui lampu lama.",
  genre: "misteri",
  audience: "13-17",
  readingMinutes: 1,
  author: { name: "tidak dinyatakan", credit: "author" },
  characters: [
    { name: "Adi", role: "penjaga", firstAppearanceSection: "bab-1" },
    { name: "Kak Nur", role: "rakan", firstAppearanceSection: "bab-2" },
    { name: "Hantu", role: "watak", firstAppearanceSection: "bab-99" }
  ],
  locations: [{ name: "koridor", firstAppearanceSection: "bab-1" }],
  themes: ["kesunyian"],
  glossary: [
    { term: "audit", meaning: "pemeriksaan rasmi", firstAppearanceSection: "bab-1" },
    { term: "Adi", meaning: "nama watak", firstAppearanceSection: "bab-1" },
    { term: "tiada-dalam-teks", meaning: "x", firstAppearanceSection: "bab-1" }
  ],
  sections: [
    { order: 1, slug: "bab-1", title: "Malam pertama", headingText: "BAB 1\nMALAM PERTAMA", summary: "s1" },
    { order: 2, slug: "bab-2", title: "Audit", headingText: "BAB 2\nAUDIT", summary: "s2" },
    { order: 3, slug: "bab-3", title: "Pilihan", headingText: "BAB 3\nPILIHAN", summary: "s3" }
  ],
  visualBible: { characters: [], objects: [], settings: [], colors: [] },
  visualSuggestions: [
    {
      role: "hero",
      sectionSlug: "",
      anchor: "",
      place: "after",
      aspectRatio: "3:2",
      scene: "An empty corridor at night with one old lamp glowing.",
      notInScene: "No people.",
      faceTreatment: "no people in frame",
      altText: "Koridor kosong dengan lampu lama.",
      reason: "Suasana."
    },
    {
      role: "inline",
      sectionSlug: "bab-1",
      // straight quotes + different casing than the manuscript's curly quotes
      anchor: '"siapa di situ?" tanya adi.',
      place: "after",
      aspectRatio: "4:3",
      scene: "A man holds a lantern in a dim corridor, seen from behind.",
      notInScene: "Kak Nur is not present.",
      faceTreatment: "from behind",
      altText: "Seorang lelaki memegang lampu.",
      reason: "Adegan pembuka."
    }
  ],
  editorialNotes: {}
};

const ANSWER_BARE = `JSON\n${JSON.stringify(JSON_BODY, null, 2)}\nEditor Report\n\nKekuatan:\n- ok`;
const ANSWER_FENCED = "Berikut hasilnya:\n```json\n" + JSON.stringify(JSON_BODY, null, 2) + "\n```\n\nKekuatan:\n- ok";

// ── extraction ────────────────────────────────────────────────
{
  const bare = extractParserJson(ANSWER_BARE);
  assert(bare !== null && bare.report.startsWith("Editor Report"), "extracts bare JSON after a copied 'JSON' label; report follows");
  const fenced = extractParserJson(ANSWER_FENCED);
  assert(fenced !== null && fenced.report.startsWith("Kekuatan"), "extracts JSON from a fenced ```json block");
  assert(extractParserJson("tiada json di sini") === null, "returns null when there is no JSON");
  const trailing = readParserAnswer('{"type":"cerpen","title":"T","slug":"t",}');
  assert(trailing.data !== null && trailing.warnings.some((w) => w.code === "json_trailing_commas"), "repairs trailing commas with a warning");
  assert(readParserAnswer('{"type": ').errors.some((e) => e.code === "json_not_found" || e.code === "json_invalid"), "broken JSON is an error");
}

// ── validation ────────────────────────────────────────────────
{
  const bersiri = readParserAnswer(JSON.stringify({ ...JSON_BODY, type: "bersiri" }));
  assert(bersiri.data !== null && bersiri.data.type === "bersiri", "bersiri is accepted as a type");
  const noTitle = readParserAnswer(JSON.stringify({ ...JSON_BODY, title: "tidak dinyatakan" }));
  assert(noTitle.errors.some((e) => e.code === "title_missing"), "'tidak dinyatakan' title is a missing title");
  const noSections = readParserAnswer(JSON.stringify({ ...JSON_BODY, sections: [] }));
  assert(noSections.errors.some((e) => e.code === "sections_missing"), "novela without sections is an error");
  const ok = readParserAnswer(ANSWER_BARE);
  assert(ok.data !== null && ok.data.authorName === null, "'tidak dinyatakan' author normalises to null");
  const badRatio = readParserAnswer(
    JSON.stringify({ ...JSON_BODY, visualSuggestions: [{ ...JSON_BODY.visualSuggestions[0]!, aspectRatio: "5:7" }] })
  );
  assert(badRatio.data?.visuals[0]?.aspectRatio === "3:2", "unsupported aspect ratio falls back to the role default");
}

// ── splitting ─────────────────────────────────────────────────
{
  const parsed = readParserAnswer(ANSWER_BARE).data!;
  const split = splitIntoSections(MANUSCRIPT, parsed.sections);
  assert(split.errors.length === 0 && split.sections.length === 3, "splits three chapters (headings span two lines)");
  assert(split.sections[1]!.body.startsWith("Kak Nur datang"), "chapter 2 body starts right after its heading (not at the prose word 'audit' in chapter 1)");
  assert(split.sections[0]!.body.includes("audit kecil"), "prose containing a heading word stays in chapter 1");
  assert(!split.sections[0]!.body.includes("BAB 2"), "chapter 1 body does not contain the next heading");
  assert(split.sections[0]!.body.split("\n\n").length === 3, "each line becomes one markdown paragraph");
  assert(split.sections[0]!.body.includes("\\- baris ini"), "a line starting with a markdown marker is escaped");
  assert(split.preface.text.includes("Kisah Lampu Lama"), "title block before chapter 1 is kept out of the chapters");
  assert(split.sections.every((s, i) => s.position === i + 1), "positions are 1..N without gaps");

  const missing = splitIntoSections(
    MANUSCRIPT.replace("BAB 3\nPILIHAN", "BAB TIGA\nKEPUTUSAN"),
    parsed.sections.map((s) => (s.slug === "bab-3" ? { ...s, headingText: "BAB 3\nPILIHAN", title: "Pilihan" } : s))
  );
  assert(missing.errors.some((e) => e.code === "heading_not_found"), "a heading that is not in the manuscript is reported");
  assert(missing.sections.length === 0, "no partial split when any heading is missing");

  const lower = splitIntoSections(MANUSCRIPT.toLowerCase(), parsed.sections);
  assert(lower.errors.length === 0, "heading match ignores case");
}

// ── anchors ───────────────────────────────────────────────────
{
  const parsed = readParserAnswer(ANSWER_BARE).data!;
  const split = splitIntoSections(MANUSCRIPT, parsed.sections);
  const bodies = split.sections.map((s) => ({ slug: s.slug, body: s.body }));
  const resolved = resolveAnchor('"siapa di situ?" tanya adi.', bodies, "bab-1");
  assert(resolved !== null && resolved.sectionSlug === "bab-1", "anchor with straight quotes/other casing is found in the right chapter");
  assert(
    resolved !== null && resolved.anchor.startsWith("Lampu di hujung koridor menyala.") && resolved.anchor.endsWith("sebelum pulang."),
    "anchor widens to the whole paragraph (uses the author's exact text)"
  );
  assert(resolveAnchor("ayat yang tidak wujud", bodies, null) === null, "unknown anchor returns null");
  const wrongHint = resolveAnchor("Mereka membaca fail itu hingga subuh.", bodies, "bab-1");
  assert(wrongHint !== null && wrongHint.sectionSlug === "bab-2", "anchor is found even when the chapter hint is wrong");
}

// ── single body ───────────────────────────────────────────────
{
  const single = prepareSingleBody("Surat Lama\n\nSatu dua.\nTiga empat.", "Surat Lama");
  assert(single.droppedTitleLine && single.body === "Satu dua.\n\nTiga empat.", "cerpen body drops a leading title line and normalises paragraphs");
  assert(toParagraphs("a\r\n\r\n b \n") === "a\n\nb", "toParagraphs trims and collapses blank lines");
  assert(toParagraphs("## Bahagian 1\nTeks.\n## Bahagian 2\nLagi.") === "## Bahagian 1\n\nTeks.\n\n## Bahagian 2\n\nLagi.", "a '## ' section heading stays a heading and is not escaped to a backslash heading (a pasted sinopsis lost its headings)");
  assert(toParagraphs("# Satu\n### Tiga\n- senarai") === "\\# Satu\n\n\\### Tiga\n\n\\- senarai", "other markdown markers are still escaped");
}

// ── plan ──────────────────────────────────────────────────────
{
  const result = buildImportPlan(ANSWER_BARE, MANUSCRIPT);
  assert(result.ok && result.plan !== null, "plan builds for a valid answer and manuscript");
  const plan = result.plan!;
  assert(plan.work.status === "draft", "plan is always a draft");
  assert(plan.work.body === "" && plan.sections.length === 3, "novela keeps works.body empty and stores chapters as sections");
  assert(plan.credits.length === 0 && result.warnings.some((w) => w.code === "byline_missing"), "unknown author: no credit, and a warning");
  assert(plan.glossary.length === 1 && plan.glossary[0]!.term === "audit", "glossary keeps only real terms (drops names and terms absent from the text)");
  assert(result.warnings.some((w) => w.code === "glossary_term_is_name"), "name-as-glossary-term is reported");
  assert(result.warnings.some((w) => w.code === "glossary_term_not_in_text"), "term missing from the text is reported");
  assert(plan.characters.find((c) => c.name === "Hantu")?.firstAppearanceSection === null, "character pointing at an unknown chapter loses the reference");
  assert(result.warnings.some((w) => w.code === "character_section_unknown"), "unknown chapter reference is reported");
  assert(plan.visuals.length === 2 && plan.visuals[0]!.anchor === null, "hero has no anchor");
  assert(plan.visuals[1]!.anchor?.startsWith("Lampu di hujung koridor") === true, "inline visual anchor is the exact paragraph");
  assert(
    plan.visuals[0]!.finalPrompt.includes("Soft cinematic editorial illustration") &&
      plan.visuals[0]!.finalPrompt.includes("An empty corridor at night") &&
      plan.visuals[0]!.finalPrompt.includes("Face treatment: no people in frame."),
    "final prompt = house style + scene + face treatment"
  );
  assert(plan.visuals[0]!.finalPrompt.includes("Aspect ratio: 3:2."), "final prompt carries the aspect ratio");
  assert(plan.work.readingMinutes === 1, "reading minutes computed from stored text");

  const noManuscript = buildImportPlan(ANSWER_BARE, "  ");
  assert(!noManuscript.ok && noManuscript.errors.some((e) => e.code === "manuscript_missing"), "missing manuscript is an error");

  const override = buildImportPlan(ANSWER_BARE, MANUSCRIPT, { slugOverride: "lampu-lama-2" });
  assert(override.plan?.work.slug === "lampu-lama-2", "slug override is applied");

  const mismatched = buildImportPlan(ANSWER_BARE, MANUSCRIPT.replace("BAB 2\nAUDIT", "PASAL DUA"));
  assert(!mismatched.ok && mismatched.errors.some((e) => e.code === "heading_not_found"), "manuscript that differs from what the chatbot saw fails clearly");
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
