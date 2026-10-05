/** Version label by the date of the change: same day v1.0.1, a later day v1.1, a later month v2.0 (Malaysia time). */
import { FIRST_VERSION_LABEL, displayVersion, nextVersionLabel, parseVersionLabel } from "../src/lib/admin/version-label";

let passed = 0;
let failed = 0;
function eq(actual: unknown, expected: unknown, msg: string) {
  if (JSON.stringify(actual) === JSON.stringify(expected)) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}\n      got ${JSON.stringify(actual)} expected ${JSON.stringify(expected)}`); }
}
// Malaysia is UTC+8, so "2026-10-05T10:00+08:00" is the same instant as 02:00Z.
const at = (iso: string) => new Date(iso);

eq(FIRST_VERSION_LABEL, "v1.0", "the first publication is v1.0");

eq(nextVersionLabel("v1.0", at("2026-10-05T09:00:00+08:00"), at("2026-10-05T21:30:00+08:00")), "v1.0.1", "changed again the same day: v1.0.1");
eq(nextVersionLabel("v1.0.1", at("2026-10-05T09:00:00+08:00"), at("2026-10-05T23:59:00+08:00")), "v1.0.2", "and again the same day: v1.0.2");
eq(nextVersionLabel("v1.0.2", at("2026-10-05T09:00:00+08:00"), at("2026-10-06T08:00:00+08:00")), "v1.1", "changed on a later day of the same month: v1.1 (patch resets)");
eq(nextVersionLabel("v1.1", at("2026-10-06T09:00:00+08:00"), at("2026-10-20T08:00:00+08:00")), "v1.2", "another later day: v1.2");
eq(nextVersionLabel("v1.2", at("2026-10-20T09:00:00+08:00"), at("2026-11-02T08:00:00+08:00")), "v2.0", "changed in a later month: v2.0 (minor resets)");
eq(nextVersionLabel("v2.0", at("2026-12-30T09:00:00+08:00"), at("2027-01-02T08:00:00+08:00")), "v3.0", "a later month across the year end: v3.0");
eq(nextVersionLabel("v1.0", at("2025-10-05T09:00:00+08:00"), at("2026-10-05T09:00:00+08:00")), "v2.0", "the same month a year later is a different month: v2.0");

// the day is Malaysia's, not UTC's
eq(nextVersionLabel("v1.0", at("2026-10-05T23:00:00+08:00"), at("2026-10-06T00:30:00+08:00")), "v1.1", "after midnight in Malaysia is a new day even if UTC is still the same day");
eq(nextVersionLabel("v1.0", at("2026-10-31T23:00:00+08:00"), at("2026-11-01T00:30:00+08:00")), "v2.0", "after midnight on the last day of the month is a new month");
eq(nextVersionLabel("v1.0", at("2026-10-05T01:00:00+08:00"), at("2026-10-04T18:00:00Z")), "v1.0.1", "two moments on the same Malaysian date are the same day, whichever UTC date they fall on");

// labels from before this rule
eq(nextVersionLabel("v3", at("2026-10-01T09:00:00+08:00"), at("2026-10-01T10:00:00+08:00")), "v3.0.1", "an old label like v3 is read as v3.0");
eq(nextVersionLabel("v0.2", at("2026-10-01T09:00:00+08:00"), at("2026-10-02T10:00:00+08:00")), "v1.0", "a draft label (v0.x) starts the published version at v1.0");
eq(nextVersionLabel("revert-v4", at("2026-10-01T09:00:00+08:00"), at("2026-10-02T10:00:00+08:00")), "v1.0", "an unreadable label starts again from v1.0");
eq(nextVersionLabel(null, null, at("2026-10-02T10:00:00+08:00")), "v1.0", "no previous label or date: v1.0");
eq(nextVersionLabel("v1.0", "not a date", at("2026-10-02T10:00:00+08:00")), "v1.0", "an unreadable date starts again from v1.0");
eq(nextVersionLabel("v1.0", "2026-10-05T01:00:00.000Z", at("2026-10-05T05:00:00Z")), "v1.0.1", "dates given as ISO text work");

eq(parseVersionLabel("v1.10.3"), { major: 1, minor: 10, patch: 3 }, "labels are read as numbers (v1.10 is after v1.9)");

// Readers are served from the frozen row, so the new label must be written there (verified on a Neon branch: without it
// the reader showed the label of the publication before).
import fs from "node:fs";
import path from "node:path";
const revisionService = fs.readFileSync(path.join(__dirname, "../src/lib/admin/revision-service.ts"), "utf8");
eq(/raw: \{ \.\.\.frozenRaw, work: \{ \.\.\.frozenRaw\.work, version_label: options\.versionLabel \}/.test(revisionService), true, "a publication writes its label into the frozen row readers are served from");
const publication = fs.readFileSync(path.join(__dirname, "../src/lib/admin/publication-service.ts"), "utf8");
eq(publication.includes("versionLabel: FIRST_VERSION_LABEL") && publication.includes("nextVersionLabel(existing.version_label, existing.published_at"), true, "first publication and republication both set the label by the rule");

// a draft never shows v0: new drafts start at v1.0 and an old stored v0.x reads as v1.0
eq(displayVersion("v0.1"), "v1.0", "an old draft label v0.1 is shown as v1.0");
eq(displayVersion("v0"), "v1.0", "v0 is shown as v1.0");
eq(displayVersion(null), "v1.0", "no label is shown as v1.0");
eq(displayVersion("v1.2.1"), "v1.2.1", "a real version is shown as it is");
eq(displayVersion("v10.0"), "v10.0", "v10 is not mistaken for v0");
for (const file of ["src/app/api/admin/works/route.ts", "src/app/api/admin/works/start-draft/route.ts", "src/lib/admin/work-service.ts", "src/lib/admin/import/import-service.ts"]) {
  eq(fs.readFileSync(path.join(__dirname, "..", file), "utf8").includes("v0.1"), false, `${file} does not start a work at v0.1`);
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
