import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { TRIAL_DAYS } from "../src/lib/subscription/periods";
import { CODE_ALPHABET, normaliseCodeInput } from "../src/lib/subscription/redeem-code";

const root = path.join(__dirname, "..");
const read = (p: string) => fs.readFileSync(path.join(root, p), "utf8").replace(/\r\n/g, "\n");
const faq = read("src/app/soalanlazim/page.tsx");
const form = read("src/components/reader/RedeemForm.tsx");

// the FAQ exists only when accounts are on, like /tebus and /akaun
assert.ok(faq.includes("if (!readerAccountsEnabled()) notFound();"), "the FAQ page does not exist while reader accounts are off");

// what the FAQ says about the trial and about typing a code is what the code does
assert.ok(faq.includes(`${TRIAL_DAYS} hari`), "the FAQ names the trial length the code uses");
assert.ok(!CODE_ALPHABET.includes("U") && faq.includes("Kod tidak mengandungi huruf U"), "the FAQ says a code has no letter U, and it does not");
const canonical = "0123456789ABCDEFG"; // shape only; the check character is not needed to test the cleaning
const cleaned = (s: string) => normaliseCodeInput(s);
assert.equal(cleaned("").ok, false, "an empty code is refused");
// O reads as 0, I and L as 1, case and separators are ignored: a code typed in any of these ways is the same code
const sample = "0000-0000-0000-0000-0";
const loose = "oooo oooo oooo oooo o";
assert.deepEqual(normaliseCodeInput(sample), normaliseCodeInput(loose), "O is read as 0, case and spaces do not matter (as the FAQ says)");
const withIL = normaliseCodeInput("1111-1111-1111-1111-1");
const typedIL = normaliseCodeInput("iiii-llll-iiii-llll-i");
assert.deepEqual(withIL, typedIL, "I and L are read as 1 (as the FAQ says)");
void canonical;

// the card wording on the virtual card is Izzat's own (his SVG), with only the names and the batch number changed
for (const phrase of [
  "Daftar atau log masuk ke akaun Jalin",
  "Masukkan nombor siri dan kod",
  "Langganan diaktifkan selepas penebusan berjaya",
  "Kod hanya boleh ditebus sekali.",
  "Tempoh langganan bermula sebaik kod berjaya ditebus.",
  "Simpan kad ini di tempat selamat.",
  "Jika terdapat sebarang masalah berkaitan langganan dan penebusan, sila hubungi",
  "jalin.adjung.com/soalanlazim"
]) assert.ok(form.includes(phrase), `the virtual card keeps the card's wording: ${phrase}`);
console.log("soalan-lazim: ok");
