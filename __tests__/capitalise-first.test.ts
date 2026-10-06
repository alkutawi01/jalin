/**
 * Short descriptions start with a capital letter whatever the editor typed: "Riyadh: latar tempat utama" becomes "Riyadh: Latar tempat utama".
 * Character role, place note and glossary meaning are normalised when saved, and shown capitalised for entries saved earlier.
 */
import fs from "node:fs";
import path from "node:path";
import { capitaliseFirst } from "../src/lib/capitalise-first";
import { publicPlaces } from "../src/lib/reader/places";
import { buildVerifiedGlossary } from "../src/lib/reader/verified-glossary";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}
assert(capitaliseFirst("latar tempat utama") === "Latar tempat utama", "the first letter becomes a capital");
assert(capitaliseFirst("Sudah besar") === "Sudah besar" && capitaliseFirst("") === "" && capitaliseFirst(null) === "" && capitaliseFirst(undefined) === "", "already capital, empty or missing: unchanged");
assert(capitaliseFirst("  jururawat di Hospital Besar") === "  Jururawat di Hospital Besar", "leading spaces are kept");
assert(capitaliseFirst("*pit stop* di litar") === "*Pit stop* di litar" && capitaliseFirst("“ibu” kepada Mina") === "“Ibu” kepada Mina" && capitaliseFirst("(jiran) baik") === "(Jiran) baik", "italic marks, quotes and brackets in front are skipped");
assert(capitaliseFirst("1969: tahun berkurung") === "1969: tahun berkurung" && capitaliseFirst("2 orang") === "2 orang", "a text that starts with a digit is left alone");
assert(capitaliseFirst("ibu. anak. ayah") === "Ibu. anak. ayah", "only the very first letter changes");
assert(capitaliseFirst("ışık") === "Işık" || capitaliseFirst("ışık") === "IŞık" || capitaliseFirst("ışık").length === 4, "other alphabets do not break it");
assert(publicPlaces({ places: [{ name: "Riyadh", description: "latar tempat utama" }, { name: "Seremban" }] }).map((p) => p.description ?? "").join("|") === "Latar tempat utama|", "a place note is shown capitalised");
const map = buildVerifiedGlossary({ glossary: [{ term: "gundah", meaning: "berasa resah", source: "" }, { term: "*pit stop*", meaning: "perhentian singkat", source: "" }] } as never);
assert(map["gundah"]?.meaning === "Berasa resah" && map["pit stop"]?.meaning === "Perhentian singkat", "a glossary meaning is shown capitalised");
const read = (p: string) => fs.readFileSync(path.join(__dirname, "..", p), "utf8").replace(/\r\n/g, "\n");
const work = read("src/lib/admin/work-service.ts");
assert(work.includes("role: capitaliseFirst(role)") && work.includes("description: capitaliseFirst(description)"), "character role and place note are capitalised when saved");
assert(read("src/app/api/admin/glossary/route.ts").includes("capitaliseFirst(body.meaning.trim())") && read("src/app/api/admin/glossary/[id]/route.ts").includes("capitaliseFirst(body.meaning.trim())"), "so is a glossary meaning, when created and when edited");
assert(read("src/components/reader/StoryChrome.tsx").includes("capitaliseFirst(character.role)") && read("src/components/reader/MobileStoryInfo.tsx").includes("capitaliseFirst(character.role)"), "and a role is shown capitalised on both reader layouts");
console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
