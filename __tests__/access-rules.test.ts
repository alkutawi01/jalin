/** Access rules: what state a reader is in, where a new grant starts, and whether a work may be read. */
import { readDecision, stackStart, summariseAccess, type AccessPeriod } from "../src/lib/subscription/access";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string, detail?: unknown) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`, detail ?? ""); }
}
const d = (s: string) => new Date(`2026-11-${s}T02:00:00Z`);
const P = (kind: AccessPeriod["kind"], from: string, to: string, revoked?: string): AccessPeriod => ({ kind, startsAt: d(from), endsAt: d(to), revokedAt: revoked ? d(revoked) : null });
const same = (a: Date | null, b: Date) => !!a && a.getTime() === b.getTime();

// State.
assert(summariseAccess([], d("05")).state === "none" && summariseAccess([], d("05")).endsAt === null, "no periods: none");
const trial = [P("TRIAL", "01", "15")];
assert(summariseAccess(trial, d("05")).state === "trial" && same(summariseAccess(trial, d("05")).endsAt, d("15")), "inside the trial: trial, ending when it ends");
assert(summariseAccess(trial, d("01")).state === "trial", "the start moment is inside");
assert(summariseAccess(trial, d("15")).state === "expired" && same(summariseAccess(trial, d("15")).endsAt, d("15")), "the end moment is outside: expired, with the date it ended");
assert(summariseAccess(trial, new Date("2026-10-31T02:00:00Z")).state === "none", "before it starts: none");
const paid = [...trial, P("CARD", "15", "28")];
assert(summariseAccess(paid, d("10")).state === "trial" && same(summariseAccess(paid, d("10")).currentPeriodEndsAt, d("15")) && same(summariseAccess(paid, d("10")).endsAt, d("28")), "a card period that has not started yet does not show as subscribed, but the run of access already reaches its end");
assert(summariseAccess(paid, d("20")).state === "subscribed" && same(summariseAccess(paid, d("20")).endsAt, d("28")), "inside the card period: subscribed");
assert(summariseAccess(paid, d("28")).state === "expired", "after everything has ended: expired");
const overlap = [P("TRIAL", "01", "15"), P("SHARED", "05", "09")];
assert(summariseAccess(overlap, d("06")).state === "subscribed" && same(summariseAccess(overlap, d("06")).endsAt, d("15")) && summariseAccess(overlap, d("06")).activeKinds.length === 2, "overlapping periods: subscribed, ending at the latest end");
assert(summariseAccess([P("CARD", "01", "30", "10")], d("12")).state === "none" && summariseAccess([P("CARD", "01", "30", "10")], d("05")).state === "none", "a cancelled period is ignored altogether: with nothing else the reader has no access (and is asked to subscribe, as an expired one is)");
assert(summariseAccess([P("CARD", "01", "30", "10"), P("TRIAL", "01", "15")], d("12")).state === "trial", "a cancelled card does not cancel the trial");
const unordered = [P("CARD", "20", "28"), P("TRIAL", "01", "15")];
assert(JSON.stringify(summariseAccess(unordered, d("10"))) === JSON.stringify(summariseAccess([...unordered].reverse(), d("10"))), "the order of the periods does not matter");

const gap = [P("TRIAL", "01", "15"), P("CARD", "20", "28")];
assert(same(summariseAccess(gap, d("05")).endsAt, d("15")), "a gap between periods ends the run");
assert(same(summariseAccess([P("CARD", "01", "10"), P("CARD", "10", "20"), P("CARD", "20", "30")], d("05")).endsAt, d("30")) && same(summariseAccess([P("CARD", "20", "30"), P("CARD", "01", "10"), P("CARD", "10", "20")], d("05")).endsAt, d("30")), "three back-to-back periods are one run, whatever their order");

// Stacking.
assert(same(stackStart([], d("05")), d("05")), "no periods: a grant starts now");
assert(same(stackStart(trial, d("05")), d("15")), "during the trial a grant starts when the trial ends");
assert(same(stackStart(paid, d("05")), d("28")), "periods not yet started count: it starts after the last one");
assert(same(stackStart(trial, d("20")), d("20")), "after everything ended it starts now");
assert(same(stackStart([P("CARD", "01", "30", "03")], d("05")), d("05")), "a cancelled period does not push the start back");

// Reading.
const on = { paywallOn: true, isTeaser: false };
const sub = summariseAccess([P("CARD", "01", "30")], d("05"));
const tri = summariseAccess(trial, d("05"));
const exp = summariseAccess(trial, d("20"));
assert(readDecision({ paywallOn: false, signedIn: false, isTeaser: false, access: null }) === "allow", "while the paywall is off everything is open to everyone");
assert(readDecision({ ...on, signedIn: false, isTeaser: true, access: null }) === "allow", "a teaser work is open to a visitor");
assert(readDecision({ ...on, signedIn: false, access: null }) === "sign_in", "a visitor is asked to sign in");
assert(readDecision({ ...on, signedIn: true, access: tri }) === "allow" && readDecision({ ...on, signedIn: true, access: sub }) === "allow", "a reader in trial or subscribed may read");
assert(readDecision({ ...on, signedIn: true, access: exp }) === "subscribe" && readDecision({ ...on, signedIn: true, access: null }) === "subscribe", "an expired reader, or one with no access, is asked to subscribe");
assert(readDecision({ ...on, signedIn: true, isTeaser: true, access: exp }) === "allow", "a teaser is open even to an expired reader");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
