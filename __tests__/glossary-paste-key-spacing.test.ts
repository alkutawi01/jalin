/** Glossary paste: "Sebutan", "Bahasa asal" and "Ejaan asal" lines read like the other keys (space before the colon, bullets). */
import { parseGlossaryPaste } from "../src/lib/admin/authoring/glossary-paste";

let passed = 0, failed = 0;
function assert(c: boolean, m: string) { if (c) { passed++; console.log(`  ✓ ${m}`); } else { failed++; console.error(`  ✗ ${m}`); } }

const body = "Dia menyebut mudif dengan perlahan, lalu memandang tetamu itu.";
const spaced = `[GLOSARI]
Istilah: mudif
Maksud: Tetamu yang dijamu.
Asing: mudif
Sebutan : mu-dif
Bahasa asal : Arab
Ejaan asal : مضيف`;
const a = parseGlossaryPaste(spaced, body, []);
const item = a.items[0];
assert(a.items.length === 1 && item.term.split("*").join("") === "mudif", "one term is read");
assert(item.pronunciation === "mu-dif", "Sebutan with a space before the colon is read");
assert(item.originalLanguage === "Arab", "Bahasa asal with a space before the colon is read");
assert(item.original === "مضيف", "Ejaan asal with a space before the colon is read");

const bullets = `[GLOSARI]
- Istilah: mudif
- Maksud: Tetamu yang dijamu.
- Asing: mudif
- Sebutan: mu-dif
- Bahasa asal: Arab
- Ejaan asal: مضيف`;
const b = parseGlossaryPaste(bullets, body, []).items[0];
assert(b && b.pronunciation === "mu-dif" && b.originalLanguage === "Arab", "bulleted keys still read");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
