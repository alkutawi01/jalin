/**
 * The per-tab "Bantuan chatbot" copied a prompt and never said where the answer goes (there was no paste box in the tab). The Watak & latar tab
 * now has both buttons itself (1. Salin arahan, 2. Tampal & isi) and says what they fill; the other tabs say the answer is advice only.
 */
import fs from "node:fs";
import path from "node:path";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}
const page = fs.readFileSync(path.join(__dirname, "../src/app/admin/works/[id]/page.tsx"), "utf8").replace(/\r\n/g, "\n");
assert(page.includes('id="chatbot-fill"'), "the box at the top keeps its anchor");
assert(
  page.includes("copyFillPrompt(activeTab as WorkFillScope)") && page.includes("pasteFillFromClipboard(activeTab as WorkFillScope)"),
  "per-tab copy and paste carry the tab's scope"
);
assert(page.includes("Bahagian tab lain dalam jawapan dilangkau") && page.includes("reviewFillAnswer(fillAnswer, fillScope)"), "the destination is explicit and other tabs are ignored");
assert(page.includes("tiada tempat untuk menampalnya"), "other tabs say the answer is advice only");
console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
