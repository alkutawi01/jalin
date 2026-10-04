/** Copying italic and bold text from Word, Google Docs or a web page keeps the emphasis. */
import { pastedHtmlToMarkdown } from "../src/lib/admin/paste-format";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string, detail?: unknown) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`, detail ?? ""); }
}
const md = (html: string) => pastedHtmlToMarkdown(html).markdown;

// Word (desktop): fragment markers, mso styles, o:p tags, italic through <i> and through a style
const word = `<html xmlns:o="urn:schemas-microsoft-com:office:office"><head><style>p.MsoNormal{margin:0}</style></head><body lang=EN-US>
<!--StartFragment--><p class=MsoNormal>Dia membaca <i>Surat yang Tidak Pernah Selesai</i> sekali lagi.<o:p></o:p></p>
<p class=MsoNormal>Katanya, <span style='font-style:italic;mso-bidi-font-style:normal'>"Aku tahu."</span> Lalu <b>diam</b>.<o:p></o:p></p><!--EndFragment--></body></html>`;
const w = pastedHtmlToMarkdown(word);
assert(w.markdown === 'Dia membaca *Surat yang Tidak Pernah Selesai* sekali lagi.\n\nKatanya, *"Aku tahu."* Lalu **diam**.', "Word: italics, a styled italic span and bold are kept; paragraphs are separated", w.markdown);
assert(w.formatted === true, "Word: the paste is reported as formatted");

// Word's mso-bidi-font-style is not the italic property
assert(md("<p>biasa <span style='mso-bidi-font-style:italic'>teks</span></p>") === "biasa teks", "mso-bidi-font-style is not mistaken for italic");

// Google Docs wraps everything in a <b> that says font-weight:normal
const docs = `<meta charset='utf-8'><b style="font-weight:normal;" id="docs-internal-guid-1"><p dir="ltr"><span style="font-style:italic;font-weight:400;">Rahmah</span><span style="font-weight:400;"> berkata tidak.</span></p></b>`;
assert(md(docs) === "*Rahmah* berkata tidak.", "Google Docs: a normal-weight wrapper does not turn everything bold", md(docs));

// Spaces stay outside the marks; adjacent runs merge
assert(md("<p>satu <i>dua </i><i>tiga </i>empat</p>") === "satu *dua tiga* empat", "spaces sit outside the marks and neighbouring runs merge", md("<p>satu <i>dua </i><i>tiga </i>empat</p>"));
assert(md("<p><em> lembut </em></p>") === "*lembut*", "leading and trailing spaces are not inside the marks");

// Nested resets, bold + italic, line breaks, entities, nbsp
assert(md("<p><i>sebelum <span style='font-style:normal'>tegak</span> selepas</i></p>") === "*sebelum* tegak *selepas*", "a normal-style span inside italic text is upright again", md("<p><i>sebelum <span style='font-style:normal'>tegak</span> selepas</i></p>"));
assert(md("<p><b><i>kedua-duanya</i></b></p>") === "*kedua-duanya*", "a run that is both is kept as italic");
assert(md("<p>baris satu<br>baris dua</p>") === "baris satu\nbaris dua", "a line break stays inside its paragraph");
assert(md("<p>A&nbsp;&amp;&nbsp;B &mdash; &#8220;ya&#8221;</p>") === "A & B — “ya”", "entities and non-breaking spaces are decoded");

// Plain content: nothing to preserve
const plain = pastedHtmlToMarkdown("<p>Hanya teks biasa.</p><p>Perenggan kedua.</p>");
assert(plain.formatted === false && plain.markdown === "Hanya teks biasa.\n\nPerenggan kedua.", "plain paragraphs are reported as not formatted", plain);
assert(md("<p>x</p><script>alert(1)</script><style>p{}</style>") === "x", "script and style content is dropped");
assert(md("<p>a &lt;b&gt; c</p>") === "a <b> c", "angle brackets typed as text come through as text");

// A phrase copied from inside a sentence keeps the space that joins it to its neighbour ("Awal" + " condong" must not become "Awalcondong")
assert(md("<!--StartFragment--><i> condong</i><!--EndFragment-->") === " *condong*", "a leading space on an inline paste is kept");
assert(md("<!--StartFragment--><i>condong </i><!--EndFragment-->") === "*condong* ", "a trailing space on an inline paste is kept");
assert(md("<span>Awal </span><i>condong</i>") === "Awal *condong*", "the space between normal and italic text stays");
assert(md("<p> Satu </p><p>Dua </p>") === "Satu\n\nDua", "padding around whole pasted paragraphs is still trimmed");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
