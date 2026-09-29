// Regenerates src/lib/admin/import/master-parser-prompt.ts from the fenced
// prompt block in docs/JALIN_MASTER_CONTENT_PARSER_PROMPT.md.
import fs from "node:fs";

const DOC = "docs/JALIN_MASTER_CONTENT_PARSER_PROMPT.md";
const OUT = "src/lib/admin/import/master-parser-prompt.ts";

const md = fs.readFileSync(DOC, "utf8").replace(/\r\n/g, "\n");
const match = md.match(/````text\n([\s\S]*?)\n````/);
if (!match) throw new Error("Prompt block (````text) not found in " + DOC);
const prompt = match[1];

const escaped = prompt
  .replace(/\\/g, "\\\\")
  .replace(/`/g, "\\`")
  .replace(/\$\{/g, "\\${");

const version = (md.match(/\*\*Versi\*\* \| (v\d+)/) ?? [])[1] ?? "unknown";

const out = `/**
 * Jalin Master Content Parser prompt.
 *
 * Shown in /admin/works/import. The same text lives in ${DOC};
 * __tests__/master-parser-prompt.test.ts fails if the two drift apart.
 * Regenerate with: node scripts/sync-master-parser-prompt.mjs
 * Change the prompt only as a new version.
 */

export const MASTER_PARSER_PROMPT_VERSION = "${version}";

export const MASTER_PARSER_PROMPT = \`${escaped}\`;
`;

fs.mkdirSync("src/lib/admin/import", { recursive: true });
fs.writeFileSync(OUT, out);
console.log(`wrote ${OUT} (${prompt.length} chars, ${version})`);
