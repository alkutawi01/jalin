/** The verse box (:::ayat): block splitting, the three kinds of line, the reader's markup, and the visual editor's controls. */
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import StoryMarkdown from "../src/components/reader/StoryMarkdown";
import VisualManuscriptEditor, { canEditVisually } from "../src/components/admin/VisualManuscriptEditor";
import { AYAT_PLACEHOLDER_LINES, ayatLineKind, hasAyatPlaceholder, parseAyat, splitCommunicationBlocks } from "../src/lib/reader/communication-blocks";
import { normalizeAyatMarks } from "../src/lib/reader/arabic-text";
import { readFileSync } from "node:fs";

const verse = "وَالْعَصْرِ ﴿١﴾ إِنَّ الْإِنسَانَ لَفِي خُسْرٍ ﴿٢﴾";
const box = (inner: string) => `:::ayat\n${inner}\n:::`;
const render = (md: string) => renderToStaticMarkup(<StoryMarkdown glossary={{}}>{md}</StoryMarkdown>);

// Block splitting
assert.deepEqual(splitCommunicationBlocks(`Sebelum.\n\n${box(verse)}\n\nSelepas.`), [
  { kind: "prose", content: "Sebelum." },
  { kind: "ayat", content: verse },
  { kind: "prose", content: "\n\nSelepas." },
]);
assert.deepEqual(splitCommunicationBlocks(`:::ayat\n${verse}`), [{ kind: "prose", content: `:::ayat\n${verse}` }], "a box without its closing line stays ordinary text");
assert.deepEqual(splitCommunicationBlocks(`${box(verse)}\n\n:::mesej\nAli: hai\n:::`).map((s) => s.kind), ["ayat", "mesej"], "a verse box beside a message box");
assert.equal(canEditVisually(box(`${verse}\nMaksud: Demi masa.\nSurah al-Asr, ayat 1–3`)), true, "the visual editor holds a verse box");
assert.equal(canEditVisually(`:::ayat\n${verse}`), false, "an unclosed verse box stays in the source editor");

// The three kinds of line, sorted whatever the written order
const parts = parseAyat(`Surah al-Asr, ayat 1-3\nMaksud: Demi masa, 1-3 hingga akhir.\n${verse}\nTerjemahan tanpa awalan.`);
assert.deepEqual(parts.verses, [verse], "an Arabic line is the verse");
assert.deepEqual(parts.meanings, ["Demi masa, 1-3 hingga akhir.", "Terjemahan tanpa awalan."], "Maksud lines and plain lines are the meaning, written as they are");
assert.deepEqual(parts.references, ["Surah al-Asr, ayat 1–3"], "a plain hyphen between two numbers in a reference is an en dash");
assert.deepEqual(parseAyat("Rujukan: Surah Ali Imran, ayat 190 - 191").references, ["Surah Ali Imran, ayat 190–191"], "Rujukan: is removed and spaced hyphens become an en dash");
assert.deepEqual(parseAyat("Surah al-Asr, ayat 1 hingga 3").references, ["Surah al-Asr, ayat 1 hingga 3"], "hingga stays as written");
assert.deepEqual(parseAyat("Maksud:").meanings, [], "an empty Maksud line adds nothing");

// The reader's markup
const html = render(`Sebelum.\n\n${box(`Surah al-Asr, ayat 1-3\nMaksud: Demi masa.\n${verse}`)}\n\nSelepas.`);
assert.match(html, /<figure class="story-ayat" aria-label="Ayat al-Quran">/, "the box is a figure with an accessible name");
assert.match(html, /<p class="ayat-text" lang="ar" dir="rtl">/, "the verse is Arabic, right to left");
assert.equal((html.match(/<bdi class="ayat-number">/g) ?? []).length, 2, "each end-of-verse mark is isolated");
assert.match(html, /<bdi class="ayat-number">۝١<\/bdi>/, "an old-style mark is shown as the circle mark, U+06DD and the Arabic-Indic number");
assert.ok(!html.includes("﴿") && !html.includes("﴾"), "no ornate brackets are left in the shown verse");

