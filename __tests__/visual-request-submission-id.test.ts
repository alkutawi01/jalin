/**
 * A visual request's "ID Penghantaran". Emptying the box and saving said "disimpan", but the box was sent as nothing at all, so
 * the stored id stayed and came back at the next load (the same fault "Minit Bacaan" had). The number was not checked either.
 */
import fs from "node:fs";
import path from "node:path";
import { parseSubmissionId } from "../src/lib/admin/visual-request-service";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string, detail?: unknown) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`, detail ?? ""); }
}
const read = (p: string) => fs.readFileSync(path.join(__dirname, "..", p), "utf8").replace(/\r\n/g, "\n");
const refused = (value: unknown) => { try { parseSubmissionId(value); return ""; } catch (error) { return (error as Error).message; } };

assert(parseSubmissionId(undefined) === undefined, "not sent: the stored id is left alone");
assert(parseSubmissionId(null) === null && parseSubmissionId("") === null && parseSubmissionId(" ") === null, "an emptied box removes the stored id");
assert(parseSubmissionId(12) === 12 && parseSubmissionId("12") === 12, "a whole number is kept");
for (const bad of [2.5, "2.5", -1, 0, "dua", true, [3], 2147483648]) {
  assert(refused(bad).startsWith("ID Penghantaran tidak sah"), `${JSON.stringify(bad)} is refused in Malay`, refused(bad));
}

const page = read("src/app/admin/visual-requests/[id]/page.tsx");
assert(page.includes("submissionId: form.submissionId.trim() ? Number(form.submissionId) : null,") && !page.includes("Number(form.submissionId) : undefined"), "the edit form sends an emptied box as null, not as nothing");
const route = read("src/app/api/admin/visual-requests/[id]/route.ts");
assert(route.includes("submissionId = parseSubmissionId(body.submissionId);") && !route.includes("submissionId: body.submissionId") && /catch \(error\) \{\s*return NextResponse\.json\(\{ error: \(error as Error\)\.message \}, \{ status: 400 \}\);/.test(route), "the route checks the id and answers 400");
assert(read("src/lib/admin/visual-request-service.ts").includes("if (input.submissionId !== undefined) updateData.submission_id = input.submissionId || null;"), "and null clears the column");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
