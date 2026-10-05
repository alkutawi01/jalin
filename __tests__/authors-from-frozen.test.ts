/**
 * The "Nama penulis" check judged the working credits and source record, but readers see the frozen version: an author added after publishing
 * showed as fine while the public page still had none, and a credit removed in preparation showed as missing while readers still saw the author.
 */
import fs from "node:fs";
import path from "node:path";
import { publicAuthorEvidence } from "../src/lib/admin/editorial-health";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}
const snap = (credits: object[], author: string | null = null) => ({ credits, sourceWork: author === null ? null : { author } });
const frozenWithWriter = { id: "r1", snapshot: snap([{ contributor_slug: "claude", is_public: true }]) };
const frozenNoWriter = { id: "r2", snapshot: JSON.stringify(snap([{ contributor_slug: "claude", is_public: false }, { guest_name: "Tetamu", is_public: true }])) };
const liveWriter = [{ work_id: "w", contributor_slug: "claude", is_public: true }];
const none: Array<{ work_id: string; contributor_slug: string | null; is_public: boolean }> = [];

assert(publicAuthorEvidence({ id: "w", published_revision_id: "r1" }, [frozenWithWriter], none, []).hasPublicWriter, "the frozen version has a public writer although the working credits were removed: fine");
assert(!publicAuthorEvidence({ id: "w", published_revision_id: "r2" }, [frozenNoWriter], liveWriter, []).hasPublicWriter, "the frozen version has none although one was added to the working copy: still missing (readers see none)");
assert(publicAuthorEvidence({ id: "w", published_revision_id: null }, [], liveWriter, []).hasPublicWriter, "no frozen version: the working credits count (that is what readers are served)");
assert(publicAuthorEvidence({ id: "w", published_revision_id: "gone" }, [], liveWriter, []).hasPublicWriter, "a frozen version that cannot be found falls back to the working rows");
assert(publicAuthorEvidence({ id: "w", published_revision_id: "r3" }, [{ id: "r3", snapshot: snap([], "Hamka") }], none, [{ work_id: "w", author: "" }]).originalAuthor === "Hamka", "the original author of a fragmen or sinopsis comes from the frozen source record");
assert(publicAuthorEvidence({ id: "w", published_revision_id: "r4" }, [{ id: "r4", snapshot: "{rosak" }], liveWriter, []).hasPublicWriter, "an unreadable snapshot falls back too");
const health = fs.readFileSync(path.join(__dirname, "../src/lib/admin/editorial-health.ts"), "utf8").replace(/\r\n/g, "\n");
assert(health.includes("ada dalam salinan kerja, belum diterbitkan semula") && health.includes('{ fix: "Terbitkan semula" }'), "when only the working copy has the author the dashboard says to republish");
console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
