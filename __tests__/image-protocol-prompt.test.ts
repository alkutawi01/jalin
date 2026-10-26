/** The image protocol prompt the editor copies for ChatGPT: one frame, no clear faces, no readable text, semi-realistic, the right scene. */
import { composeImageProtocolPrompt, textBeforeMarker } from "../src/lib/admin/visual-generation/image-protocol-prompt";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}

const body = "Paragraf satu.\n\nJannah menutup pen merah.\n\n[[gambar:1]]\n\nParagraf akhir.";
const hero = composeImageProtocolPrompt({ role: "hero", title: "Tempat Duduk Baharu", type: "bersiri", dek: "Satu blurb.", genre: "Drama remaja", body });
assert(hero.includes("gambar UTAMA") && hero.includes("Jannah menutup pen merah."), "hero prompt carries the manuscript for scene truth");
assert(/DILARANG kolaj/.test(hero) && hero.includes("SATU bingkai tunggal"), "forbids collages and grids");
assert(/WAJAH: tiada wajah manusia yang jelas/.test(hero) && /BENTUK BADAN PEREMPUAN/.test(hero), "face and women's body rules");
assert(/tiada huruf/.test(hero) && /SEMI-REALISTIK dan SINEMATIK/.test(hero), "no readable text; semi-realistic cinematic style");

const inline = composeImageProtocolPrompt({ role: "inline", title: "T", body, marker: "[[gambar:1]]" });
assert(inline.includes("Jannah menutup pen merah.") && inline.includes("selepas petikan berikut"), "inline prompt quotes the text before the marker");
assert(textBeforeMarker(body, "[[gambar:1]]").endsWith("Jannah menutup pen merah."), "text before marker is cut at the marker");
assert(textBeforeMarker(body, "[[gambar:9]]") === "", "an unknown marker gives no text");

const series = composeImageProtocolPrompt({ role: "series", title: "Sehingga Ayat Terakhir", dek: "Blurb siri.", genre: "Drama" });
assert(series.includes("HALAMAN SIRI") && series.includes("BUKAN satu adegan daripada mana-mana episod") && !series.includes("MANUSKRIP PENUH"), "series prompt is symbolic and has no manuscript");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
