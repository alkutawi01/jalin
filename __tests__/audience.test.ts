/**
 * Izzat: "khalayak ... angka tu merujuk kpd apa? takde tulis pun ... dan kalau tulis remaja, belia, dewasa, mcm mana pulak? ... apabila ada
 * 1000 karya, kita perlukan ni utk filter", and "semua ni boleh ditetapkan di tetapan". Audience is now a short fixed list of bands (name and
 * age range, set in Tetapan), ticked on a work or a series; the work stores the band codes in the existing column, and every older value
 * ("13-17", "Remaja", "21-50") reads as the bands it covers, so nothing in the database needs converting.
 */
import fs from "node:fs";
import path from "node:path";
import { DEFAULT_AUDIENCE_BANDS as B, audienceAgeRange, audienceCodes, audienceLabels, audienceValue, normalizeAudience, validateBands } from "../src/lib/audience";
import { audienceOf } from "../src/lib/seo-jsonld";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string, detail?: unknown) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`, detail === undefined ? "" : JSON.stringify(detail)); }
}
const read = (p: string) => fs.readFileSync(path.join(__dirname, "..", p), "utf8").replace(/\r\n/g, "\n");
const codes = (raw: string | null) => audienceCodes(raw, B).join();

// the values really in the database on 5 Okt 2026
assert(codes("13-17") === "remaja", "'13-17' is Remaja");
assert(codes("18-50") === "belia,dewasa", "'18-50' is Belia and Dewasa");
assert(codes("21-50") === "belia,dewasa", "'21-50' is Belia and Dewasa");
assert(codes("Remaja") === "remaja" && codes("remaja") === "remaja", "'Remaja' and 'remaja' are one band");
assert(codes(null) === "" && codes("") === "" && codes("tidak jelas") === "", "empty or unrecognisable means no band");
assert(codes("belia, Dewasa") === "belia,dewasa" && codes("dewasa;belia") === "belia,dewasa", "codes and labels, any order, come out in band order");
assert(codes("12-13") === "kanak-kanak,remaja", "a range touching two bands is both");
assert(codes("5-6") === "" && codes("60-70") === "dewasa", "a range below every band is none; above is the open band");

assert(audienceValue(["dewasa", "remaja", "x"], B) === "remaja,dewasa", "the stored value has known codes only, in band order");
assert(normalizeAudience("13-17") === "remaja" && normalizeAudience("") === "remaja" && normalizeAudience("21-50") === "belia,dewasa", "a chatbot's answer becomes a stored value; nothing recognisable is Remaja");
assert(audienceLabels("belia,dewasa", B) === "Belia · Dewasa", "labels for display");

assert(JSON.stringify(audienceAgeRange("remaja", B)) === JSON.stringify({ min: 13, max: 17 }), "search engines get the ages: Remaja is 13 to 17");
assert(JSON.stringify(audienceAgeRange("belia,dewasa", B)) === JSON.stringify({ min: 18, max: 99 }), "...and an open band reaches 99");
assert(audienceAgeRange("", B) === null, "no band, no ages");
assert(JSON.stringify(audienceOf("13-17")) === JSON.stringify({ audience: { "@type": "PeopleAudience", suggestedMinAge: 13 } }) && JSON.stringify(audienceOf("remaja")).includes('"suggestedMinAge":13') && Object.keys(audienceOf("kata sahaja")).length === 0 && Object.keys(audienceOf(undefined)).length === 0, "the structured data reads codes, labels and old ranges");

// only the age a work is suitable FROM is published: no upper age, so nothing says "not for adults" or "up to 99"
assert(JSON.stringify(audienceOf("dewasa")) === JSON.stringify({ audience: { "@type": "PeopleAudience", suggestedMinAge: 30 } }) && JSON.stringify(audienceOf("belia,dewasa")).includes('"suggestedMinAge":18') && JSON.stringify(audienceOf("remaja")) === JSON.stringify({ audience: { "@type": "PeopleAudience", suggestedMinAge: 13 } }), "a band gives the age it starts at");
assert(["remaja", "13-17", "belia", "dewasa", "kanak-kanak,remaja", "Remaja 13-17 tahun"].every((v) => !JSON.stringify(audienceOf(v)).includes("suggestedMaxAge")), "no upper age is ever published");

// the bands an editor types
const ok = validateBands([{ code: "remaja", label: " Remaja ", min: "13", max: 17 }, { label: "Orang tua", min: 60, max: "" }]);
assert(ok.length === 2 && ok[0]!.label === "Remaja" && ok[0]!.min === 13 && ok[1]!.code === "orang-tua" && ok[1]!.max === null, "bands are cleaned; a new one gets a code from its name; empty 'hingga' is open", ok);
const bad = (input: unknown) => { try { validateBands(input); return ""; } catch (e) { return (e as Error).message; } };
assert(bad([]).startsWith("Sekurang") && bad(Array.from({ length: 9 }, (_, i) => ({ label: `P${i}`, min: i }))).startsWith("Paling"), "one to eight bands");
assert(bad([{ label: "", min: 1 }]).includes("nama diperlukan") && bad([{ label: "A", min: "x" }]).includes("umur paling muda") && bad([{ label: "A", min: 20, max: 10 }]).includes("umur paling tua") && bad([{ label: "A".repeat(31), min: 1 }]).includes("terlalu panjang"), "each mistake has its own Malay message");
assert(validateBands([{ label: "A", min: 1 }, { label: "A", min: 2 }]).map((b) => b.code).join() === "a,a-2", "two bands never share a code");

// wiring
assert(read("src/app/admin/works/[id]/page.tsx").includes("<AudiencePicker value={form.audience}") && read("src/app/admin/series/[id]/page.tsx").includes("<AudiencePicker value={form.audience}") && read("src/app/admin/series/new/page.tsx").includes("<AudiencePicker value={form.audience}"), "the work and both series forms use the tick list, not a text box");
const settings = read("src/app/admin/settings/page.tsx");
assert(settings.includes('tab === "audiens" ? <AudienceBandsSettings /> : null') && read("src/lib/admin/settings-tabs.ts").includes('{ id: "audiens", label: "Audiens" }'), "Tetapan has an Audiens tab");
const api = read("src/app/api/admin/audience-bands/route.ts");
assert((api.match(/getCurrentAdmin\(\)/g) ?? []).length === 2 && api.includes("status: 401"), "both audience endpoints need a login");
assert(read("src/app/api/admin/works/start-draft/route.ts").includes("audience: defaults.audience, dek: null") && read("src/lib/admin/series-inheritance.ts").includes("inheritance?.audience ?? DEFAULT_AUDIENCE") && read("src/lib/admin/import/plan.ts").includes("normalizeAudience(present(options.seriesDefaults?.audience) ?? data.audience)"), "a new draft and an import start with a band code, not '13-17'");

// An empty "Dari" box: the form sends NaN, JSON writes null, and the band was saved as "from age 0" without a word.
const refused = (bands: unknown) => { try { validateBands(bands); return ""; } catch (error) { return (error as Error).message; } };
const emptyFrom = JSON.parse(JSON.stringify([{ code: "", label: "Warga emas", min: NaN, max: null }]));
assert(emptyFrom[0].min === null && refused(emptyFrom).includes("umur paling muda mesti nombor 0 hingga 99"), "an empty youngest age is refused, not saved as 0", refused(emptyFrom));
assert(refused([{ label: "X", min: "" }]) !== "" && refused([{ label: "X" }]) !== "" && refused([{ label: "X", min: true }]) !== "" && refused([{ label: "X", min: [5] }]) !== "" && refused([{ label: "X", min: "5 tahun" }]) !== "", "nor is anything else that is not a number");
assert(refused([{ label: "X", min: 5, max: true }]) !== "" && refused([{ label: "X", min: 5, max: "tua" }]) !== "", "an oldest age that is not a number is refused");
assert(JSON.stringify(validateBands([{ label: "X", min: "5", max: " 9 " }, { label: "Y", min: 0, max: "" }, { label: "Z", min: 10, max: "  " }])) === JSON.stringify([{ code: "x", label: "X", min: 5, max: 9 }, { code: "y", label: "Y", min: 0, max: null }, { code: "z", label: "Z", min: 10, max: null }]), "numbers typed as text, age 0 itself, and an empty oldest age (and above) are kept");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
