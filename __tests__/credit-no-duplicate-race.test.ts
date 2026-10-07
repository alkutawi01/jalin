/**
 * A published episode credited the same co-writer twice. The route looked for the credit and then wrote it, as two separate steps:
 * two requests at the same moment (a double click on "Tambah kredit") both found nothing and both wrote. Looking and writing are
 * now one step per work, inside the service, so every caller is covered.
 */
import fs from "node:fs";
import path from "node:path";
import { DuplicateCreditError } from "../src/lib/admin/credit-service";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}
const read = (p: string) => fs.readFileSync(path.join(__dirname, "..", p), "utf8").replace(/\r\n/g, "\n");

const service = read("src/lib/admin/credit-service.ts");
const create = service.slice(service.indexOf("export async function createCredit"), service.indexOf("export async function", service.indexOf("export async function createCredit") + 10));
const lock = create.indexOf("pg_advisory_xact_lock(hashtext(");
const check = create.indexOf("findDuplicateCredit(existing");
const write = create.indexOf('.insertInto("credits")');
assert(create.includes("db.transaction().execute(async (trx) =>"), "a credit is written inside one transaction");
assert(lock > 0 && lock < check && check < write, "which waits its turn for the work, then looks for the same credit, then writes");
assert(create.includes('trx.selectFrom("credits").where("work_id", "=", input.workId)') && create.slice(write - 20, write).includes("trx"), "the look and the write use that transaction, not another connection");
assert(create.includes("throw new DuplicateCreditError("), "the request that comes second is refused");
assert(new DuplicateCreditError("x") instanceof Error, "with an error the route can tell apart");

const route = read("src/app/api/admin/credits/route.ts");
assert(/if \(error instanceof DuplicateCreditError\) return NextResponse\.json\(\{ error: error\.message \}, \{ status: 409 \}\);/.test(route), "and the editor is told the credit already exists (409), as for a credit added earlier");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
