/**
 * Audit finding: /tentang, /privasi and /terma had their own title and canonical but inherited the layout's openGraph, so a shared link
 * showed the HOME page's title, description and og:url. Each page now carries its own.
 */
import fs from "node:fs";
import path from "node:path";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}
for (const page of ["tentang", "privasi", "terma"]) {
  const src = fs.readFileSync(path.join(__dirname, `../src/app/${page}/page.tsx`), "utf8").replace(/\r\n/g, "\n");
  const title = /title: "([^"]+)",\n  description: "([^"]+)"/.exec(src);
  assert(Boolean(title) && src.includes(`openGraph: { type: "website", siteName: "Jalin — oleh Adjung", title: "${title![1]}", description: "${title![2]}", url: "/${page}"`), `/${page}: og title, description and url are its own`);
  assert(Boolean(title) && src.includes(`twitter: { card: "summary_large_image", title: "${title![1]}", description: "${title![2]}" }`), `/${page}: twitter title and description are its own`);
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
