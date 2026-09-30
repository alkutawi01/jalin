import assert from "node:assert/strict";
import { planLegacyImageMarkers } from "../src/lib/admin/legacy-image-marker-plan";

const body = "Perenggan pertama dengan lampu.\n\nPerenggan kedua dengan hujan.\n\n[[gambar:2]]";
const plan = planLegacyImageMarkers(body, [
  { id: 11, role: "inline", anchor: "dengan lampu", place: "after" },
  { id: 12, role: "inline", anchor: "dengan hujan", place: "before" },
  { id: 13, role: "hero", anchor: null, place: "after" },
]);
assert.deepEqual(plan.changes.map((c) => c.to), ["[[gambar:3]]", "[[gambar:4]]"]);
assert.equal(plan.body, "Perenggan pertama dengan lampu.\n\n[[gambar:3]]\n\n[[gambar:4]]\n\nPerenggan kedua dengan hujan.\n\n[[gambar:2]]");
assert.deepEqual(plan.skipped, []);

const ambiguous = planLegacyImageMarkers("sama\n\nsama", [{ id: 4, role: "inline", anchor: "sama", place: "after" }]);
assert.equal(ambiguous.body, "sama\n\nsama");
assert.equal(ambiguous.changes.length, 0);
assert.equal(ambiguous.skipped.length, 1);

const missing = planLegacyImageMarkers(body, [{ id: 5, role: "inline", anchor: "tiada", place: "after" }]);
assert.equal(missing.changes.length, 0);
assert.equal(missing.skipped.length, 1);

console.log("Legacy image-marker plan tests passed.");