// Marks in every written form become U+06DD + Arabic-Indic digits when shown; the stored text is not touched
const mark = (n: string) => "۝" + n;
const forms: Array<[string, string]> = [
  ["وَالْعَصْرِ ۝١", "وَالْعَصْرِ " + mark("١")],
  ["وَالْعَصْرِ۝١", "وَالْعَصْرِ " + mark("١")],
  ["وَالْعَصْرِ ۝ 1", "وَالْعَصْرِ " + mark("١")],
  ["وَالْعَصْرِ ﴿١﴾", "وَالْعَصْرِ " + mark("١")],
  ["وَالْعَصْرِ ﴿1﴾", "وَالْعَصْرِ " + mark("١")],
  ["وَالْعَصْرِ (١)", "وَالْعَصْرِ " + mark("١")],
  ["وَالْعَصْرِ (12)", "وَالْعَصْرِ " + mark("١٢")],
  ["وَالْعَصْرِ {1}", "وَالْعَصْرِ " + mark("١")],
  ["وَالْعَصْرِ (1) خُسْرٍ (2)", "وَالْعَصْرِ " + mark("١") + " خُسْرٍ " + mark("٢")],
  ["وَالْعَصْرِ (1)(2)", "وَالْعَصْرِ " + mark("١") + " " + mark("٢")],
];
for (const [written, shown] of forms) assert.equal(normalizeAyatMarks(written), shown, "mark form " + written);
assert.equal(normalizeAyatMarks("Dia berkata (1) dan {2}."), "Dia berkata (1) dan {2}.", "brackets after Malay text are not verse marks");

// The three verses of Surah al-Asr, 103:1-3, in the box and in an Arabic-only paragraph
const asr = "وَٱلْعَصْرِ ۝١ إِنَّ ٱلْإِنسَـٰنَ لَفِى خُسْرٍ ۝٢ إِلَّا ٱلَّذِينَ ءَامَنُوا۟ وَعَمِلُوا۟ ٱلصَّـٰلِحَـٰتِ ۝٣";
const asrBox = render(box(asr + "\nMaksud: Demi masa.\nSurah al-Asr, ayat 1-3"));
assert.equal((asrBox.match(/<bdi class="ayat-number">۝[٠-٩]<\/bdi>/g) ?? []).length, 3, "three circle marks in the verse box");
const asrPlain = render(asr.replace(/۝١/, "(1)").replace(/۝٢/, "﴿٢﴾").replace(/۝٣/, "{3}"));
assert.match(asrPlain, /<p class="arabic-block" lang="ar" dir="rtl">/, "an Arabic-only paragraph with written-out marks is still a verse paragraph");
assert.equal((asrPlain.match(/<bdi class="ayat-number">۝[٠-٩]<\/bdi>/g) ?? []).length, 3, "the same three marks in an Arabic-only paragraph, whatever form was written");
assert.ok(!/[0-9]/.test(html.match(/<p class="ayat-text"[\s\S]*?<\/p>/)![0]), "no Latin digit is put into the verse");
assert.ok(html.indexOf('class="ayat-text"') < html.indexOf('class="ayat-meaning"') && html.indexOf('class="ayat-meaning"') < html.indexOf('class="ayat-reference"'), "order is verse, meaning, reference");
assert.match(html, /<span class="ayat-caption-label">Maksud<\/span>/, "the meaning has a small label");
assert.match(html, /<figcaption>[\s\S]*Demi masa\.[\s\S]*<p class="ayat-reference">Surah al-Asr, ayat 1–3<\/p><\/figcaption>/, "meaning and reference sit in the caption, reference with an en dash");
assert.ok(!html.includes("story-communication-ayat") && !html.includes("message-sender"), "no message-box logic is used for a verse");
assert.match(html, /Sebelum\./); assert.match(html, /Selepas\./);

const bare = render(box(verse));
assert.ok(bare.includes("story-ayat") && !bare.includes("figcaption"), "a verse without caption has no caption");
assert.ok(render(box("Maksud: Demi masa.")).includes("figcaption") && !render(box("Maksud: Demi masa.")).includes("ayat-text"), "a box with only a meaning still renders");
assert.match(render(verse), /<p class="arabic-block" lang="ar" dir="rtl">/, "an Arabic paragraph outside a box is unchanged");

// Maksud and Rujukan are optional: an Arabic-only box, and Arabic with a reference but no meaning, show no empty label or dangling rule
const arabicOnly = render(box(verse));
assert.ok(arabicOnly.includes("ayat-text") && !arabicOnly.includes("figcaption") && !arabicOnly.includes("Maksud") && !arabicOnly.includes("ayat-reference"), "an Arabic-only box has no caption, no label and no rule");
const noMeaning = render(box(verse + "\nSurah al-Asr, ayat 1-3"));
assert.ok(noMeaning.includes('<p class="ayat-reference">Surah al-Asr, ayat 1\u20133</p>') && !noMeaning.includes("ayat-caption-label") && !noMeaning.includes("ayat-meaning"), "Arabic with a reference but no meaning shows no Maksud label");
const noRef = render(box(verse + "\nMaksud: Demi masa."));
assert.ok(noRef.includes("ayat-caption-label") && !noRef.includes("ayat-reference"), "Arabic with a meaning but no reference shows no reference line");
const refFirst = render(box(verse + "\nSurah al-Asr, ayat 1-3\nMaksud: Demi masa."));
assert.ok(refFirst.indexOf("ayat-meaning") < refFirst.indexOf("ayat-reference"), "the reference is set after the meaning, as its own line");
assert.deepEqual(["", "وَالْعَصْرِ", "Maksud: Demi masa.", "Demi masa.", "Surah al-Asr, ayat 1", "Rujukan: Surah al-Asr"].map(ayatLineKind), ["empty", "verse", "maksud", "maksud", "ref", "ref"], "the kind of each line");

