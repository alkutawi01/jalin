/**
 * Two tabs on one work: tab B (loaded earlier) saves a genre change and used to put its old manuscript back over tab A's newer one.
 */
import fs from "node:fs";
import path from "node:path";
import { conflictMessage, reconcileEdit, storedFormValues } from "../src/lib/admin/stale-write";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}

const base = { title: "T", body: "lama", dek: "", genre: "Drama", audience: "remaja" };

// A saved a new body; B only changed the genre and still sends its old body.
let r = reconcileEdit(base, { ...base, genre: "Misteri" }, { ...base, body: "baharu daripada A" });
assert(r.conflicts.length === 0 && r.skip.includes("body") && !r.skip.includes("genre"), "a field the editor did not touch is skipped, so the other tab's text survives");

// Both edited the body to different texts.
r = reconcileEdit(base, { ...base, body: "versi B" }, { ...base, body: "versi A" });
assert(r.conflicts.join() === "body", "both changed the text differently: refused");

// B edited the body, nobody else did.
r = reconcileEdit(base, { ...base, body: "versi B" }, base);
assert(r.conflicts.length === 0 && !r.skip.includes("body"), "only B changed it: applied");

// Both changed it to the same thing.
r = reconcileEdit(base, { ...base, genre: "Misteri" }, { ...base, genre: "Misteri" });
assert(r.conflicts.length === 0, "already the same value: no conflict");

// Stored null genre vs "" in the form.
r = reconcileEdit({ ...base, genre: "" }, { ...base, genre: "" }, { ...base, genre: null });
assert(r.conflicts.length === 0, "empty and null are the same");

// No base (older client, status buttons): behaves as before.
r = reconcileEdit(undefined, { body: "x" }, { body: "y" });
assert(r.conflicts.length === 0 && r.skip.length === 0, "no base: nothing changes");
r = reconcileEdit("bukan objek", { body: "x" }, { body: "y" });
assert(r.conflicts.length === 0 && r.skip.length === 0, "a base of the wrong shape is ignored");
r = reconcileEdit(base, { genre: "X" }, { ...base, body: "lain" });
assert(r.conflicts.length === 0 && r.skip.length === 0, "a field not sent is not judged");

assert(conflictMessage(["body", "genre"]).includes("teks, genre") && conflictMessage(["body"]).includes("Tiada apa-apa disimpan"), "the message names the fields and says nothing was saved");

// Every field the Simpan button sends is guarded, not only the text.
const work = { slug: "s", title: "T", body: null, dek: null, genre: null, audience: null, reading_minutes: 7, metadata: { editorNote: "cat", origin: "sumber" }, reader: { note: "nota" } };
const stored = storedFormValues(work);
assert(stored.readingMinutes === "7" && stored.editorNote === "cat" && stored.readerNote === "nota" && stored.origin === "sumber" && stored.body === "" && stored.slug === "s", "the stored work is read the way the form shows it");
assert(storedFormValues({ ...work, reading_minutes: null, metadata: null, reader: null }).origin === "asli", "no origin stored means asli, like the form");
const formBase = { ...stored, editorNote: "lama" };
r = reconcileEdit(formBase, { ...formBase, genre: "X" }, stored);
assert(r.skip.includes("editorNote") && r.skip.includes("readerNote") && r.skip.includes("slug") && r.conflicts.length === 0, "a note another tab changed is not put back to its old text");
r = reconcileEdit(formBase, { ...formBase, editorNote: "versi B", readingMinutes: 7 }, stored);
assert(r.conflicts.join() === "editorNote" && !r.conflicts.includes("readingMinutes"), "both edited the note differently: refused; a number sent for the minutes is compared as text");

const route = fs.readFileSync(path.join(__dirname, "../src/app/api/admin/works/[id]/route.ts"), "utf8").replace(/\r\n/g, "\n");
assert(route.includes("reconcileEdit(body.base, body, storedFormValues(existing))") && route.includes("status: 409") && route.indexOf("reconcileEdit") < route.indexOf("imageMarkers(body.body)"), "the route reconciles before it validates or writes, and answers 409");
const page = fs.readFileSync(path.join(__dirname, "../src/app/admin/works/[id]/page.tsx"), "utf8").replace(/\r\n/g, "\n");
assert(page.includes("base: baseRef.current ?? undefined") && page.includes("baseRef.current = baseOf(sentForm)") && page.includes("readerNote: f.readerNote, origin: f.origin"), "the editor sends what it loaded and moves the base after each save");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
