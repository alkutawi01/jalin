/**
 * When the connection drops in the middle of a save, the browser throws in its own English words ("Failed to fetch",
 * "NetworkError when attempting to fetch resource.", "Load failed"), and the admin forms showed them as they were.
 */
import fs from "node:fs";
import path from "node:path";
import { NO_CONNECTION, errorText } from "../src/lib/admin/error-text";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string, detail?: unknown) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`, detail ?? ""); }
}

for (const words of ["Failed to fetch", "NetworkError when attempting to fetch resource.", "Load failed", "Network request failed", "The network connection was lost."]) {
  assert(errorText(new TypeError(words)) === NO_CONNECTION, `"${words}" is said in Malay`);
}
assert(NO_CONNECTION.startsWith("Tidak dapat berhubung dengan pelayan.") && NO_CONNECTION.includes("cuba lagi"), "with what to do next");
assert(errorText(new Error("Alamat pautan ini sudah digunakan.")) === "Alamat pautan ini sudah digunakan.", "the server's own message is kept");
assert(errorText("x") === "Ralat tidak diketahui." && errorText(null, "Gagal menyalin arahan.") === "Gagal menyalin arahan." && errorText(new Error(""), "Gagal.") === "Gagal.", "something that is not an error, or has no words, gets the form's fallback");

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else if (entry.name.endsWith(".tsx")) out.push(p);
  }
  return out;
}
const root = path.join(__dirname, "..", "src");
const raw: string[] = [];
let uses = 0;
for (const file of [...walk(path.join(root, "app", "admin")), ...walk(path.join(root, "components", "admin"))]) {
  const source = fs.readFileSync(file, "utf8");
  if (/\b(\w+) instanceof Error \? \1\.message :/.test(source)) raw.push(path.relative(root, file));
  uses += (source.match(/errorText\(/g) ?? []).length;
}
assert(raw.length === 0, "no admin form shows an error's own words without going through errorText", raw);
assert(uses >= 70, `the forms use it (${uses} places)`);

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
