import assert from "node:assert/strict";
import VisualManuscriptEditor, { canEditVisually } from "../src/components/admin/VisualManuscriptEditor";
import { splitCommunicationBlocks } from "../src/lib/reader/communication-blocks";
import { renderToStaticMarkup } from "react-dom/server";
import StoryMarkdown from "../src/components/reader/StoryMarkdown";

assert.equal(canEditVisually(""), true);
assert.equal(canEditVisually("Satu perenggan.\n\n## Bab 1\n\n**Tebal** dan *condong*.\n\n[[gambar:1]]\n\n---"), true);
assert.equal(canEditVisually("[pautan](https://example.com)"), false);
assert.equal(canEditVisually("# Tajuk utama\n\nTeks"), false);
assert.equal(canEditVisually("- Senarai\n- Lagi"), false);
assert.equal(canEditVisually(":::mesej\nIsi sahaja.\n:::"), true);
assert.equal(canEditVisually(":::emel\nSalam,\n\nSaya akan datang.\n:::"), true);
assert.equal(canEditVisually(":::mesej\nTidak ditutup"), false);
// Plain characters an editor can type in the visual editor must not lock it out (messages and e-mails use them a lot).
assert.equal(canEditVisually("[10:32] Ali <ali@x.com> kata_a | 5 \\* 3 > 2 dan 1. satu"), true);
assert.equal(canEditVisually(":::mesej\n[10:32] Ali: Dah sampai?\n:::"), true);
assert.equal(canEditVisually(":::emel\nDaripada: Ali <ali@x.com>\nKepada: Siti\n:::"), true);
assert.equal(canEditVisually("fail C:\\\\data dan 2 \\* 3"), true);
// Syntax that would be flattened still stays in the source editor.
assert.equal(canEditVisually("![gambar](a.png)"), false);
assert.equal(canEditVisually("kod `x` di sini"), false);
assert.equal(canEditVisually("garis \\_ condong"), false);
assert.equal(canEditVisually("> petikan blok"), false);
assert.deepEqual(splitCommunicationBlocks("Sebelum.\n\n:::mesej\nIsi sahaja.\n:::\n\nSelepas."), [
  { kind: "prose", content: "Sebelum." },
  { kind: "mesej", content: "Isi sahaja." },
  { kind: "prose", content: "\n\nSelepas." },
]);
const rendered = renderToStaticMarkup(<StoryMarkdown glossary={{}}>{"Sebelum.\n\n:::mesej\nAku sudah sampai.\n:::\n\nSelepas."}</StoryMarkdown>);
assert.match(rendered, /story-communication-mesej/);
assert.match(rendered, /aria-label="Mesej dalam cerita"/);
assert.match(rendered, /Aku sudah sampai/);
assert.match(rendered, /Selepas/);

const editorMarkup = renderToStaticMarkup(<VisualManuscriptEditor value="" onChange={() => {}} existingAnchors={[]} onMarkerInserted={() => {}} />);
assert.equal((editorMarkup.match(/data-label=/g) ?? []).length, 8, "all editor controls have visible tooltip labels");
assert.match(editorMarkup, /aria-label="Sisip kotak e-mel"/, "icon-only editor controls have accessible names");
assert.match(editorMarkup, /<svg/, "toolbar uses symbols rather than text-only actions");
assert.match(editorMarkup, /Penanda gambar boleh dibuang di sini/, "visual editor explains marker removal");

console.log("visual-manuscript-editor: passed");
