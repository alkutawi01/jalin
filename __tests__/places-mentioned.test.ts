/** Inherited places are trimmed to the ones the episode's text mentions; an apostrophe in a glossary term survives pasting. */
import { placesMentionedIn } from "../src/lib/admin/places-mentioned";
import { parseGlossaryPaste } from "../src/lib/admin/authoring/glossary-paste";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string, detail?: unknown) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`, detail ?? ""); }
}

const places = [{ name: "Rumah Jannah" }, { name: "Bilik tasmi'" }, { name: "SMU (A) al-Huda" }, { name: "Maahad" }, { name: "Serambi" }];
const body = "Jannah menunggu di serambi. Selepas tasmi', mereka pulang ke sekolah al-Huda.";
const kept = placesMentionedIn(places, body).map((p) => p.name);
assert(kept.includes("Rumah Jannah") && kept.includes("Bilik tasmi'") && kept.includes("SMU (A) al-Huda") && kept.includes("Serambi"), "places whose words appear in the text are kept", kept);
assert(!kept.includes("Maahad"), "a place the text never mentions is dropped", kept);
assert(placesMentionedIn(places, "   ").length === places.length, "an empty text keeps every place (nothing to judge by)");

const pasted = parseGlossaryPaste(
  "Istilah: tasmi'\nMaksud: Memperdengarkan bacaan kepada guru.\nAsing: tasmi'\n____\nIstilah: 'ain\nMaksud: Huruf Arab.\n",
  "Selepas tasmi' dia pergi. 'ain itu huruf.",
  []
);
const terms = pasted.items.map((i) => i.term);
assert(terms.includes("*tasmi'*"), "the closing apostrophe of tasmi' is kept (and the word italicised)", terms);
assert(terms.includes("ain"), "a term wrapped in quote marks loses them", terms);

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
