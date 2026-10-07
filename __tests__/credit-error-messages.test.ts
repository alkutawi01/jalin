/**
 * The credits tab shows the server's words as they are. Reordering credits after one was added or deleted in another tab said
 * "Expected 3 credit IDs, received 2." (English, in a Malay admin) and was answered as a server failure (500); so was choosing a
 * contributor that had since been removed ('Contributor "x" not found.').
 */
import fs from "node:fs";
import path from "node:path";
import { creditErrorStatus } from "../src/lib/admin/metadata-rules";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}
const read = (p: string) => fs.readFileSync(path.join(__dirname, "..", p), "utf8").replace(/\r\n/g, "\n");

const service = read("src/lib/admin/credit-service.ts");
const thrown = [...service.matchAll(/throw new (?:Error|DuplicateCreditError)\((["`])(.*?)\1/g)].map((m) => m[2]!);
const english = thrown.filter((message) => /\b(not found|Expected|mismatch|Must provide|Cannot provide|received)\b/.test(message));
assert(thrown.length >= 8 && english.filter((m) => !/after (creation|update)|Failed to create/.test(m)).length === 0, "what an editor can cause is said in Malay");

const changed = thrown.find((m) => m.includes("telah berubah")) ?? "";
const gone = thrown.find((m) => m.startsWith("Penyumbang \"")) ?? "";
assert(creditErrorStatus(new Error(changed)) === 409 && changed.includes("Muat semula halaman"), "a credit list that changed elsewhere: 409, and the editor is told to reload");
assert(creditErrorStatus(new Error(gone.replace("${input.contributorSlug}", "x"))) === 404, "a contributor that is gone: 404");
assert(creditErrorStatus(new Error("Pilih penyumbang atau isi nama tetamu.")) === 400 && creditErrorStatus(new Error("Pilih penyumbang atau nama tetamu, bukan kedua-duanya.")) === 400, "neither or both of contributor and guest: 400");
assert(creditErrorStatus(new Error("connection terminated")) === 500 && creditErrorStatus("x") === 500, "anything else is still a server failure");

const list = read("src/app/api/admin/credits/route.ts");
const one = read("src/app/api/admin/credits/[id]/route.ts");
assert((list.match(/\{ status: creditErrorStatus\(error\) \}/g) ?? []).length === 2 && (one.match(/\{ status: creditErrorStatus\(error\) \}/g) ?? []).length === 1, "adding, reordering and changing a credit all answer that way");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
