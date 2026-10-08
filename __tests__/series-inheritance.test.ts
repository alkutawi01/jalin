/**
 * Izzat: "saya terpaksa masukkan kredit utk setiap episod bersiri sedangkan episod tu masih dlm siri yg sama? sepatutnya boleh auto
 * ambil drpd episod sebelum ni", and "bukan kredit sahaja ... mcm genre. takkan dua episod berlainan genre padahal judul yg sama?"
 * Real data showed it: the series "Satu Daerah yang Paling Sunyi" is Rumah Tangga / 21-50, its episode 1 has five credits, and the
 * new draft episode 2 had no genre, audience 13-17 (hard-coded by start-draft) and a single credit.
 * A new episode now starts with the series' genre and audience, the credits of the episode before it, and (for a continuing series)
 * its characters and places. A draft that already exists can be filled the same way from the series page, only where it is empty.
 * The decisions are pure functions (tested here); the database parts were checked on a temporary Neon branch.
 */
import fs from "node:fs";
import path from "node:path";
import {
  creditKey,
  dedupeCredits,
  describeFilled,
  draftDefaults,
  inheritFromSeries,
  mergeByName,
  mergeImportCredits,
  pickReference,
  type EpisodeFacts,
  type InheritedCredit
} from "../src/lib/admin/series-inheritance";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string, detail?: unknown) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`, detail === undefined ? "" : JSON.stringify(detail)); }
}
const read = (p: string) => fs.readFileSync(path.join(__dirname, "..", p), "utf8").replace(/\r\n/g, "\n");

const credit = (slug: string | null, role: string, byline = false, guest: string | null = null): InheritedCredit => ({ contributorSlug: slug, guestName: guest, roleLabel: role, byline, isPublic: true });
const episode = (position: number, over: Partial<EpisodeFacts> = {}): EpisodeFacts => ({
  workId: `W${position}`, title: `Episod ${position}`, position, status: "published", genre: null, audience: null, metadata: null, credits: [], ...over
});

// ── the real series ──
const ep1 = episode(1, {
  title: "Garing, Bukan Hangit",
  genre: "Rumah tangga",
  audience: "18-50",
  credits: [credit("izzat-anas", "Pengarah"), credit("mimo", "co_writer", true), credit("claude", "co_writer"), credit("claude", "co_writer"), credit("chatgpt", "co_writer", true)]
});
const ep2Draft = episode(2, { status: "draft", credits: [credit("izzat-anas", "Idea asal")] });
const series = { id: "SER-1", mode: "continuous", genre: "Rumah Tangga", audience: "21-50" };

const forEp3 = inheritFromSeries(series, [ep1, ep2Draft]);
assert(forEp3.from?.position === 1, "a started draft with only 'Idea asal' is not the model: the episode with a byline is", forEp3.from);
assert(forEp3.credits.length === 4, "the duplicate 'claude / co_writer' becomes one credit: 4 credits, not 5", forEp3.credits.length);
assert(forEp3.credits.map((c) => `${c.contributorSlug}/${c.roleLabel}`).join() === "izzat-anas/Pengarah,mimo/initial_draft,claude/initial_draft,chatgpt/initial_draft", "the order of the credits is kept");
assert(forEp3.genre === "Rumah tangga" && forEp3.audience === "18-50", "genre and audience follow the episodes already published (18-50), not the series row (21-50) and not the 13-17 default", forEp3);
const untouched = episode(2, { status: "draft", genre: null, audience: "13-17" });
const afterUntouched = inheritFromSeries(series, [ep1, untouched]);
assert(afterUntouched.audience === "18-50", "an untouched draft's automatic 13-17 is not taken as a choice", afterUntouched);
const onlyUntouched = inheritFromSeries(series, [untouched]);
assert(onlyUntouched.genre === "Rumah Tangga" && onlyUntouched.audience === "21-50", "no episode with a genre yet: the series' own genre and audience", onlyUntouched);
const newestWins = inheritFromSeries(series, [ep1, episode(2, { genre: "Drama keluarga", audience: "21-50" })]);
assert(newestWins.genre === "Drama keluarga" && newestWins.audience === "21-50", "the latest episode with a genre wins, as a pair", newestWins);

// ── credits ──
assert(dedupeCredits([credit("a", "x"), credit("a", "x"), credit("a", "y"), credit("b", "x")]).length === 3, "same person and role once; another role, or another person, stays");
assert(creditKey(credit(null, "Penulis", false, "Nara Zahin")) === creditKey(credit(null, "penulis", false, "  nara   zahin ")), "a guest credit is compared ignoring case and spacing");
assert(creditKey(credit("nara", "Penulis")) !== creditKey(credit(null, "Penulis", false, "nara")), "a contributor and a guest of the same name are not the same credit");

// ── which episode to copy from ──
assert(pickReference([])?.workId === undefined, "no earlier episode: nothing to copy from");
assert(pickReference([episode(1, { credits: [credit("a", "x", true)] }), episode(2, { credits: [credit("b", "y")] })])?.position === 1, "the latest episode WITH a byline wins over a later one without");
assert(pickReference([episode(1, { credits: [credit("a", "x")] }), episode(2, { credits: [credit("b", "y")] })])?.position === 2, "no byline anywhere: the latest with any credit");
assert(pickReference([episode(1), episode(2)])?.position === 2, "no credits anywhere: the latest episode (for genre, characters)");
assert(pickReference([episode(1, { credits: [credit("a", "x", true)] }), episode(2, { status: "archived", credits: [credit("b", "y", true)] })])?.position === 1, "an archived episode is never the model");

// ── genre and audience ──
assert(inheritFromSeries({ ...series, genre: null, audience: null }, [ep1, ep2Draft]).genre === "Rumah tangga", "a series without a genre takes the latest episode's");
assert(inheritFromSeries({ ...series, genre: "  ", audience: null }, [episode(1, { genre: "Drama", audience: "13-17" }), episode(2, { genre: null })]).genre === "Drama", "...skipping an episode that has none");
assert(inheritFromSeries({ ...series, audience: null }, [episode(1, { genre: "Drama", audience: null })]).audience === null, "an episode with a genre but no audience adds none (the default applies)");
assert(inheritFromSeries({ ...series, genre: null, audience: null }, []).genre === null, "nothing anywhere: no genre (the editor chooses)");
const first = inheritFromSeries(series, []);
assert(first.from === null && first.credits.length === 0 && first.genre === "Rumah Tangga" && first.audience === "21-50", "the first episode of a series: only the series' own genre and audience", first);

// ── characters and places ──
const withCast = episode(1, {
  credits: [credit("a", "x", true)],
  metadata: {
    characters: [{ name: "Jannah", role: "Pelajar", firstAppearanceSection: "bab-3" }, { name: "jannah", role: "Pendua" }, { name: "Tanpa peranan" }, { role: "Tanpa nama" }, "bukan objek"],
    places: [{ name: "Musalla", description: "Surau kecil" }, { name: "MUSALLA" }, { name: "Dapur" }, { name: "x".repeat(81) }]
  }
});
const cast = inheritFromSeries(series, [withCast]);
assert(cast.characters.length === 1 && cast.characters[0]!.name === "Jannah" && cast.characters[0]!.firstAppearanceSection === null, "characters: valid ones only, once each, and the chapter reference is cleared", cast.characters);
assert(cast.places.map((p) => p.name).join() === "Musalla,Dapur" && cast.places[0]!.description === "Surau kecil", "places: valid, once each (ignoring case), too-long names dropped", cast.places);
const anthology = inheritFromSeries({ ...series, mode: "anthology" }, [withCast]);
assert(anthology.characters.length === 0 && anthology.places.length === 0 && anthology.credits.length === 1, "an anthology shares credits and genre, but its stories do not share characters or places");

// ── what a brand-new draft is inserted with ──
const plain = draftDefaults(null);
assert(plain.genre === null && plain.audience === "remaja" && plain.metadata === null, "outside a series the draft is as before: no genre, the default band, no metadata", plain);
const given = draftDefaults(cast);
assert(given.genre === "Rumah Tangga" && given.audience === "21-50" && Array.isArray(given.metadata?.characters) && Array.isArray(given.metadata?.places), "inside a series: the series' genre and audience, and the cast and places", given);
assert(draftDefaults(forEp3).metadata === null, "no characters or places to carry: no metadata at all");

// ── the chatbot import ──
assert(mergeByName([{ name: "Jannah", role: "dari chatbot" }], [{ name: "JANNAH", role: "lama" }, { name: "Izhar", role: "baru" }]).map((c) => c.role).join() === "dari chatbot,baru", "import: the chatbot's own entry wins, the others are added");
const names = new Map([["claude", "Nara Zahin"], ["izzat-anas", "Izzat Anas"]]);
const own = [{ guestName: "nara zahin", roleLabel: "initial_draft", byline: true, isPublic: true }, { guestName: "Penulis Tetamu", roleLabel: "initial_draft", byline: true, isPublic: true }];
const merged = mergeImportCredits(own, [credit("claude", "co_writer", true), credit("izzat-anas", "Pengarah")], names);
assert(merged.map((c) => c.contributorSlug ?? c.guestName).join() === "claude,izzat-anas,Penulis Tetamu", "import: a writer who is already an inherited contributor is not credited twice; a new one is kept", merged);
assert(mergeImportCredits(own, [], names).every((c) => c.contributorSlug === null) && mergeImportCredits(own, [], names).length === 2, "import: with nothing to inherit the chatbot's credits are kept as they were");

assert(describeFilled({ genre: true, audience: true, credits: 4, characters: 0, places: 2 }, { position: 1 }) === "Diisi: genre, audiens, 4 kredit, 2 latar tempat daripada Episod 1. Semak kredit: buang sesiapa yang tidak menulis episod ini.", "the message names what was filled");
assert(describeFilled({ genre: false, audience: false, credits: 0, characters: 0, places: 0 }, { position: 1 }).startsWith("Tiada yang perlu ditambah"), "...and says so when nothing was missing");

// ── wiring (source level) ──
const start = read("src/app/api/admin/works/start-draft/route.ts");
assert(start.includes("loadSeriesInheritance(tx, seriesId)") && start.includes("draftDefaults(inheritance)") && start.includes("insertInheritedCredits(tx, id, inheritance.credits"), "start-draft inherits inside its transaction");
assert(start.includes("genre: defaults.genre") && start.includes("audience: defaults.audience") && !/status: "draft", body: "", genre: null/.test(start), "the new episode's genre and audience come from the defaults, not from a fixed null and 13-17");
const importService = read("src/lib/admin/import/import-service.ts");
assert(importService.includes("loadSeriesInheritance(trx, plan.series.seriesId)") && importService.includes("mergeImportCredits(") && importService.includes("mergeByName(plan.characters"), "the chatbot import inherits for 'sambung'");
const plan = read("src/lib/admin/import/plan.ts");
assert(plan.includes("present(overrides.genre) ?? present(options.seriesDefaults?.genre) ?? data.genre") && plan.includes("present(options.seriesDefaults?.audience) ?? data.audience"), "genre: the editor's own > the series' > the chatbot's; audience: the series' > the chatbot's");
const route = read("src/app/api/admin/works/import/route.ts");
assert(route.includes("options.seriesDefaults = {") && route.includes("inherited: inheritedSummary(inheritance)"), "the import route passes the series' defaults and reports what will be inherited");
const inheritRoute = read("src/app/api/admin/series/[id]/entries/[workId]/inherit/route.ts");
assert(inheritRoute.includes("getCurrentAdmin()") && inheritRoute.includes("status: 401") && inheritRoute.includes("fillEpisodeFromSeries(trx, id, workId)"), "the fill endpoint needs a login and fills in one transaction");
const lib = read("src/lib/admin/series-inheritance.ts");
assert(lib.includes('work.status === "published" || work.status === "archived"') && lib.includes(".forUpdate()"), "a published or archived episode is refused, and the row is locked while filling");
assert(lib.includes("if (!entry) throw") && lib.includes('.where("series_id", "=", seriesId).where("work_id", "=", workId)'), "the episode must belong to the series named in the URL");
const page = read("src/app/admin/series/[id]/page.tsx");
assert(page.includes("entry.position > 1") && page.includes('!["published", "archived"].includes(work.status)') && page.includes("handleInherit(entry.work_id)"), "the series page offers the button on later, unpublished episodes only");
assert(read("src/app/admin/works/add/page.tsx").includes("data.inherited?.from"), "after creating an episode the editor is told what it received");

// ── 8 Okt: uniform by default, the editor decides ──
assert(plan.includes("!options.seriesDefaults?.hasByline") && route.includes("hasByline: inheritance.credits.some((c) => c.byline)"), "the import does not warn that a writer is missing when the series already gives a name under the title");
assert(lib.includes("const ownCredits = existing.some((c) => c.byline)") && lib.includes("ownCredits ? [] :"), "filling never adds the series credits to an episode that already has its own name under the title");
assert(page.includes("await confirmAction(\"Isi episod ini daripada siri?"), "the editor is asked before an existing episode is filled");
const addPage = read("src/app/admin/works/add/page.tsx");
assert(addPage.includes("const copied =") && addPage.includes("\"credits\" : \"content\"") && addPage.includes("startsWith(\"Tiada yang perlu\")"), "the editor lands on the credits tab only when credits were copied, and is told only when something was filled");
assert(read("src/components/admin/AuthoringForm.tsx").includes("genre dan audiens mengikut siri") && !lib.includes("khalayak"), "the copy says audiens, not khalayak");


console.log(`
${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
