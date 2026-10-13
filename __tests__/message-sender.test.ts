import { splitMessageSender } from "../src/lib/reader/message-sender";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  \u2713 ${msg}`); } else { failed++; console.error(`  \u2717 ${msg}`); }
}

const a = splitMessageSender("danishgrid15: kau buat apa ni");
assert(a?.sender === "danishgrid15" && a.rest === " kau buat apa ni", "a one word name before the colon is the sender");
const b = splitMessageSender("Mak Cik: dah makan?");
assert(b?.sender === "Mak Cik" && b.rest === " dah makan?", "two words are one name");
assert(splitMessageSender("Saya tidak tahu apa yang berlaku: dia pergi") === null, "a sentence that happens to have a colon later is not a sender");
assert(splitMessageSender("jam 10:30 malam") === null, "a time is not a sender");
assert(splitMessageSender("kotakKosong:") !== null, "a name at the end of a line counts");
assert(splitMessageSender("http://contoh.my") === null, "an address is not a sender");

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
