/**
 * "Rafiq Naim" had two public pages with the same words (/penulis/chatgpt and /penulis/rafiq-naim), both in the sitemap, each
 * naming itself as the canonical page, and bylines split between them. An older pen-name address now shows the editor's record
 * and names that record's address as the one page for the author (as /penulis/nara-zahin already showed the record "claude").
 */
import fs from "node:fs";
import path from "node:path";
import { EDITOR_RECORD, authorSlug, isAuthorAlias } from "../src/lib/reader/author-alias";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}
const read = (p: string) => fs.readFileSync(path.join(__dirname, "..", p), "utf8").replace(/\r\n/g, "\n");

assert(EDITOR_RECORD["nara-zahin"] === "claude" && EDITOR_RECORD["rafiq-naim"] === "chatgpt", "the two pen-name addresses and the records they show");
assert(authorSlug("rafiq-naim") === "chatgpt" && authorSlug("nara-zahin") === "claude" && authorSlug("chatgpt") === "chatgpt" && authorSlug("mimo") === "mimo", "an older address gives the record's address; any other slug is its own");
assert(isAuthorAlias("rafiq-naim") && isAuthorAlias("nara-zahin") && !isAuthorAlias("chatgpt") && !isAuthorAlias("claude") && !isAuthorAlias("toString"), "only the older addresses are aliases");

const page = read("src/app/penulis/[slug]/page.tsx");
assert(page.includes('.where("slug", "in", [slug, authorSlug(slug)])') && !page.includes("EDITOR_RECORD[slug]"), "the older address still opens (it shows the editor's record)");
assert(authorSlug("constructor") === "constructor" && authorSlug("toString") === "toString" && authorSlug("__proto__") === "__proto__", "an address named like a built-in (constructor, toString) is only itself, never a function handed to the database");
assert(page.includes("alternates: { canonical: address }") && page.includes("authorSlug(slug)") && page.includes("url: address"), "and names the record's address as canonical and as its share address");
assert(page.includes('process.env.CONTENT_SOURCE === "database" && hasDb() ? authorSlug(slug) : slug'), "only where the record exists (the database); the markdown site keeps its own addresses");
assert(read("src/app/sitemap.ts").includes(".filter((slug) => !isAuthorAlias(slug))"), "the sitemap lists one page for an author, not the older address beside it");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
