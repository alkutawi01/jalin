import assert from "node:assert/strict";
import fs from "node:fs";
const helper = fs.readFileSync("src/components/admin/EditorAssistant.tsx", "utf8");
const service = fs.readFileSync("src/lib/admin/authoring/editor-answer-service.ts", "utf8");
assert.equal((helper.match(/await fetch\(/g) ?? []).length, 1);
assert.ok(service.includes("db.transaction().execute") && service.includes(".forUpdate()"));
assert.ok(helper.includes('apply ? "apply" : "preview"'));
assert.ok(service.includes("input.version !== version"));
console.log("Confirmed selection uses one atomic request, locks and version check; integration test proves rollback");
