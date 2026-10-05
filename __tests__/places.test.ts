/**
 * Latar tempat (Izzat): where the story happens, kept in works.metadata.places (no migration), edited next to the characters in
 * the editor, shown in the reader's right column under Watak and as a "Latar" tab in the phone's Info sheet.
 * Run in a browser on a temporary Neon branch: saved through the real form, shown in the preview, and adding a place made the work
 * count as "changed since published" (clearing it made it unchanged again).
 */
import fs from "node:fs";
import path from "node:path";
import { validatePlaceEntries, PLACES_MAX } from "../src/lib/admin/work-service";
import { charactersFingerprint } from "../src/lib/admin/revision-service";
import { publicPlaces } from "../src/lib/reader/places";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}
function throws(fn: () => unknown, part: string): boolean {
  try { fn(); return false; } catch (e) { return (e as Error).message.includes(part); }
}
const read = (p: string) => fs.readFileSync(path.join(__dirname, "..", p), "utf8").replace(/\r\n/g, "\n");

// validation
assert(JSON.stringify(validatePlaceEntries([{ name: "  Beranda  ", description: " Kampung " }, { name: "Jalan" }])) === JSON.stringify([{ name: "Beranda", description: "Kampung" }, { name: "Jalan" }]), "names and descriptions are trimmed; an empty description is left out");
assert(throws(() => validatePlaceEntries([{ name: "  " }]), "nama diperlukan"), "a place needs a name");
assert(throws(() => validatePlaceEntries([{ name: "x".repeat(81) }]), "terlalu panjang"), "a name is limited to 80 characters");
assert(throws(() => validatePlaceEntries([{ name: "A", description: "y".repeat(161) }]), "keterangan terlalu panjang"), "a description is limited to 160 characters");
assert(throws(() => validatePlaceEntries([{ name: "Rumah" }, { name: "rumah" }]), "dua kali"), "the same place twice is refused (case does not matter)");
assert(throws(() => validatePlaceEntries(Array.from({ length: PLACES_MAX + 1 }, (_, i) => ({ name: `T${i}` }))), "paling banyak"), `more than ${PLACES_MAX} places is refused`);
assert(throws(() => validatePlaceEntries("x"), "senarai") && throws(() => validatePlaceEntries([null]), "bentuk tidak sah"), "a body that is not a list of places is refused");

// the reader only ever gets the name and the description
const projected = publicPlaces({ places: [{ name: " Beranda ", description: "Kampung", internalSecret: "X" }, { name: "" }, { description: "tiada nama" }, "bukan objek"] });
assert(JSON.stringify(projected) === JSON.stringify([{ name: "Beranda", description: "Kampung" }]), "the reader gets name and description only; empty and malformed entries are dropped");
assert(publicPlaces(undefined).length === 0 && publicPlaces({}).length === 0, "no places gives none");

// change detection: no published work looks changed because of this
const chars = { characters: [{ name: "Alia", role: "Utama" }] };
assert(charactersFingerprint(chars) === JSON.stringify([["Alia", "Utama", ""]]), "a work without places has exactly the fingerprint it always had");
assert(charactersFingerprint({}) === "" && charactersFingerprint({ places: [] }) === "", "a work with nothing gives an empty fingerprint");
assert(charactersFingerprint({ ...chars, places: [{ name: "Beranda" }] }) !== charactersFingerprint(chars), "adding a place counts as a change");
assert(charactersFingerprint({ places: [{ name: "A", description: "x" }] }) !== charactersFingerprint({ places: [{ name: "A", description: "y" }] }), "changing the words about a place counts as a change");

// wiring
const api = read("src/app/api/admin/works/[id]/places/route.ts");
assert(api.includes("export async function GET") && api.includes("export async function PATCH") && api.includes("updateWorkPlaces"), "there is an API to read and save the places");
const chrome = read("src/components/reader/StoryChrome.tsx");
const right = chrome.slice(chrome.indexOf("export function RightRail"), chrome.indexOf("export function EditorNote"));
assert(right.includes("Latar tempat") && right.includes("places.map"), "the right column shows Latar tempat");
assert(read("src/components/reader/WorkView.tsx").includes("<RightRail characters={characters} places={places} />") && read("src/components/reader/EpisodeView.tsx").includes("<RightRail characters={characters} places={places} />"), "stories and series episodes both show the places");
assert(read("src/components/reader/MobileStoryInfo.tsx").includes("sheet-tab-latar"), "the phone's Info sheet has a Latar tab");
const editor = read("src/app/admin/works/[id]/page.tsx");
assert(editor.includes("<PlacesEditor workId={workId} />") && editor.includes("Watak &amp; latar"), "the editor has the places next to the characters");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
