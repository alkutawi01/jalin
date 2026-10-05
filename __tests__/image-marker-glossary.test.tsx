import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import StoryMarkdown from "../src/components/reader/StoryMarkdown";
import { firstGlossaryBySegment } from "../src/lib/reader/glossary-first";
import { imageMarkerLabel, imageMarkers, insertImageMarker, stripImageMarkers } from "../src/lib/reader/image-markers";
import { placeVisuals } from "../src/lib/reader/place-visuals";
import { materializeImportImageMarkers } from "../src/lib/admin/import/image-markers";
import type { ImportPlan } from "../src/lib/admin/import/plan";

function check(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

const insertion = insertImageMarker("Awal cerita.\n\nAkhir cerita.", 4);
check(insertion?.marker === "[[gambar:1]]", "First marker should be numbered 1");
check(insertion!.body === "Awal cerita.\n\n[[gambar:1]]\n\nAkhir cerita.", "Marker should sit between paragraphs");
check(imageMarkers(insertion!.body).length === 1, "Inserted marker should be discoverable");
check(imageMarkerLabel("[[gambar:12]]") === "Gambar 12", "Image marker should have a human-readable number");
check(insertImageMarker(insertion!.body, 45, ["[[gambar:3]]"])?.marker === "[[gambar:4]]", "Marker number should not reuse existing anchors");

const image = { role: "inline", anchor: "[[gambar:1]]", place: "after", src: "test" };
const placed = placeVisuals(insertion!.body, [image]);
check(placed[1] === image, "Image should appear at its marker");
check(placed.filter((node) => typeof node === "string").every((node) => !node.includes("[[gambar:")), "Markers must not leak into reader text");
check(!stripImageMarkers("A.\n\n[[gambar:9]]\n\nB.").includes("[[gambar:"), "Unattached markers must also stay hidden");
const moved = placeVisuals("Awal yang disunting.\n\nAkhir.\n\n[[gambar:1]]", [image]);
check(typeof moved[0] === "string" && moved[0].includes("Akhir.") && moved[1] === image, "Moving the token should move the image after prose edits");

const imported = materializeImportImageMarkers({
  work: { body: "Perenggan pertama.\n\nPerenggan kedua." },
  sections: [],
  visuals: [
    { role: "inline", anchor: "Perenggan pertama.", place: "after", sectionSlug: null },
    { role: "inline", anchor: "Perenggan kedua.", place: "before", sectionSlug: null },
  ],
} as unknown as ImportPlan);
check(imported.visuals[0].anchor === "[[gambar:1]]" && imported.visuals[1].anchor === "[[gambar:2]]", "Imported images should use numbered markers");
check(imported.work.body.includes("Perenggan pertama.\n\n[[gambar:1]]\n\n[[gambar:2]]\n\nPerenggan kedua."), "Imported before/after positions should stay in prose order");
const midParagraph = materializeImportImageMarkers({
  work: { body: "Aina menemui surat lama di meja. Dia membacanya.\n\nMalam pun tiba." },
  sections: [],
  visuals: [{ role: "inline", anchor: "surat lama", place: "after", sectionSlug: null }],
} as unknown as ImportPlan);
check(midParagraph.work.body === "Aina menemui surat lama di meja. Dia membacanya.\n\n[[gambar:1]]\n\nMalam pun tiba.", "Import must not split a paragraph at the quoted phrase");

const glossary = { "minyak hitam": { meaning: "Minyak untuk enjin." } };
const segments = ["# minyak hitam\n\n*minyak hitam* naik harga. Minyak hitam habis.", image, "Minyak hitam mahal lagi."];
const allocated = firstGlossaryBySegment(segments, glossary);
const html = segments.map((segment, index) => typeof segment === "string"
  ? renderToStaticMarkup(<StoryMarkdown glossary={allocated[index]}>{segment}</StoryMarkdown>)
  : "<figure />").join("");
check((html.match(/class="glossary-term"/g) ?? []).length === 1, "Only the first prose occurrence per term should have a tooltip across image segments");
check(html.includes("<em><button"), "A first occurrence inside emphasis should retain emphasis and tooltip");
const later = firstGlossaryBySegment(["# minyak hitam", image, "Minyak hitam naik harga."], glossary);
check(Object.keys(later[0]).length === 0 && Object.keys(later[2]).length === 1, "Headings should not consume the first prose tooltip");

console.log("image marker and first-glossary tests passed");
