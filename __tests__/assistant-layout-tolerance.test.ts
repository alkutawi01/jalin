import assert from "node:assert/strict";
import { parseWorkFill } from "../src/lib/admin/authoring/work-fill";
import { parseGlossaryPaste } from "../src/lib/admin/authoring/glossary-paste";
import { parseLabelledAnswer } from "../src/lib/admin/authoring/labelled-output";

const answer = `[MAKLUMAT]\nDek: Aina menemui kunci lama.\nGenre: Misteri\n[WATAK]\nNama: Aina\nPeranan: Pemilik kunci\n\nNama: Ali\nPeranan: Jiran Aina\n[LATAR]\nJenis: tempat\nNama: Seremban\nKeterangan: Bandar tempat tinggal\n[GLOSARI]\nIstilah: gundah\nMaksud: Berasa resah dan bimbang.\n[SUMBER]\nTajuk asal: Sumber asal`;
const variants = [
  (s: string) => s.replace(/: /g, ":\n\n"),
  (s: string) => s.replace(/: /g, "\n\n"),
  (s: string) => s.replace(/: /g, " = "),
  (s: string) => s.replace(/: /g, " — "),
  (s: string) => s.replace(/^(\w[^:\n]*): (.*)$/gm, "| $1 | $2 |"),
  (s: string) => s.replace(/ /g, "\u00a0").replace(/\n/g, "\r"),
  (s: string) => s.replace(/\n(?=Nama:|Peranan:|Keterangan:)/g, "\n\n\n"),
];
for (const [i, transform] of variants.entries()) {
  const changed = transform(answer);
  const result = parseWorkFill(changed);
  assert.equal(result.dek, "Aina menemui kunci lama.", `dek ${i}`);
  assert.equal(result.characters.length, 2, `characters ${i}`);
  assert.equal(result.characters[1]?.role, "Jiran Aina", `role ${i}`);
  assert.equal(result.places[0]?.name, "Seremban", `place ${i}`);
  assert.equal(parseGlossaryPaste(changed, "Aina gundah di rumah.", []).items[0]?.meaning, "Berasa resah dan bimbang.", `glossary ${i}`);
  const scoped = parseWorkFill(changed, "characters");
  assert.equal(scoped.dek, "");
  assert.equal(scoped.source, null);
  assert.deepEqual(scoped.sections, ["WATAK", "LATAR"]);
}
const prose = "Nama:\n\nAina berkata, *jangan ubah aku*.\n\n[MESEJ]\nAli: Sampai nanti.";
const created = parseLabelledAnswer(`[KARYA] Tajuk: Ujian\nJenis\ncerpen\nSlug = ujian\n[KANDUNGAN]\n${prose}\n[GLOSARI]\nIstilah\n\ngundah\nMaksud\nresah`);
assert.equal(created?.raw.title, "Ujian");
assert.equal(created?.raw.content, prose);
assert.equal((created?.raw.glossary as { term: string }[])[0]?.term, "gundah");
assert.equal(parseWorkFill("Berikut cadangan tanpa label yang boleh dikenal pasti.").sections.length, 0);
const json = JSON.stringify({ metadata: { dek: "Dek JSON", genre: "Misteri" }, characters: [{ name: "Aina", role: "Jiran" }], glossary: [{ term: "gundah", meaning: "Resah" }], source: { title: "Jangan isi" } });
assert.equal(parseWorkFill(json, "metadata").dek, "Dek JSON");
assert.equal(parseWorkFill(json, "metadata").characters.length, 0);
assert.equal(parseWorkFill(json, "characters").characters[0]?.name, "Aina");
assert.equal(parseGlossaryPaste(json, "Aina gundah di rumah.", []).items[0]?.term, "gundah");
assert.equal(parseWorkFill("[KARYA]\nDek: Dek lama\nGenre: Misteri", "metadata").dek, "Dek lama");
assert.equal(parseWorkFill("[WATAK]\n| Nama | Peranan |\n| --- | --- |\n| Aina | Jiran Ali |\n| Ali | Jiran Aina |", "characters").characters.length, 2);
assert.equal(parseGlossaryPaste("[GLOSARI]\n| Istilah | Maksud |\n| --- | --- |\n| gundah | Berasa resah |", "Aina gundah di rumah.", []).items[0]?.meaning, "Berasa resah");
console.log("Layout tolerance: seven malformed layouts, all scoped destinations and exact manuscript preservation passed");
