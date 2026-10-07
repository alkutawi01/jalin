/**
 * An editor who chose an address another contributor or work already has was answered in English, in a Malay admin:
 * 'Slug "x" already exists.' (the forms show the server's words as they are, and call the field "Alamat pautan").
 * A contributor that no longer exists was answered as a server failure (500).
 */
import fs from "node:fs";
import path from "node:path";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}
const read = (p: string) => fs.readFileSync(path.join(__dirname, "..", p), "utf8").replace(/\r\n/g, "\n");

const services = ["src/lib/admin/contributor-service.ts", "src/lib/admin/work-service.ts", "src/lib/admin/import/import-service.ts"];
for (const file of services) {
  const source = read(file);
  assert(!/throw new Error\([^)]*already exists/.test(source) && source.includes('" sudah digunakan. Pilih alamat lain.`'), `${path.basename(file)}: an address already taken is said in Malay`);
}

const routes = [
  "src/app/api/admin/contributors/route.ts",
  "src/app/api/admin/contributors/[slug]/route.ts",
  "src/app/api/admin/works/route.ts",
  "src/app/api/admin/works/[id]/route.ts",
  "src/app/api/admin/works/import/route.ts",
];
for (const file of routes) {
  assert(/message\.includes\("sudah digunakan"\)\s*\?\s*409/.test(read(file)), `${file.replace("src/app/api/admin/", "")}: and is still answered 409`);
}

// "Alamat pautan … sudah digunakan" (409) is read before the plain "Alamat pautan …" (400), and a missing contributor is 404.
for (const file of routes.slice(0, 2)) {
  const source = read(file);
  const taken = source.indexOf('message.includes("sudah digunakan")');
  const missing = source.indexOf('message.includes("tidak ditemui") ? 404');
  const invalid = source.indexOf('message.startsWith("Alamat pautan") ? 400');
  assert(taken > 0 && taken < missing && missing < invalid, `${file.replace("src/app/api/admin/", "")}: taken 409, missing 404, invalid 400, in that order`);
}

const contributors = read("src/lib/admin/contributor-service.ts");
const start = contributors.indexOf("export async function createContributor");
const create = contributors.slice(start, contributors.indexOf("export async function", start + 10));
assert(create.includes('.code === "23505"'), "the same address saved twice at the same moment is told the same thing, not the database's words");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
