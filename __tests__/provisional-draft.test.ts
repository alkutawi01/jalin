import assert from "node:assert/strict";
import fs from "node:fs";
import { isUntouchedProvisionalDraft } from "../src/lib/admin/provisional-draft";

const empty = { title: "Draf tanpa tajuk", body: "", status: "draft", created_at: "2026-10-16T00:00:00.000Z", updated_at: "2026-10-16T00:00:00.000Z", published_at: null, published_revision_id: null };
assert.equal(isUntouchedProvisionalDraft(empty), true);
assert.equal(isUntouchedProvisionalDraft({ ...empty, body: "Sudah ditulis" }), false);
assert.equal(isUntouchedProvisionalDraft({ ...empty, updated_at: "2026-10-16T00:01:00.000Z" }), false);
assert.equal(isUntouchedProvisionalDraft({ ...empty, status: "review" }), false);
assert.equal(isUntouchedProvisionalDraft({ ...empty, published_revision_id: 1 }), false);

const add = fs.readFileSync("src/app/admin/works/add/page.tsx", "utf8");
const editor = fs.readFileSync("src/app/admin/works/[id]/page.tsx", "utf8");
const dashboard = fs.readFileSync("src/app/admin/page.tsx", "utf8");
const works = fs.readFileSync("src/app/admin/works/page.tsx", "utf8");
assert.match(add, /\?baharu=1#/);
assert.ok(!editor.includes("/discard-empty") && !editor.includes('addEventListener("pagehide"'), "browser lifecycle cannot remove the server draft");
const oldEndpoint = fs.readFileSync("src/app/api/admin/works/[id]/discard-empty/route.ts", "utf8");
assert.ok(oldEndpoint.includes("discarded: false") && !oldEndpoint.includes("deleteUnpublishedWork"), "requests from old tabs also preserve the draft");
assert.ok(editor.includes("Padam dipilih") && editor.includes("Pilih semua watak"));
assert.ok(dashboard.includes("isUntouchedProvisionalDraft") && works.includes("isUntouchedProvisionalDraft"), "untouched placeholders are not presented or counted as drafts");
console.log("Browser lifecycle preserves drafts; placeholder filtering and bulk character controls remain wired");
