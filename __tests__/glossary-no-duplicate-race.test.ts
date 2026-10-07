/**
 * The glossary route looked for the term and then wrote it, as two separate steps, and the form does not block a second click:
 * two requests at the same moment both found nothing and both wrote, so readers met the same glossary entry twice (the fault
 * that put one co-writer twice on a published episode). Looking and writing are now one step per work, inside the service.
 */
import fs from "node:fs";
import path from "node:path";
import { DuplicateTermError } from "../src/lib/admin/glossary-service";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}
const read = (p: string) => fs.readFileSync(path.join(__dirname, "..", p), "utf8").replace(/\r\n/g, "\n");

const service = read("src/lib/admin/glossary-service.ts");
const start = service.indexOf("export async function createGlossaryTerm");
const create = service.slice(start, service.indexOf("export async function", start + 10));
const lock = create.indexOf("pg_advisory_xact_lock(hashtext(");
const check = create.indexOf("findDuplicateTerm(existing, input.term)");
const write = create.indexOf('.insertInto("glossary_terms")');
assert(create.includes("db.transaction().execute(async (trx) =>") && lock > 0 && lock < check && check < write, "a term waits its turn for the work, is looked for, then written, in one transaction");
assert(create.includes('trx.selectFrom("glossary_terms").where("work_id", "=", input.workId)') && !/await db\s*\.insertInto/.test(create), "on that transaction, not on another connection");
assert(create.includes("throw new DuplicateTermError(") && new DuplicateTermError("x") instanceof Error, "the request that comes second is refused");
assert(/if \(error instanceof DuplicateTermError\) return NextResponse\.json\(\{ error: error\.message \}, \{ status: 409 \}\);/.test(read("src/app/api/admin/glossary/route.ts")), "and the editor is told the term already exists (409)");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
