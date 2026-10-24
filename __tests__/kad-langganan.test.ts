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
// the virtual card on the redeem page: the code goes where the scratch sticker is, and a code from e-mail needs no batch number
const form = read("src/components/reader/RedeemForm.tsx");
assert.ok(form.includes("vcard-codebox") && form.includes('id="redeem-code"'), "the code box stands on the virtual card");
assert.ok(!/Kikis untuk lihat kod/i.test(form), "the virtual card has no scratch-to-see-the-code area: the code is typed there");
assert.ok(form.includes("physical && !looksShared") && form.includes('batch: looksShared || !physical ? "" : batch'), "the batch number is asked for (and sent) only for a physical card");
assert.ok(form.includes("Saya ada kad fizikal"), "a reader with a printed card can add the batch number");
assert.ok(form.includes("if (!physical && !looksShared) setPhysical(true)"), "a refused card code opens the batch box");
// the generator keeps the legal line and the company number of the other sites
const gen = read("scripts/kad/jana-kad.mjs");
assert.ok(gen.includes("Adjung Press Platform (202603277981 (PG0594995-P))"), "the card carries the SSM line");
assert.ok(gen.includes("editorial@adjung.com") && gen.includes("jalin.adjung.com/tebus"), "the card gives the support address and the redeem address");
console.log("kad-langganan: ok");
