import assert from "node:assert/strict";
import { canEditVisually } from "../src/components/admin/VisualManuscriptEditor";
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

console.log("visual-manuscript-editor: passed");
