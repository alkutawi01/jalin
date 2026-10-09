/** Shared codes: generation, typed input, the redemption rules and the period a grant gives. */
import { normaliseCodeInput } from "../src/lib/subscription/redeem-code";
import { evaluateSharedRedemption, generateSharedCode, isValidSharedGrant, normaliseSharedCodeInput, sharedGrantPeriod, type SharedCodeState } from "../src/lib/subscription/shared-code";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string, detail?: unknown) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`, detail ?? ""); }
}

// Generation and input.
{
  let bad = 0;
  const seen = new Set<string>();
  for (let n = 0; n < 2000; n++) {
    const code = generateSharedCode();
    seen.add(code);
    if (!/^JLN-[0-9A-HJKMNP-TV-Z]{7}$/.test(code) || normaliseSharedCodeInput(code) !== code) bad++;
    // A single wrong character in the body or check position is caught.
    const body = code.slice(4);
    for (let i = 0; i < body.length; i++) {
      const wrong = body.slice(0, i) + (body[i] === "0" ? "1" : "0") + body.slice(i + 1);
      if (normaliseSharedCodeInput("JLN" + wrong) !== null) bad++;
    }
  }
  assert(bad === 0, "2,000 generated shared codes are well formed, accepted, and every single wrong character is refused", bad);
  assert(seen.size > 1990, "generated shared codes are different from each other", seen.size);
  const sample = generateSharedCode();
  assert(normaliseSharedCodeInput(` ${sample.toLowerCase().replace("-", " ")} `) === sample, "case, spaces and hyphens are ignored");
  const withLetters = sample.replace(/0/g, "O").replace(/1/g, "i");
  assert(normaliseSharedCodeInput(withLetters) === sample, "O is read as 0 and I as 1 after the prefix");
  assert(normaliseSharedCodeInput("XYZ-ABCDEFG") === null && normaliseSharedCodeInput("JLN-ABC") === null && normaliseSharedCodeInput("") === null, "other prefixes, short input and empty input are refused");
  assert(!normaliseCodeInput(sample).ok, "a shared code is never mistaken for a card code");
}

// Redemption rules.
{
  const now = new Date("2026-11-01T02:00:00Z");
  const base: SharedCodeState = { status: "active", redeemedCount: 0, maxRedemptions: 3, expiresAt: null };
  const reason = (state: SharedCodeState, already = false) => {
    const r = evaluateSharedRedemption(state, now, already);
    return r.ok ? "ok" : r.reason;
  };
  assert(reason(base) === "ok", "an active code with room is accepted");
  assert(reason({ ...base, redeemedCount: 2 }) === "ok", "the last place is accepted");
  assert(reason({ ...base, redeemedCount: 3 }) === "full", "a full code is refused");
  assert(reason({ ...base, redeemedCount: 4 }) === "full", "a count past the limit is still refused");
  assert(reason(base, true) === "already_redeemed", "an account cannot redeem the same code twice");
  assert(reason({ ...base, status: "paused" }) === "paused" && reason({ ...base, status: "revoked" }) === "revoked", "paused and revoked codes are refused");
  assert(reason({ ...base, expiresAt: new Date(now.getTime()) }) === "expired", "a code is expired at the expiry moment (exclusive)");
  assert(reason({ ...base, expiresAt: new Date(now.getTime() + 1) }) === "ok", "one millisecond before expiry it still works");
  assert(reason({ ...base, status: "revoked", redeemedCount: 3 }) === "revoked", "revoked is reported ahead of full");
}

// Grants.
{
  const same = (a: Date, b: Date) => a.getTime() === b.getTime();
  const now = new Date("2026-11-01T02:00:00Z");
  assert(same(sharedGrantPeriod(now, null, { unit: "days", amount: 7 }).endsAt, new Date("2026-11-08T02:00:00Z")), "7 days from now");
  assert(same(sharedGrantPeriod(now, null, { unit: "days", amount: 14 }).endsAt, new Date("2026-11-15T02:00:00Z")), "14 days from now");
  assert(same(sharedGrantPeriod(now, null, { unit: "months", amount: 1 }).endsAt, new Date("2026-12-01T02:00:00Z")), "1 month from now");
  const current = new Date("2027-01-31T02:00:00Z");
  const added = sharedGrantPeriod(now, current, { unit: "months", amount: 1 });
  assert(same(added.startsAt, current) && same(added.endsAt, new Date("2027-02-28T02:00:00Z")), "a grant is added after access the reader already has");
  assert(same(sharedGrantPeriod(now, new Date("2026-10-01T00:00:00Z"), { unit: "days", amount: 7 }).startsAt, now), "access that has ended does not delay the start");
  assert(isValidSharedGrant({ unit: "days", amount: 7 }) && !isValidSharedGrant({ unit: "days", amount: 3 } as never) && !isValidSharedGrant({ unit: "months", amount: 3 } as never), "only the offered lengths are valid");
  let refused = false;
  try { sharedGrantPeriod(now, null, { unit: "months", amount: 5 } as never); } catch { refused = true; }
  assert(refused, "an unknown grant is refused");
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
