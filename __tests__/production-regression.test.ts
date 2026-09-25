import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { getContributorDisplay } from "../src/lib/content/contributors";

const root = process.cwd();
const worksDir = path.join(root, "content", "works");
const categories = ["cerpen", "novela", "bersiri", "fragmen", "sinopsis"];

for (const file of fs.readdirSync(worksDir).filter((name) => name.endsWith(".md"))) {
  const { data } = matter(fs.readFileSync(path.join(worksDir, file), "utf8"));
  for (const visual of data.visuals ?? []) {
    assert.equal(typeof visual.src, "string", `${file}: visual src must be a string`);
    assert.ok(visual.src.trim().length > 0, `${file}: missing visual src`);
    if (String(visual.provider ?? "").toLowerCase() === "magnific") {
      assert.ok(visual.creationId, `${file}: Magnific visual must preserve creationId`);
    }
  }
}

assert.equal(getContributorDisplay("chatgpt").name, "Rafiq Naim");
assert.equal(getContributorDisplay("mimo").name, "Amir Syafiq");
assert.equal(getContributorDisplay("rafiq-naim").name, "Rafiq Naim");
assert.notEqual(getContributorDisplay("unknown-internal-slug").name, "unknown-internal-slug");

const categoryPage = fs.readFileSync(path.join(root, "src/app/kategori/[type]/page.tsx"), "utf8");
for (const category of categories) {
  assert.ok(categoryPage.includes(`${category}:`), `category route metadata missing: ${category}`);
}
assert.ok(categoryPage.includes("Belum ada karya diterbitkan dalam kategori ini."), "empty category state missing");

console.log("production regression tests: PASS");
