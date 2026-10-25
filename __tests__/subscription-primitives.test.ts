/**
 * Redeem code and subscription date primitives. The check character is chosen by exhaustive test, not by assumption: every
 * single-character error and every swap of two different adjacent characters must be caught.
 */
import {
  CODE_ALPHABET,
  checkCharacterFor,
  computeCodeMac,
  formatCode,
  generateCanonicalCode,
  generateCodeBody,
  channelOfSerial,
  formatSerial,
  mmyyFor,
  mmyyFromMonthInput,
  normaliseSerial,
  redeemByFromDateInput,
  redeemByLabel,
  redeemByLastDayInput,
  serialGroup,
  serialPrefix,
  virtualRedeemBy,
  normaliseCodeInput,
} from "../src/lib/subscription/redeem-code";
import { addMonthsMYT, formatEndMYT, isActiveAt, redemptionPeriod, trialPeriod } from "../src/lib/subscription/periods";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string, detail?: unknown) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`, detail ?? ""); }
}

const valid = (code: string) => normaliseCodeInput(code).ok;

// Exhaustive on every 3-character body: the weak spot of a check scheme shows up on short strings too.
{
  let accepted = 0;
  let missedSubstitution = 0;
  let missedSwap = 0;
  for (let a = 0; a < 32; a++) for (let b = 0; b < 32; b++) for (let c = 0; c < 32; c++) {
    // The code length is fixed at 16, so test the scheme on a padded body: three varying characters, thirteen fixed.
    const body = CODE_ALPHABET[a] + CODE_ALPHABET[b] + CODE_ALPHABET[c] + "0123456789ABC";
    const code = body + checkCharacterFor(body);
    if (valid(code)) accepted++;
    for (let i = 0; i < code.length; i++) {
      for (const ch of CODE_ALPHABET) {
        if (ch === code[i]) continue;
        if (valid(code.slice(0, i) + ch + code.slice(i + 1))) missedSubstitution++;
      }
      if (i + 1 < code.length && code[i] !== code[i + 1]) {
        if (valid(code.slice(0, i) + code[i + 1] + code[i] + code.slice(i + 2))) missedSwap++;
      }
    }
  }
  assert(accepted === 32768, "every code with its own check character is accepted (32,768 bodies)", accepted);
  assert(missedSubstitution === 0, "no single-character substitution goes unnoticed", missedSubstitution);
  assert(missedSwap === 0, "no swap of two different adjacent characters goes unnoticed", missedSwap);
}

// Random full-length codes.
{
  let bad = 0;
  for (let n = 0; n < 3000; n++) {
    const code = generateCanonicalCode();
    if (code.length !== 17 || !valid(code)) bad++;
    for (let i = 0; i < code.length; i++) {
      for (const ch of CODE_ALPHABET) if (ch !== code[i] && valid(code.slice(0, i) + ch + code.slice(i + 1))) bad++;
      if (i + 1 < code.length && code[i] !== code[i + 1] && valid(code.slice(0, i) + code[i + 1] + code[i] + code.slice(i + 2))) bad++;
    }
  }
  assert(bad === 0, "3,000 random codes: valid, 17 characters, every single error and adjacent swap caught", bad);
}

// Generation is random and uses the whole alphabet.
{
  const seen = new Set<string>();
  const counts = new Map<string, number>();
  for (let n = 0; n < 4000; n++) {
    const body = generateCodeBody();
    seen.add(body);
    for (const ch of body) counts.set(ch, (counts.get(ch) ?? 0) + 1);
  }
  const values = [...counts.values()];
  const expected = (4000 * 16) / 32;
  assert(seen.size === 4000, "4,000 generated bodies are all different");
  assert(counts.size === 32 && values.every((v) => v > expected * 0.9 && v < expected * 1.1), "every character of the alphabet appears about equally often", [counts.size, Math.min(...values), Math.max(...values)]);
  assert(![...counts.keys()].some((c) => "ILOU".includes(c)), "I, L, O and U are never generated");
}

// Typed input and display.
{
  const body = "7H3K9QM2XD5NPB84";
  const canonical = body + checkCharacterFor(body);
  const shown = formatCode(canonical);
  assert(/^[0-9A-Z]{4}(-[0-9A-Z]{4}){3}-[0-9A-Z]$/.test(shown) && shown.replace(/-/g, "") === canonical, "display form is four groups of four, a hyphen and the check character", shown);
  const looser = shown.toLowerCase().replace(/-/g, " ");
  const result = normaliseCodeInput(`  ${looser}  `);
  assert(result.ok && result.canonical === canonical, "lower case, spaces and hyphens are ignored");
  const withO = normaliseCodeInput(canonical.replace(/0/g, "O").replace(/1/g, "l"));
  assert(withO.ok, "a zero typed as O and a one typed as l or I is read as intended");
  assert(JSON.stringify(normaliseCodeInput("")) === JSON.stringify({ ok: false, reason: "empty" }), "empty input is reported as empty");
  assert(normaliseCodeInput("ABC").ok === false && (normaliseCodeInput("ABC") as { reason: string }).reason === "length", "short input is reported as the wrong length");
  assert((normaliseCodeInput("U".repeat(17)) as { reason: string }).reason === "alphabet", "a character outside the alphabet is reported");
  const wrongLast = canonical.slice(0, 16) + (canonical[16] === "0" ? "1" : "0");
  assert((normaliseCodeInput(wrongLast) as { reason: string }).reason === "check", "a wrong check character is reported");
}

// The serial number of a card: JLN-12B0126-F01 (Jalin, length, month and year of issue, F or M, own number).
{
  assert(serialPrefix(12, "0126") === "JLN-12B0126-F" && serialPrefix(6, "1026", "physical") === "JLN-06B1026-F" && serialPrefix(1, "0327", "virtual") === "JLN-01B0327-M", "the prefix is Jalin, the length as 01B, 06B or 12B, MMYY, and F (physical) or M (virtual)");
  let badLength = false; try { serialPrefix(3 as 1, "0126"); } catch { badLength = true; }
  let badMonth = false; try { serialPrefix(12, "1326"); } catch { badMonth = true; }
  assert(badLength && badMonth, "a length other than 1, 6, 12 and a month other than 01 to 12 are refused");
  assert(formatSerial("JLN-12B0126-F", 1) === "JLN-12B0126-F01" && formatSerial("JLN-12B0126-M", 100, 3) === "JLN-12B0126-M100", "the card's own number follows the letter, at least two digits");
  assert(serialGroup("JLN-12B0126-F01") === "JLN-12B0126-F" && serialGroup("JLN-12B0126-M1234") === "JLN-12B0126-M", "the group is everything before the card's own number");
  assert(channelOfSerial("JLN-12B0126-F01") === "physical" && channelOfSerial("jln-12b0126-m07") === "virtual" && channelOfSerial("JLN-12B0126-01") === null, "F is physical, M is virtual, and a serial without a letter is neither");
  assert(normaliseSerial(" jln-12b0126-f01 ") === "JLN-12B0126-F01" && normaliseSerial("JLN\u201312B0126\u2014M01") === "JLN-12B0126-M01" && normaliseSerial("JLN_12B0126_F01") === null, "a serial is read in any case and with the long dashes some phones type");
  assert(normaliseSerial("JLN-12B0126 -F01") === "JLN-12B0126-F01", "spaces are ignored");
  for (const bad of ["", "JLN-12B0126", "JLN-12B0126-01", "JLN-12B0126-F1", "JLN-12B0126-X01", "JLN-3B0126-F01", "JLN-12B1326-F01", "JLN-12B0026-F01", "JLN-12B0126-F123456", "SUS-12B0126-F01", "JLN-12B0126-F01-02"]) {
    assert(normaliseSerial(bad) === null, `not a serial: ${JSON.stringify(bad)}`);
  }
  assert(mmyyFromMonthInput("2026-10") === "1026" && mmyyFromMonthInput("2027-01") === "0127" && mmyyFromMonthInput("2026-13") === null && mmyyFromMonthInput("10/2026") === null, "the month input of the admin becomes MMYY");
  assert(mmyyFor(new Date(Date.UTC(2026, 9, 31, 17, 0))) === "1126" && mmyyFor(new Date(Date.UTC(2026, 9, 31, 15, 59))) === "1026", "the month is the Malaysian month (UTC+8), so the last evening of October in Malaysia is still October");
}

// The last day a code can be redeemed ("TEBUS SEBELUM"): the stored value is the start of the NEXT day, Malaysian time, so the whole last day counts.
{
  const end = redeemByFromDateInput("2027-12-31")!;
  assert(end.toISOString() === "2027-12-31T16:00:00.000Z", "the last day 31 Dec 2027 is stored as 1 Jan 2028 00:00 Malaysian time (16:00 UTC the evening before)");
  assert(redeemByLabel(end) === "31 DIS 2027" && redeemByLastDayInput(end) === "2027-12-31", "and is shown as the last day again, in Malay on the label and as a date input");
  assert(new Date("2027-12-31T15:59:59.999Z").getTime() < end.getTime() && new Date("2027-12-31T16:00:00.000Z").getTime() >= end.getTime(), "a redemption at 23:59 on the last day (Malaysian time) is in time, and one at midnight is late");
  assert(redeemByFromDateInput("2027-02-30") === null && redeemByFromDateInput("31/12/2027") === null && redeemByFromDateInput("") === null, "dates that do not exist or are written another way are refused");
  assert(redeemByLabel(redeemByFromDateInput("2027-03-01")!) === "1 MAC 2027" && redeemByLabel(redeemByFromDateInput("2027-05-09")!) === "9 MEI 2027" && redeemByLabel(redeemByFromDateInput("2027-08-15")!) === "15 OGO 2027", "Malay month names (MAC, MEI, OGO)");
  const made = new Date("2026-10-25T04:00:00.000Z"); // 12:00 on 25 Oct 2026, Malaysian time
  assert(redeemByLastDayInput(virtualRedeemBy(made)) === "2027-10-25", "a virtual code made on 25 Oct 2026 can be redeemed up to and including 25 Oct 2027");
  assert(redeemByLastDayInput(virtualRedeemBy(new Date("2028-02-29T04:00:00.000Z"))) === "2029-02-28", "a virtual code made on 29 Feb falls back to 28 Feb next year");
  assert(redeemByLastDayInput(virtualRedeemBy(new Date("2026-10-25T17:00:00.000Z"))) === "2027-10-26", "the day is the Malaysian one: 01:00 on 26 Oct there is still 26 Oct, so the year runs to 26 Oct 2027");
}

// The MAC: deterministic, bound to the serial, strict about the key.
{
  const key = Buffer.alloc(32, 7);
  const code = "7H3K9QM2XD5NPB84" + checkCharacterFor("7H3K9QM2XD5NPB84");
  const a = computeCodeMac(key, "JLN-12B0126-F01", code);
  assert(/^[0-9a-f]{64}$/.test(a), "the MAC is 64 hex characters");
  assert(a === computeCodeMac(key, "jln-12b0126-f01", code), "the same serial and code give the same MAC, whatever the case of the serial");
  assert(a !== computeCodeMac(key, "JLN-12B0126-F02", code), "the same code with another card's serial gives a different MAC");
  assert(a !== computeCodeMac(key, "JLN-06B0126-F01", code), "the same code with another length gives a different MAC");
  assert(a !== computeCodeMac(key, "JLN-12B0126-M01", code), "the same code with a virtual card of the same number gives a different MAC");
  assert(a !== computeCodeMac(Buffer.alloc(32, 8), "JLN-12B0126-F01", code), "another key gives a different MAC");
  let shortKeyRejected = false;
  try { computeCodeMac(Buffer.alloc(16, 1), "JLN-12B0126-F01", code); } catch { shortKeyRejected = true; }
  assert(shortKeyRejected, "a key under 256 bits is refused");
  let badSerialRejected = false;
  try { computeCodeMac(key, "no way!", code); } catch { badSerialRejected = true; }
  assert(badSerialRejected, "something that is not a serial number is refused");
}

// Dates, on the Malaysian clock. 31 January 2027 10:00 MYT is 02:00 UTC.
{
  const myt = (y: number, m: number, d: number, h = 10, min = 0) => new Date(Date.UTC(y, m - 1, d, h - 8, min));
  const same = (a: Date, b: Date) => a.getTime() === b.getTime();
  assert(same(addMonthsMYT(myt(2027, 1, 31), 1), myt(2027, 2, 28)), "31 Jan 2027 10:00 + 1 month = 28 Feb 2027 10:00");
  assert(same(addMonthsMYT(myt(2024, 2, 29), 12), myt(2025, 2, 28)), "29 Feb 2024 + 12 months = 28 Feb 2025");
  assert(same(addMonthsMYT(myt(2026, 8, 30), 6), myt(2027, 2, 28)), "30 Aug 2026 + 6 months = 28 Feb 2027");
  assert(same(addMonthsMYT(myt(2027, 8, 30), 6), myt(2028, 2, 29)), "30 Aug 2027 + 6 months = 29 Feb 2028 (leap year)");
  assert(same(addMonthsMYT(addMonthsMYT(myt(2027, 1, 31), 1), 1), myt(2027, 3, 28)), "stepwise 31 Jan + 1 + 1 months = 28 Mar, as the study says");
  assert(same(addMonthsMYT(myt(2026, 12, 15), 1), myt(2027, 1, 15)), "December rolls into the next year");
  assert(same(addMonthsMYT(myt(2026, 3, 1, 0, 30), 12), myt(2027, 3, 1, 0, 30)), "half past midnight in Malaysia keeps its Malaysian day (UTC is still the day before)");

  const trial = trialPeriod(myt(2026, 10, 9));
  assert(same(trial.endsAt, myt(2026, 10, 23)), "a trial registered on 9 Oct ends 23 Oct at the same time");
  assert(isActiveAt(trial, myt(2026, 10, 22, 23, 59)) && !isActiveAt(trial, myt(2026, 10, 23)) && !isActiveAt(trial, myt(2026, 10, 8, 23)), "a period includes its start and excludes its end");

  const now = myt(2026, 11, 1);
  const first = redemptionPeriod(now, null, 6);
  assert(same(first.startsAt, now) && same(first.endsAt, myt(2027, 5, 1)), "a first code starts now");
  const second = redemptionPeriod(now, first.endsAt, 12);
  assert(same(second.startsAt, first.endsAt) && same(second.endsAt, myt(2028, 5, 1)), "a second code starts when the first ends");
  const lapsed = redemptionPeriod(myt(2028, 6, 1), first.endsAt, 1);
  assert(same(lapsed.startsAt, myt(2028, 6, 1)), "a code redeemed after access ended starts now");
  let badPlanRejected = false;
  try { redemptionPeriod(now, null, 3 as 1); } catch { badPlanRejected = true; }
  assert(badPlanRejected, "a plan length other than 1, 6 or 12 is refused");
  assert(formatEndMYT(myt(2027, 2, 28)) === "28 Februari 2027, 10:00 pagi (MYT)", "end date shown in Malay with the Malaysian time", formatEndMYT(myt(2027, 2, 28)));
  assert(formatEndMYT(myt(2027, 5, 1, 0, 5)) === "1 Mei 2027, 12:05 pagi (MYT)" && formatEndMYT(myt(2027, 5, 1, 20, 0)) === "1 Mei 2027, 8:00 malam (MYT)", "midnight and evening read correctly");
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
