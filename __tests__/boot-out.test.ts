/**
 * The loading screen must never cover a page for good (10 Oct 2026: /log-masuk, /akaun, /tebus and /mula with accounts off answered 404,
 * but React rebuilt the page on the client, gave the loading screen its first class again, and the inline script had already run).
 */
import fs from "node:fs";
import path from "node:path";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}
const read = (p: string) => fs.readFileSync(path.join(__dirname, "..", p), "utf8").replace(/\r\n/g, "\n");

const boot = read("src/components/reader/BootScreen.tsx");
const out = read("src/components/reader/BootOut.tsx");
assert(boot.includes("<BootOut />"), "the loading screen mounts the client component that lets it go after hydration");
assert(out.startsWith('"use client"') && out.includes('classList.add("boot-out")') && out.includes("boot-screen"), "that component adds boot-out to the screen as it is after React has rendered");
for (const p of ["src/app/log-masuk/page.tsx", "src/app/akaun/page.tsx", "src/app/tebus/page.tsx", "src/app/mula/page.tsx"]) {
  const s = read(p);
  assert(s.includes("accountsPageMetadata") && !/export const metadata/.test(s), `${p}: the title is the 404 title when accounts are off`);
}
const { accountsPageMetadata } = require("../src/lib/reader-auth/enabled");
assert(accountsPageMetadata({ title: "X" }, { READER_ACCOUNTS_ENABLED: "yes" }).title === "X", "metadata is kept when accounts are on");
assert(accountsPageMetadata({ title: "X" }, {}).title === "Halaman tidak ditemui", "metadata is the 404 title when accounts are off");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
