/**
 * Adding a chapter whose address another chapter of the novela already has answered the editor with the database's own words
 * ('duplicate key value violates unique constraint "reading_sections_work_slug_key"'), and two chapters added at the same moment
 * both took the same position, the second failing the same way. A chapter is now added to a work one at a time, and a clash is
 * told in the editor's language (as saving an existing chapter already did).
 */
import fs from "node:fs";
import path from "node:path";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}
const read = (p: string) => fs.readFileSync(path.join(__dirname, "..", p), "utf8").replace(/\r\n/g, "\n");

const service = read("src/lib/admin/section-service.ts");
const start = service.indexOf("export async function createSection");
const create = service.slice(start, service.indexOf("export async function", start + 10));
const lock = create.indexOf("pg_advisory_xact_lock(hashtext(");
const last = create.indexOf('.orderBy("position", "desc")');
const write = create.indexOf('.insertInto("reading_sections")');
assert(create.includes("db.transaction().execute(async (trx) =>") && lock > 0 && lock < last && last < write, "the last position is read and the chapter written in one turn per work");
assert(!/await db\s*\.selectFrom\("reading_sections"\)/.test(create) && !/await db\s*\.insertInto/.test(create), "on that transaction, not on another connection");
assert(create.includes('clash.code === "23505"') && create.includes("Alamat bab ini sudah digunakan oleh bab lain dalam karya yang sama. Pilih alamat lain."), "an address already taken is said in Malay");
assert(create.includes('clash.constraint === "reading_sections_work_position_key"') && create.includes("Kedudukan bab ini sudah digunakan."), "and so is a position already taken");

const route = read("src/app/api/admin/works/[id]/sections/route.ts");
assert(route.includes('message.includes("sudah digunakan")'), "both are answered as the editor's mistake, not a server failure");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
