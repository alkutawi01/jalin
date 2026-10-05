/** Footnotes: "[^1]" in the text, "[^1]: note" below; numbered by first reference; nothing invented, nothing lost. */
import { extractFootnotes, markFootnoteReferences, splitFootnoteTokens } from "../src/lib/reader/footnotes";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string, detail?: unknown) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`, detail === undefined ? "" : JSON.stringify(detail)); }
}

// basic
{
  const r = extractFootnotes("Dia memandang jauh.[^1] Hujan turun.\n\n[^1]: Satu nota oleh editor.");
  assert(r.body === "Dia memandang jauh.[^1] Hujan turun.", "the note definition is taken out of the text", r.body);
  assert(r.notes.length === 1 && r.notes[0]!.number === 1 && r.notes[0]!.text === "Satu nota oleh editor.", "one note, numbered 1", r.notes);
  assert(r.numbers["1"] === 1 && r.missingNotes.length === 0 && r.unusedNotes.length === 0, "nothing missing or unused");
}

// numbering follows the first reference, not the label
{
  const r = extractFootnotes("A[^b] dan B[^a] dan C[^b].\n\n[^a]: Nota A.\n[^b]: Nota B.");
  assert(r.numbers.b === 1 && r.numbers.a === 2, "the first reference gets number 1 whatever its label", r.numbers);
  assert(r.notes.map((n) => n.text).join("|") === "Nota B.|Nota A.", "notes are listed in reference order", r.notes);
}

// definitions anywhere, several, in any order; continuation lines and paragraphs
{
  const r = extractFootnotes("Satu[^x].\n\n[^y]: Nota Y.\n\nDua[^y].\n\n[^x]: Nota X yang\n  bersambung di baris kedua\n  dan ketiga.\n\n  Perenggan kedua nota.\n\nTeks selepas nota.");
  assert(r.notes.length === 2 && r.notes[0]!.label === "x" && r.notes[1]!.label === "y", "definitions can be anywhere and in any order", r.notes);
  assert(r.notes[0]!.text === "Nota X yang\nbersambung di baris kedua\ndan ketiga.\n\nPerenggan kedua nota.", "indented lines continue the note (a second paragraph too)", r.notes[0]);
  assert(r.body.includes("Teks selepas nota.") && !r.body.includes("Nota X"), "text after a note is kept, the note is not", r.body);
}

// references without a note, notes without a reference
{
  const r = extractFootnotes("Ada[^1] dan tiada[^9].\n\n[^1]: Nota.\n[^lain]: Tiada rujukan.");
  assert(r.missingNotes.join() === "9", "a reference with no note is reported", r.missingNotes);
  assert(r.unusedNotes.join() === "lain", "a note nothing refers to is reported and not shown", r.unusedNotes);
  assert(r.notes.length === 1, "only the used note is listed");
  const marked = markFootnoteReferences(r.body, r.numbers);
  assert(marked.includes("[^9]") && !marked.includes("[^1]"), "a reference with no note stays exactly as typed", marked);
}

// the same note referred to twice
{
  const r = extractFootnotes("Mula[^1] dan lagi[^1].\n\n[^1]: Nota.");
  const marked = markFootnoteReferences(r.body, r.numbers);
  const parts = splitFootnoteTokens(marked).filter((p): p is { footnote: string; first: boolean } => "footnote" in p);
  assert(parts.length === 2 && parts[0]!.first === true && parts[1]!.first === false, "only the first reference is a target to come back to", parts);
}

// not inside code
{
  const r = extractFootnotes("Biasa[^1].\n\n```\n[^1]: bukan nota\nkod[^2]\n```\n\n`[^3]` dalam kod.\n\n[^1]: Nota sebenar.");
  assert(r.notes.length === 1 && r.notes[0]!.text === "Nota sebenar.", "a note-looking line inside a code block is not a note", r.notes);
  assert(r.missingNotes.length === 0, "references inside code are not references", r.missingNotes);
  assert(r.body.includes("[^1]: bukan nota") && r.body.includes("kod[^2]"), "code is left exactly as written", r.body);
}

// look-alikes that must not be taken
{
  const r = extractFootnotes("Tanda [^] kosong, [^ spasi], [^1]: bukan di awal baris.\n\n[^ a]: tidak sah\n\nNota[^1].");
  assert(r.notes.length === 0 && r.missingNotes.join() === "1", "malformed references and an inline '[^1]:' are not notes", r);
  const none = extractFootnotes("Tiada nota kaki di sini sama sekali.");
  assert(none.body === "Tiada nota kaki di sini sama sekali." && none.notes.length === 0, "a story without footnotes is unchanged");
}

// Windows line ends, long labels, emphasis in a note
{
  const r = extractFootnotes("Satu[^catatan-1].\r\n\r\n[^catatan-1]: Nota dengan *condong* dan **tebal**.\r\n");
  assert(r.notes[0]?.text === "Nota dengan *condong* dan **tebal**." && !r.body.includes("\r"), "CRLF and Markdown inside a note are fine", r);
}

// scene break and other Markdown around notes are untouched
{
  const text = "Pagi.[^1]\n\n---\n\nPetang.\n\n[^1]: Nota.";
  assert(extractFootnotes(text).body === "Pagi.[^1]\n\n---\n\nPetang.", "a scene break between paragraphs is kept", extractFootnotes(text).body);
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