// Editor
const editorMarkup = renderToStaticMarkup(<VisualManuscriptEditor value="" onChange={() => {}} existingAnchors={[]} onMarkerInserted={() => {}} />);
assert.match(editorMarkup, /aria-label="Sisip kotak ayat"[^>]*data-label="Kotak ayat"/, "the toolbar has a verse box button");
assert.match(editorMarkup, /aria-label="Sisip nombor ayat"[^>]*data-label="Nombor ayat"/, "the toolbar has a verse number button");
assert.match(editorMarkup, /<button[^>]*disabled=""[^>]*aria-label="Sisip nombor ayat"|disabled=""[^>]*aria-label="Sisip nombor ayat"/, "the verse number button is off outside a verse box");
assert.match(editorMarkup, /baris yang bermula &quot;Maksud:&quot;/, "the editor explains the three kinds of line");
const editorSource = readFileSync(new URL("../src/components/admin/VisualManuscriptEditor.tsx", import.meta.url), "utf8");
const has = (needle: string) => editorSource.replace(/\r\n/g, "\n").includes(needle);
assert.ok(has("AYAT_PLACEHOLDER_LINES.map(") && has("import { AYAT_PLACEHOLDER_LINES"), "the editor builds a new box from the same placeholder lines publication readiness refuses");
assert.deepEqual([...AYAT_PLACEHOLDER_LINES].map((l) => hasAyatPlaceholder(l)), [true, true, true], "each placeholder line is recognised");
assert.equal(hasAyatPlaceholder(box(verse)), false, "a real verse is not a placeholder");
assert.ok(has('class="ayat-line ${ayatLineClass(text)}" dir="auto"'), "every line of a loaded verse box is a dir=auto block, Arabic ones marked");
assert.ok(has("normalizeAyatBoxes(editor);"), "lines are kept as blocks on every change");
assert.ok(has("A verse box keeps one block per line: the browser's own Enter splits the line into two."), "Enter in a verse box is left to the browser, which splits the line block");
assert.ok(has('every pasted line becomes a line block of its own'), "pasting several lines into a verse box makes one block per line");
assert.ok(has("ayat-line-maksud") && has("ayat-line-ref") && has("ayatLineClass(el.textContent"), "each line is marked as verse, meaning or reference while loading and typing, so the editor looks like the reader");
assert.ok(has("ayatMarkdown(element)"), "a verse box is written back to Markdown one line per block");
assert.ok(has("this box is built in the page itself"), "wrapping selected paragraphs builds the verse box in the page (insertHTML would tear its line blocks apart)");
assert.ok(has("Backspace at the very start of a verse box"), "Backspace and Delete cannot pull text out of or into a verse box at its edges");
assert.match(editorSource, /insertBlock\("ayat"\)/, "the button inserts a verse box");

// Authoring guide
const css = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");
const page = readFileSync(new URL("../src/app/admin/works/[id]/page.tsx", import.meta.url), "utf8");
assert.ok((page.match(/:::ayat/g) ?? []).length >= 2, "the guide names :::ayat in the hint and the list");
assert.ok(page.includes("۝١") && page.includes("Nombor ayat"), "the guide explains the circle mark and the Nombor ayat button");
assert.ok(css.includes(".story-ayat .ayat-reference") && css.includes(".visual-manuscript-communication-ayat .ayat-line-ref"), "the reference has its own style in the reader and in the editor");
assert.ok(/\.ayat-reference \{[^}]*font-style: normal[^}]*letter-spacing/.test(css), "the reference is not italic and is letter-spaced");
assert.ok(page.includes("Maksud dan rujukan adalah pilihan") && editorSource.includes("Maksud dan rujukan adalah pilihan"), "the guide and the editor hint say Maksud and Rujukan are optional");
assert.ok(page.includes("Maksud: ...") && page.includes("Surah al-Asr, ayat 1–3"), "the guide explains the Maksud and Surah lines");

console.log("ayat-box: passed");
