/**
 * When the host itself answers (a request too large, a time-out), the answer is plain text or HTML, not Jalin's JSON. The forms
 * read the answer as JSON to find the server's message, so the editor was shown the browser's own English error
 * ("Unexpected token '<' … is not valid JSON") instead of the form's "Gagal …" message. An error answer that is not JSON now
 * falls back to the form's own message.
 */
import fs from "node:fs";
import path from "node:path";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string, detail?: unknown) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`, detail ?? ""); }
}
function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else if (entry.name.endsWith(".tsx")) out.push(p);
  }
  return out;
}
const root = path.join(__dirname, "..", "src");
const files = [...walk(path.join(root, "app", "admin")), ...walk(path.join(root, "components", "admin"))];

const unguarded: string[] = [];
let guarded = 0;
for (const file of files) {
  const source = fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n");
  // The answer is read, and the very next line throws its "error" or judges "ok": that read must survive a non-JSON answer.
  for (const match of source.matchAll(/const (\w+) = await (\w+)\.json\(\)(\.catch\(\(\) => \(\{\}\)\))?;\n\s*(?:throw new Error\(\1\.error|if \(!\2\.ok\))/g)) {
    if (match[3]) guarded++;
    else unguarded.push(`${path.relative(root, file)}: ${match[0].split("\n")[0]}`);
  }
}
assert(unguarded.length === 0, "every error answer is read in a way that survives plain text or HTML", unguarded);
assert(guarded >= 50, `the forms fall back to their own message (${guarded} places)`);

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
