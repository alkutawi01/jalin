/**
 * "Tampal & isi" must understand the answer the way chatbots really write it, not only the exact format asked for.
 * Found by pasting realistic answers: bold or "###" headings, headings without brackets, numbered characters and
 * characters written one after another without a separator all made the editor see "no section found".
 */
import { parseWorkFill } from "../src/lib/admin/authoring/work-fill";
import { parseGlossaryPaste } from "../src/lib/admin/authoring/glossary-paste";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}

const manuscript = "Along duduk di beranda. Pak Long Rashid bercerita tentang simpulan bahasa dan kerusi malas di rumah mereka.";

const exact = `[MAKLUMAT]
Dek: Seorang anak belajar mengenali bapanya melalui kerusi di beranda.
Genre: Drama keluarga

[WATAK]
Nama: Along
Peranan: Anak sulung yang pulang ke kampung
____
Nama: Pak Long Rashid
Peranan: Bapa yang mula hilang ingatan

[GLOSARI]
Istilah: simpulan bahasa
Maksud: Ungkapan tetap yang maknanya berbeza daripada makna perkataannya.
Asing: tiada
____
Istilah: kerusi malas
Maksud: Kerusi yang boleh dibaringkan untuk berehat.
Asing: tiada`;

const heading = (style: (name: string) => string) => exact.replace(/^\[(MAKLUMAT|WATAK|GLOSARI)\]$/gm, (_m, name: string) => style(name));
const variants: Record<string, string> = {
  "exactly as asked": exact,
  "bold heading **[X]**": heading((n) => `**[${n}]**`),
  "markdown heading ### [X]": heading((n) => `### [${n}]`),
  "heading with colon [X]:": heading((n) => `[${n}]:`),
  "heading without brackets": heading((n) => n),
  "bold heading without brackets": heading((n) => `**${n}**`),
  "markdown heading ## Maklumat": heading((n) => `## ${n[0]}${n.slice(1).toLowerCase()}`),
  "bold labels with bullets": exact.replace(/^(Dek|Genre|Nama|Peranan):/gm, "- **$1:**"),
  "introduction, code fence and closing words": `Tentu! Berikut cadangan saya:\n\n\`\`\`\n${exact}\n\`\`\`\n\nSemoga membantu!`,
  "numbered characters": exact.replace("Nama: Along", "1. Nama: Along").replace("Nama: Pak Long Rashid", "2. Nama: Pak Long Rashid"),
  "Windows line ends": exact.replace(/\n/g, "\r\n"),
  "characters one after another, no separator": exact.replace("____\nNama: Pak Long Rashid", "Nama: Pak Long Rashid"),
  "characters separated by blank lines only": exact.replace("____\n", "\n"),
};

for (const [name, answer] of Object.entries(variants)) {
  const r = parseWorkFill(answer);
  assert(r.dek.startsWith("Seorang anak") && r.genre === "Drama keluarga", `${name}: dek and genre are read`);
  assert(r.characters.length === 2 && r.characters[0]!.name === "Along" && r.characters[1]!.name === "Pak Long Rashid", `${name}: both characters are read`);
  const glossary = parseGlossaryPaste(r.glossaryText, manuscript, []);
  assert(glossary.items.length === 2, `${name}: both glossary terms are read (${glossary.items.length})`);
}

// ordinary words must not be taken for headings or labels
const prose = parseWorkFill("[MAKLUMAT]\nDek: Watak yang baik ialah watak yang jujur.\nGenre: Drama\n\nSumber cerita ini ialah pengalaman penulis.");
assert(prose.dek === "Watak yang baik ialah watak yang jujur." && prose.sections.join() === "MAKLUMAT", "a sentence that merely starts with a heading word is not a heading");
assert(parseWorkFill("Saya tidak dapat membantu dengan itu.").sections.length === 0, "an answer with no sections is reported as having none");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
