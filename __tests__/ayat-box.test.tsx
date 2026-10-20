/** The verse box (:::ayat): block splitting, the three kinds of line, the reader's markup, and the visual editor's controls. */
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import StoryMarkdown from "../src/components/reader/StoryMarkdown";
import VisualManuscriptEditor, { canEditVisually } from "../src/components/admin/VisualManuscriptEditor";
import { parseAyat, splitCommunicationBlocks } from "../src/lib/reader/communication-blocks";
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
assert.match(html, /<bdi class="ayat-number">﴿١﴾<\/bdi>/, "the Arabic-Indic digit stays inside its brackets, unconverted");
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

// Editor
const editorMarkup = renderToStaticMarkup(<VisualManuscriptEditor value="" onChange={() => {}} existingAnchors={[]} onMarkerInserted={() => {}} />);
assert.match(editorMarkup, /aria-label="Sisip kotak ayat"[^>]*data-label="Kotak ayat"/, "the toolbar has a verse box button");
assert.match(editorMarkup, /baris yang bermula &quot;Maksud:&quot;/, "the editor explains the three kinds of line");
const editorSource = readFileSync(new URL("../src/components/admin/VisualManuscriptEditor.tsx", import.meta.url), "utf8");
assert.match(editorSource, /AYAT_PLACEHOLDER = "Tampal ayat di sini\.<br>Maksud: [^"]*<br>Surah [^"]*ayat 1\u20133\."/, "a new box shows the verse, Maksud and Surah lines");
assert.match(editorSource, /insertBlock\("ayat"\)/, "the button inserts a verse box");

// Authoring guide
const page = readFileSync(new URL("../src/app/admin/works/[id]/page.tsx", import.meta.url), "utf8");
assert.ok((page.match(/:::ayat/g) ?? []).length >= 2, "the guide names :::ayat in the hint and the list");
assert.ok(page.includes("Maksud: ...") && page.includes("Surah al-Asr, ayat 1–3"), "the guide explains the Maksud and Surah lines");

console.log("ayat-box: passed");
