/**
 * Two episodes attached to a series at the same moment both took the same position, and the second was answered with the
 * database's own words ('duplicate key value violates unique constraint "series_entries_series_position_key"'); one episode
 * attached twice at once got "series_entries_work_id_key". And a work that is not an episode ("Hanya Work type=bersiri…") was
 * answered as a server failure (500), because the route looked for a lower-case "hanya".
 */
import fs from "node:fs";
import path from "node:path";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}
const read = (p: string) => fs.readFileSync(path.join(__dirname, "..", p), "utf8").replace(/\r\n/g, "\n");

const service = read("src/lib/admin/series-service.ts");
const start = service.indexOf("export async function attachEpisode");
const attach = service.slice(start, service.indexOf("export async function", start + 10));
const lock = attach.indexOf("pg_advisory_xact_lock(hashtext(");
const member = attach.indexOf('trx.selectFrom("series_entries").where("work_id", "=", workId)');
const last = attach.indexOf('.orderBy("position", "desc")');
const write = attach.indexOf('.insertInto("series_entries")');
assert(attach.includes("db.transaction().execute(async (trx) =>") && lock > 0 && lock < member && member < last && last < write, "membership and the last position are read, and the episode attached, in one turn per series");
assert(!/await db\s*\.insertInto/.test(attach) && !attach.includes("getSeriesEntryForWork(workId)"), "on that transaction, not on another connection");
assert(attach.includes('clash.code === "23505"') && attach.includes("Kedudukan episod ini sudah digunakan dalam Siri ini.") && attach.includes("Work ini sudah menjadi ahli sebuah Siri."), "a clash that still reaches the database is said in Malay");

const route = read("src/app/api/admin/series/[id]/entries/route.ts");
const message = 'Hanya Work type=bersiri boleh disertai Siri (sekarang: "cerpen").';
assert(attach.includes("Hanya Work type=bersiri boleh disertai Siri") && route.includes('message.includes("Hanya")') && message.includes("Hanya") && !message.includes("hanya"), "a work that is not an episode is the editor's mistake (400), not a server failure");
assert(route.includes('message.includes("sudah menjadi")') && route.includes('message.includes("sudah digunakan")'), "and both clashes are answered as such too");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
