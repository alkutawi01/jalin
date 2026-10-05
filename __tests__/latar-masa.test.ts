/**
 * Latar masa (when the story happens: a year, a period or an era, not the time of day) beside Latar tempat, and the chatbot instructions that
 * now ask for both. Built after testing every instruction with ChatGPT: the answers gave character names but no places and no time.
 */
import fs from "node:fs";
import path from "node:path";
import { validateTimeEntries, validatePlaceEntries, TIMES_MAX } from "../src/lib/admin/work-service";
import { charactersFingerprint } from "../src/lib/admin/revision-service";
import { publicTimes } from "../src/lib/reader/places";
import { buildWorkFillPrompt, parseWorkFill } from "../src/lib/admin/authoring/work-fill";
import { composeAiPrompt } from "../src/lib/admin/authoring/compose-prompt";
import { parseLabelledAnswer } from "../src/lib/admin/authoring/labelled-output";
import { buildImportPlan } from "../src/lib/admin/import/plan";
import { RECIPE_KEYS } from "../src/lib/admin/authoring/recipes";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}
function throws(fn: () => unknown, part: string): boolean {
  try { fn(); return false; } catch (e) { return (e as Error).message.includes(part); }
}
const read = (p: string) => fs.readFileSync(path.join(__dirname, "..", p), "utf8").replace(/\r\n/g, "\n");

// storage rules
assert(JSON.stringify(validateTimeEntries([{ name: " Mei 1969 ", description: "selepas rusuhan." }])) === JSON.stringify([{ name: "Mei 1969", description: "Selepas rusuhan" }]), "a time is trimmed, its note starts with a capital and loses the final full stop");
assert(throws(() => validateTimeEntries([{ name: "1969" }, { name: "1969" }]), "Latar masa \"1969\" disenaraikan dua kali"), "the same time twice is refused");
assert(throws(() => validateTimeEntries(Array.from({ length: TIMES_MAX + 1 }, (_, i) => ({ name: `T${i}` }))), "paling banyak"), `more than ${TIMES_MAX} times is refused`);
assert(throws(() => validateTimeEntries("x"), "times mesti senarai") && throws(() => validatePlaceEntries("x"), "places mesti senarai"), "each list names itself in its error");
assert(JSON.stringify(validatePlaceEntries([{ name: "Riyadh", description: "latar tempat utama" }])) === JSON.stringify([{ name: "Riyadh", description: "Latar tempat utama" }]), "a place note is capitalised: Riyadh: Latar tempat utama");

// the reader
assert(JSON.stringify(publicTimes({ times: [{ name: "1969", description: "zaman berkurung", x: 1 }, { name: "" }] })) === JSON.stringify([{ name: "1969", description: "Zaman berkurung" }]), "the reader gets name and note only, capitalised");
const chrome = read("src/components/reader/StoryChrome.tsx");
assert(chrome.includes("Latar masa") && chrome.includes("times.map") && read("src/components/reader/WorkView.tsx").includes("times={times}"), "the right column shows Latar masa under Latar tempat");
assert(read("src/components/reader/MobileStoryInfo.tsx").includes("Latar masa") && read("src/components/reader/MobileStoryInfo.tsx").includes("hasSetting"), "so does the phone's Latar tab");

// change detection
assert(charactersFingerprint({ times: [{ name: "1969", description: "x" }] }) !== charactersFingerprint({}), "adding a time is an unpublished change");
assert(charactersFingerprint({ times: [] }) === "" && charactersFingerprint({}) === "", "a work without times looks exactly as before");

// the editor
const editor = read("src/app/admin/works/[id]/page.tsx");
assert(editor.includes('kind="times"') && read("src/components/admin/PlacesEditor.tsx").includes("BUKAN pagi, siang atau malam"), "the editor has a Latar masa list that says it is not the time of day");
assert(fs.existsSync(path.join(__dirname, "../src/app/api/admin/works/[id]/times/route.ts")), "and its API");

// the one-paste prompt asks for places and times, and the parser reads them
const prompt = buildWorkFillPrompt({ type: "cerpen", body: "Teks.", glossaryTerms: [], characterNames: [], placeNames: ["Kampung Baru"], timeNames: [], chapterSlugs: [] });
assert(prompt.includes("[LATAR]") && prompt.includes("BUKAN waktu pagi, siang, petang atau malam") && prompt.includes("Tiada latar masa dinyatakan") && prompt.includes("Tempat yang SUDAH ada (jangan ulang): Kampung Baru"), "the prompt asks for [LATAR], says time is a year or era, allows 'none', and lists what exists");
assert(prompt.includes("2 hingga 6 patah perkataan") && prompt.includes("tanpa noktah"), "a role is asked for as a short label, not a sentence");
const answer = [
  "[MAKLUMAT]", "Dek: Satu dek.", "Genre: Drama", "",
  "[WATAK]", "Nama: Aminah", "Peranan: Remaja empat belas tahun", "",
  "[LATAR]", "Jenis: tempat", "Nama: Lorong Haji Taib", "Keterangan: lorong yang sunyi", "____", "Jenis: masa", "Nama: Mei 1969", "Keterangan: selepas rusuhan", "",
  "Jenis: masa", "Nama: Awal 1980-an", "Keterangan: Aminah sudah menjadi guru"
].join("\n");
const parsed = parseWorkFill(answer);
assert(parsed.places.length === 1 && parsed.places[0]!.name === "Lorong Haji Taib" && parsed.times.map((t) => t.name).join("|") === "Mei 1969|Awal 1980-an", "the answer's places and times are read (separated by ____ or by a new Jenis)");
const none = parseWorkFill("[LATAR]\nTiada latar masa dinyatakan.\nJenis: tempat\nNama: Kuala Lumpur\nKeterangan: bandar");
assert(none.times.length === 0 && none.places.length === 1, "'no time stated' gives no time, and the place after it is still read");
const oneLine = parseWorkFill("[LATAR]\nTempat: Seremban - bandar tempat Aminah mengajar\nMasa: Tahun 1998");
assert(oneLine.places[0]?.name === "Seremban" && oneLine.places[0]?.description === "bandar tempat Aminah mengajar" && oneLine.times[0]?.name === "Tahun 1998", "one-line forms (Tempat: ... - ...) are read too");
assert(parsed.sections.includes("LATAR"), "the section is known to the fill step");

