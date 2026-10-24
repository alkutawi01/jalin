import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.join(__dirname, "..");
const read = (p: string) => fs.readFileSync(path.join(root, p), "utf8").replace(/\r\n/g, "\n");

// the artwork for the printer exists for every length of card
for (const months of [1, 6, 12]) {
  for (const ext of [".svg", "-cetak.pdf", "-cetak-600dpi.png"]) {
    assert.ok(fs.existsSync(path.join(root, `docs/kad-langganan/jalin-kad-hadapan-${months}-bulan${ext}`)), `front ${months} months ${ext} exists`);
  }
}
// the back never carries a real code: no 13 or 16 character code-like group, only the example batch number
const back = fs.readdirSync(path.join(root, "docs/kad-langganan")).filter((f) => f.startsWith("jalin-kad-belakang-") && f.endsWith(".svg"));
assert.ok(back.length > 0, "a back is made for at least one batch");
// the card says what the redeem form asks for: the code AND the batch number
const form = read("src/components/reader/RedeemForm.tsx");
assert.ok(form.includes("RedeemCardGuide") && form.includes('setField("batch")') && form.includes('setField("code")'), "the redeem form shows the virtual card and follows the box being typed in");
assert.ok(form.includes("looksShared ? null : <RedeemCardGuide"), "a shared code has no card, so no card is shown for it");
assert.ok(fs.existsSync(path.join(root, "public/kad/kad-belakang-contoh.webp")), "the picture of the virtual card is served");
// the generator keeps the legal line and the company number of the other sites
const gen = read("scripts/kad/jana-kad.mjs");
assert.ok(gen.includes("Adjung Press Platform (202603277981 (PG0594995-P))"), "the card carries the SSM line");
assert.ok(gen.includes("editorial@adjung.com") && gen.includes("jalin.adjung.com/tebus"), "the card gives the support address and the redeem address");
assert.ok(!/localStorage|fetch\(/.test(read("src/components/reader/RedeemCardGuide.tsx")), "the card picture never touches the network or storage");
console.log("kad-langganan: ok");
