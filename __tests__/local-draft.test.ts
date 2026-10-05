/** Unsaved text is kept in the browser so a refresh does not lose it, and is only offered back when it differs from the server. */
import { clearDraft, draftDiffers, pickDraftFields, readDraft, saveDraft, type DraftStorage } from "../src/lib/admin/local-draft";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}

function memory(): DraftStorage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v), removeItem: (k) => void data.delete(k) };
}

const form = { title: "Hujan", dek: "", body: "Teks panjang yang ditaip.", genre: "", audience: "", readingMinutes: "", editorNote: "", origin: "asli", status: "draft", slug: "hujan" };

const store = memory();
saveDraft(store, "w1", form, 1000);
const back = readDraft(store, "w1");
assert(back?.savedAt === 1000 && back.fields.body === "Teks panjang yang ditaip.", "what was typed is read back exactly");
assert(!("status" in (back?.fields ?? {})) && back?.fields.slug === "hujan", "only the fields of the Simpan button are kept (not status)");
const typed = { ...form, slug: "alamat-sendiri", readerNote: "Nota baharu" };
saveDraft(store, "w3", typed, 5);
assert(readDraft(store, "w3")?.fields.slug === "alamat-sendiri" && readDraft(store, "w3")?.fields.readerNote === "Nota baharu", "the address and the reader's note come back too");
assert(draftDiffers(pickDraftFields(typed), pickDraftFields(form)), "a change only to the address or the note is still offered back");
// A copy made before slug and readerNote were kept must not blank them when restored, nor be offered because of them.
const oldCopy = memory();
oldCopy.setItem("jalin:draft:w4", JSON.stringify({ savedAt: 9, fields: { title: "Hujan", dek: "", body: "x", genre: "", audience: "", readingMinutes: "", editorNote: "", origin: "asli" } }));
const old = readDraft(oldCopy, "w4");
assert(old !== null && !("slug" in old.fields) && !("readerNote" in old.fields), "an old copy holds only what it had");
assert(old !== null && !draftDiffers(old.fields, pickDraftFields({ ...form, body: "x", slug: "hujan", readerNote: "ada nota" })), "and is not offered back because of fields it never had");
assert(readDraft(store, "w2") === null, "another work has its own copy");

clearDraft(store, "w1");
assert(readDraft(store, "w1") === null, "a saved work's copy is removed");

assert(draftDiffers(pickDraftFields(form), pickDraftFields({ ...form, body: "lain" })), "different text is offered back");
assert(!draftDiffers(pickDraftFields(form), pickDraftFields({ ...form, status: "ready" })), "identical text is not offered back");

// storage trouble must never break the editor
const broken: DraftStorage = { getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("full"); }, removeItem: () => { throw new Error("blocked"); } };
saveDraft(broken, "w1", form);
clearDraft(broken, "w1");
assert(readDraft(broken, "w1") === null, "blocked or full storage is ignored without an error");
assert(readDraft(undefined, "w1") === null && (saveDraft(undefined, "w1", form), true), "no storage at all is fine");
const junk = memory();
junk.setItem("jalin:draft:w1", "{not json");
assert(readDraft(junk, "w1") === null, "a damaged copy is ignored");
junk.setItem("jalin:draft:w1", JSON.stringify({ savedAt: "x", fields: 5 }));
assert(readDraft(junk, "w1") === null, "a copy of the wrong shape is ignored");

import fs from "node:fs";
import path from "node:path";
const page = fs.readFileSync(path.join(__dirname, "../src/app/admin/works/[id]/page.tsx"), "utf8").replace(/\r\n/g, "\n");
assert(page.includes("restoreOffer.savedAt < serverSavedAt") && page.includes("Salinan ini lebih lama"), "the restore offer says when the browser copy is older than what the server has");
assert(page.includes('slug: work.slug, dek: work.dek || ""') && page.includes('readerNote: work.reader?.note ?? ""'), "the server side of the comparison includes the address and the note");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
