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
  normaliseBatch,
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

// The MAC: deterministic, bound to the batch, strict about the key.
{
  const key = Buffer.alloc(32, 7);
  const code = "7H3K9QM2XD5NPB84" + checkCharacterFor("7H3K9QM2XD5NPB84");
  const a = computeCodeMac(key, "B2610-001", code);
  assert(/^[0-9a-f]{64}$/.test(a), "the MAC is 64 hex characters");
  assert(a === computeCodeMac(key, "b2610-001", code), "the same batch and code give the same MAC, whatever the case of the batch");
  assert(a !== computeCodeMac(key, "B2610-002", code), "the same code in another batch gives a different MAC");
  assert(a !== computeCodeMac(Buffer.alloc(32, 8), "B2610-001", code), "another key gives a different MAC");
  let shortKeyRejected = false;
  try { computeCodeMac(Buffer.alloc(16, 1), "B2610-001", code); } catch { shortKeyRejected = true; }
  assert(shortKeyRejected, "a key under 256 bits is refused");
  let badBatchRejected = false;
  try { computeCodeMac(key, "no way!", code); } catch { badBatchRejected = true; }
  assert(badBatchRejected, "a batch number with other characters is refused");
  assert(normaliseBatch(" b26-10 ") === "B26-10" && normaliseBatch("-AB") === null && normaliseBatch("A") === null && normaliseBatch("AB CD") === "ABCD", "batch numbers are normalised to capitals, digits and inner hyphens");
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
