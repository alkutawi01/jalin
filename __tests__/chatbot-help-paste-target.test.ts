/**
 * The per-tab "Bantuan chatbot" copied a prompt and never said where the answer goes (there is no paste box in the tab). It now says: for
 * characters, the "Isi maklumat dengan chatbot" box at the top (Tampal & isi), with a link; places have no chatbot import; other tabs: the
 * answer is advice only.
 */
import fs from "node:fs";
import path from "node:path";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}
const page = fs.readFileSync(path.join(__dirname, "../src/app/admin/works/[id]/page.tsx"), "utf8").replace(/\r\n/g, "\n");
assert(page.includes('id="chatbot-fill"') && page.includes('href="#chatbot-fill"') && page.includes('getElementById("chatbot-fill")'), "the paste box has an anchor and the characters tab links to it");
assert(page.includes("Latar tempat:") && page.includes("belum ada import daripada chatbot"), "it says honestly that places have no chatbot import");
assert(page.includes("tiada tempat untuk menampalnya"), "other tabs say the answer is advice only");
console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
