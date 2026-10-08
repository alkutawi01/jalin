/**
 * Izzat (8 Okt): adding an episode to an existing series, "Tampal & isi" answered "Tiada bahagian ... ditemui" for a chatbot answer
 * that looked right. What reached the parser can differ from what the editor sees (escaped or full-width brackets, invisible
 * characters), and the copied PROMPT looks like an answer but would write its placeholders into the work. Also: the dek must not tell the story.
 */
import fs from "node:fs";
import path from "node:path";
import { buildWorkFillPrompt, isPlaceholder, looksLikePrompt, parseWorkFill } from "../src/lib/admin/authoring/work-fill";
import { DEK_RULE, dekWarning } from "../src/lib/admin/authoring/dek-rule";
import { DEFAULT_GLOBAL_RULES } from "../src/lib/admin/authoring/default-prompts";

let passed = 0, failed = 0;
function assert(c: boolean, m: string) { if (c) { passed++; console.log(`  ✓ ${m}`); } else { failed++; console.error(`  ✗ ${m}`); } }
const read = (p: string) => fs.readFileSync(path.join(__dirname, "..", p), "utf8").replace(/\r\n/g, "\n");

const ANSWER = `[MAKLUMAT]
Dek: Hilmi menyambut kerja baharu Sara.
Genre: Drama rumah tangga

[WATAK]
Nama: Hilmi
Peranan: Suami Sara dan pemilik Cetak Kota
____
Nama: Sara
Peranan: Isteri Hilmi

[LATAR]
Jenis: tempat
Nama: Cetak Kota
Keterangan: Kedai fotostat milik Hilmi
____
Tiada latar masa dinyatakan.

[GLOSARI]
Istilah: invois
Maksud: Dokumen bayaran.
Asing: tiada`;

const plain = parseWorkFill(ANSWER);
assert(plain.sections.join() === "MAKLUMAT,WATAK,LATAR,GLOSARI" && plain.characters.length === 2 && plain.places.length === 1, "the plain answer is read (4 sections, 2 characters, 1 place)");

// Damaged but visually identical forms of the same answer
const escaped = ANSWER.replace(/\[(\w+)\]/g, "\\[$1\\]");
assert(parseWorkFill(escaped).sections.length === 4, "markdown-escaped headings (\\[MAKLUMAT\\]) are read");
const fullwidth = ANSWER.replace(/\[(\w+)\]/g, "［$1］");
assert(parseWorkFill(fullwidth).sections.length === 4, "full-width brackets ［MAKLUMAT］ are read");
const lenticular = ANSWER.replace(/\[(\w+)\]/g, "【$1】");
assert(parseWorkFill(lenticular).sections.length === 4, "lenticular brackets 【MAKLUMAT】 are read");
const invisible = ANSWER.replace(/\[(\w+)\]/g, "​[$1]​").replace(/\n/g, "​\n");
assert(parseWorkFill(invisible).sections.length === 4 && parseWorkFill(invisible).dek === "Hilmi menyambut kerja baharu Sara.", "zero-width characters around headings and lines are ignored");
const nbsp = ANSWER.replace(/Dek: /, "Dek: ");
assert(parseWorkFill(nbsp).dek === "Hilmi menyambut kerja baharu Sara.", "a non-breaking space after a label is read");
const bold = ANSWER.replace(/\[(\w+)\]/g, "**[$1]**");
assert(parseWorkFill(bold).sections.length === 4, "bold headings are still read");
assert(parseWorkFill("Berikut ialah jawapan saya.\nTiada apa-apa di sini.").sections.length === 0, "text with no heading is still 'nothing found'");

// The copied prompt must never be read as an answer
const prompt = buildWorkFillPrompt({ type: "bersiri", chapterSlugs: [], characterNames: [], placeNames: [], timeNames: [], glossaryTerms: [], body: "" } as never);
assert(looksLikePrompt(prompt) && !looksLikePrompt(ANSWER), "the prompt is recognised and the answer is not");
const fromPrompt = parseWorkFill(prompt);
assert(fromPrompt.dek === "" && fromPrompt.genre === "" && fromPrompt.characters.length === 0 && fromPrompt.places.length === 0 && fromPrompt.times.length === 0, "even if parsed, the prompt's own placeholders fill nothing");
assert(isPlaceholder("(nama tempat)") && isPlaceholder("(2 hingga 8 patah perkataan)") && !isPlaceholder("Kedai (lama) Pak Din") && !isPlaceholder("(Wan)"), "a value wholly in brackets is a placeholder; a name with a bracket is not");

// The dek tempts, it does not tell
const SPOILER = "Apabila Sara mendapat pekerjaan baharu, Hilmi menyambut kejayaan isterinya dengan bangga, walaupun perniagaannya sendiri masih dibebani masalah kewangan. Namun, ketika rutin harian mereka mula berubah, Hilmi menyedari bahawa berkongsi kehidupan dengan dunia baharu isterinya tidak semudah yang disangkakan.";
assert(dekWarning(SPOILER) !== null && /perkataan/.test(dekWarning(SPOILER)!), "the dek that retold the episode is flagged as too long");
assert(dekWarning("Hilmi menyedari wangnya tidak cukup.")?.includes("menyedari") === true, "a short dek that tells a turn is flagged by the telling word");
assert(dekWarning("Sara memulakan kerja baharu pada hari Isnin.") === null && dekWarning("") === null, "a short opening hook passes");
assert(prompt.includes(DEK_RULE) && DEFAULT_GLOBAL_RULES.includes(DEK_RULE) && read("src/lib/admin/authoring/output-format.ts").includes("${DEK_RULE}"), "the same dek rule is in the paste prompt, the global rules and the answer format");
assert(DEK_RULE.includes("JANGAN ceritakan perkembangan") && DEK_RULE.includes("tidak lebih 30 perkataan") && DEK_RULE.includes("episod bersiri"), "the rule forbids the story's development, caps the length and covers series episodes");

// The page
const page = read("src/app/admin/works/[id]/page.tsx");
assert(page.includes("looksLikePrompt(text)") && page.indexOf("looksLikePrompt(text)") < page.indexOf("parseWorkFill(text)"), "the page refuses the copied prompt before parsing");
assert(page.includes("Papan keratan mengandungi ${text.length} aksara dan bermula dengan"), "when nothing is found the notice says what was read");
assert(page.includes("dekWarning(result.dek)"), "a pasted dek is checked and the editor is told");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