// the page writes them, merging with what exists
assert(editor.includes("2b) places and times") && editor.includes("wrote += 1;\n        notes.push(`${label}: ${fresh.length} ditambah") && editor.includes("setSettingKey((k) => k + 1)"), "the paste adds new places and times, keeps existing ones, and refreshes the lists");

// "Tambah Karya": every recipe asks for [LATAR]; the labelled answer is read and stored with the work
for (const key of RECIPE_KEYS) assert(composeAiPrompt({ recipe: key }).includes("[LATAR]"), `${key} asks for [LATAR]`);
const labelled = [
  "[KARYA]", "Jenis: cerpen", "Tajuk: Pelita", "Slug: pelita", "Dek: Satu dek.", "Genre: sejarah", "Penulis: tidak dinyatakan", "Anggaran bacaan: 2", "",
  "[WATAK]", "Nama: Aminah", "Peranan: Ibu Aminah.", "Penerangan: Remaja.", "",
  "[LATAR]", "Jenis: tempat", "Nama: Kampung Baru", "Keterangan: kawasan perumahan", "____", "Jenis: masa", "Nama: Mei 1969", "Keterangan: zaman berkurung", "",
  "[GLOSARI]", "Istilah: sumbu", "Maksud: tali pelita"
].join("\n");
const read1 = parseLabelledAnswer(labelled);
const settings = (read1?.raw.settings ?? {}) as { places?: unknown[]; times?: unknown[] };
assert((settings.places ?? []).length === 1 && (settings.times ?? []).length === 1, "the labelled answer's [LATAR] is read");
const plan = buildImportPlan(labelled, "Pelita menyala di Kampung Baru pada Mei 1969. Aminah memegang sumbu.", { expectedType: "cerpen" } as never) as { plan?: { places: Array<{ name: string; description?: string }>; times: Array<{ name: string; description?: string }>; characters: Array<{ role: string }> } };
assert(plan.plan?.places[0]?.name === "Kampung Baru" && plan.plan?.places[0]?.description === "Kawasan perumahan" && plan.plan?.times[0]?.name === "Mei 1969", "the import plan carries them (the note capitalised)");
assert(plan.plan?.characters[0]?.role === "Ibu Aminah", "and a role loses its final full stop");
const importService = read("src/lib/admin/import/import-service.ts");
assert(importService.includes("if (places.length > 0) metadata.places = places;") && importService.includes("if (plan.times.length > 0) metadata.times = plan.times;"), "the new draft is stored with its places and times");

// the review screen shows them and lets the editor change them
const editsPlan = buildImportPlan(labelled, "Pelita menyala di Kampung Baru pada Mei 1969. Aminah memegang sumbu.", { expectedType: "cerpen", edits: { places: [{ name: "Lorong Baru", description: "lorong sunyi." }, { name: "lorong baru" }], times: [] } } as never) as { plan?: { places: Array<{ name: string; description?: string }>; times: unknown[] } };
assert(editsPlan.plan?.places.length === 1 && editsPlan.plan?.places[0]?.description === "Lorong sunyi" && editsPlan.plan?.times.length === 0, "edits from the review screen replace places and times (capitalised, duplicates dropped)");
assert(read("src/components/admin/AuthoringForm.tsx").includes("Latar tempat ({review.places.length})") && read("src/app/api/admin/works/import/route.ts").includes("times: plan.times"), "the review screen lists Latar tempat and Latar masa");

// the writing recipes (found by testing sinopsis.tulis with ChatGPT: it answered "tidak dinyatakan" to everything)
const sinopsis = composeAiPrompt({ recipe: "sinopsis.tulis" });
assert(sinopsis.includes("PENGECUALIAN KEPADA PERATURAN 1") && sinopsis.includes("pengetahuan anda tentang karya itu") && sinopsis.includes("JANGAN menulis sinopsis rekaan"), "sinopsis.tulis may use real knowledge of a published work, and must not invent when unsure");
assert(sinopsis.includes("Dek, Genre, Anggaran bacaan dan glosari diisi daripada sinopsis yang anda tulis"), "and fills the other fields from what it wrote");
assert(composeAiPrompt({ recipe: "fragmen.tulis" }).includes("Dek, Genre dan Anggaran bacaan diisi daripada fragmen yang anda hasilkan"), "fragmen.tulis fills them from the fragment");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
