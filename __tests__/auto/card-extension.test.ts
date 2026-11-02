import assert from "node:assert/strict";
import { test } from "node:test";
import { cardExtensionDecision } from "../../src/lib/subscription/card-extension";
import { stackStart, type AccessPeriod } from "../../src/lib/subscription/access";
import { addMonthsMYT, PLAN_MONTHS, redemptionPeriod } from "../../src/lib/subscription/periods";
import { cardQueuedMessage, cardYearLimitMessage } from "../../src/lib/subscription/card-extension-copy";

const at = (text: string) => new Date(text + "+08:00");
const firstDay = at("2027-01-01T10:00:00");
const card = (startsAt: Date, months: number): AccessPeriod => ({ kind: "CARD", startsAt, endsAt: addMonthsMYT(startsAt, months) });
const propose = (periods: AccessPeriod[], now: Date, months: 1 | 6 | 12) => {
  const period = redemptionPeriod(stackStart(periods, now), null, months);
  return cardExtensionDecision(periods, now, period.endsAt);
};

test("all 1/6/12 month plans allow one extension, then reopen at its exact start", () => {
  for (const currentMonths of PLAN_MONTHS) {
    for (const extraMonths of PLAN_MONTHS) {
      const active = card(firstDay, currentMonths);
      const queued = card(active.endsAt, extraMonths);
      const now = new Date(firstDay.getTime() + 1000);
      assert.deepEqual(propose([active], now, extraMonths), { allowed: true });
      assert.deepEqual(propose([active, queued], now, 1), { allowed: false, reason: "queued", availableAt: queued.startsAt });
      assert.equal(propose([active, queued], new Date(queued.startsAt.getTime() - 1), 1).allowed, false);
      assert.deepEqual(propose([active, queued], queued.startsAt, 12), { allowed: true });
    }
  }
});

test("annual example: the 2029 card is refused during 2027 and allowed when the 2028 card starts", () => {
  const current = card(at("2027-01-01T00:00:00"), 12);
  const queued = card(at("2028-01-01T00:00:00"), 12);
  assert.equal(propose([current, queued], at("2027-07-01T00:00:00"), 12).allowed, false);
  assert.deepEqual(propose([current, queued], at("2028-01-01T00:00:00"), 12), { allowed: true });
});

test("a short queued card still uses the whole slot; the limit is not merely total months", () => {
  const current = card(firstDay, 1);
  const queued = card(current.endsAt, 1);
  assert.equal(propose([current, queued], firstDay, 1).allowed, false);
});

test("a trial retains its full period, with only one card waiting behind it", () => {
  const trial: AccessPeriod = { kind: "TRIAL", startsAt: firstDay, endsAt: at("2027-01-15T10:00:00") };
  const queued = card(trial.endsAt, 12);
  assert.equal(propose([trial], firstDay, 12).allowed, true);
  assert.equal(propose([trial, queued], firstDay, 1).allowed, false);
  assert.equal(propose([trial, queued], trial.endsAt, 1).allowed, true);
});

test("new and expired accounts start from now, not from an old expiry", () => {
  const old = card(at("2025-01-01T10:00:00"), 12);
  assert.equal(propose([], firstDay, 12).allowed, true);
  assert.equal(propose([old], firstDay, 12).allowed, true);
});

test("revoked cards do not reserve a slot or extend its date", () => {
  const current = card(firstDay, 6);
  const revoked = { ...card(current.endsAt, 12), revokedAt: firstDay };
  assert.equal(propose([current, revoked], firstDay, 12).allowed, true);
});

test("existing future access cannot move the year limit forward from the active card", () => {
  const current = card(firstDay, 12);
  const admin: AccessPeriod = { kind: "ADMIN", startsAt: current.endsAt, endsAt: at("2030-01-01T10:00:00") };
  assert.deepEqual(propose([current, admin], firstDay, 1), {
    allowed: false, reason: "year_limit", maximumEndsAt: at("2029-01-01T10:00:00"),
  });
});

test("without an active card, existing shared/admin access remains the start-date basis", () => {
  for (const kind of ["SHARED", "ADMIN"] as const) {
    const access: AccessPeriod = { kind, startsAt: firstDay, endsAt: at("2027-07-01T10:00:00") };
    assert.equal(propose([access], firstDay, 12).allowed, true);
  }
});

test("a legacy queue is preserved; availability waits for its last future card", () => {
  const active = card(firstDay, 12);
  const next = card(active.endsAt, 12);
  const last = card(next.endsAt, 12);
  const before = [active, next, last].map((period) => [period.startsAt.toISOString(), period.endsAt.toISOString()]);
  assert.deepEqual(propose([active, next, last], firstDay, 1), { allowed: false, reason: "queued", availableAt: last.startsAt });
  assert.equal(propose([active, next, last], next.startsAt, 1).allowed, false);
  assert.equal(propose([active, next, last], last.startsAt, 1).allowed, true);
  assert.deepEqual([active, next, last].map((period) => [period.startsAt.toISOString(), period.endsAt.toISOString()]), before);
});

test("future cards across a revoked-access gap still reserve a slot", () => {
  const future = card(at("2028-01-01T00:00:00"), 6);
  assert.deepEqual(propose([future], firstDay, 1), { allowed: false, reason: "queued", availableAt: future.startsAt });
});

test("the year limit uses Malaysian calendar months, including leap years and exact equality", () => {
  const now = at("2028-01-01T00:00:00");
  const current = card(at("2027-01-01T00:00:00"), 12);
  // Use a separate live grant ending on leap day.
  const leap: AccessPeriod = { kind: "CARD", startsAt: at("2027-03-01T00:00:00"), endsAt: at("2028-02-29T00:00:00") };
  const cap = at("2029-02-28T00:00:00");
  assert.equal(cardExtensionDecision([leap], now, cap).allowed, true);
  assert.equal(cardExtensionDecision([leap], now, new Date(cap.getTime() + 1)).allowed, false);
  const startOfLeapYear = { ...current, endsAt: now };
  const justBefore = new Date(now.getTime() - 1);
  assert.equal(cardExtensionDecision([startOfLeapYear], justBefore, at("2029-01-01T00:00:00")).allowed, true);
});

test("invalid dates cannot silently bypass the decision", () => {
  assert.throws(() => cardExtensionDecision([], new Date(NaN), firstDay));
  assert.throws(() => cardExtensionDecision([], firstDay, new Date(NaN)));
});

test("reader messages use exact server dates in Malaysia and state that the code is unused", () => {
  const queued = cardQueuedMessage(new Date("2027-12-31T16:00:00Z"));
  const capped = cardYearLimitMessage(new Date("2029-02-27T16:00:00Z"));
  assert.match(queued, /1 Januari 2028, 12:00 pagi \(MYT\)/);
  assert.match(queued, /belum digunakan/);
  assert.match(capped, /28 Februari 2029, 12:00 pagi \(MYT\)/);
  assert.match(capped, /belum digunakan/);
  assert.doesNotMatch(queued + capped, /undefined|Invalid Date|card_queued|card_year_limit/);
});
