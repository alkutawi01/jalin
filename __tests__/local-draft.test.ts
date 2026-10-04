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
assert(!("status" in (back?.fields ?? {})) && !("slug" in (back?.fields ?? {})), "only the writing fields are kept (not status or slug)");
assert(readDraft(store, "w2") === null, "another work has its own copy");

clearDraft(store, "w1");
assert(readDraft(store, "w1") === null, "a saved work's copy is removed");

assert(draftDiffers(pickDraftFields(form), pickDraftFields({ ...form, body: "lain" })), "different text is offered back");
assert(!draftDiffers(pickDraftFields(form), pickDraftFields({ ...form, status: "ready", slug: "x" })), "identical text is not offered back");

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

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
