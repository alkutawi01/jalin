import assert from "node:assert/strict";
import { test } from "node:test";
import { randomBytes } from "node:crypto";
import { decryptLabelCode, encryptLabelCode } from "../../src/lib/subscription/label-crypto";
import { encryptOrderCode } from "../../src/lib/subscription/order-crypto";
import { generateCanonicalCode } from "../../src/lib/subscription/redeem-code";

const key = randomBytes(32);
const serial = "JLN-12B1126-F01";
const canonical = generateCanonicalCode();

test("physical label encryption recovers the same code with a new nonce every time", () => {
  const a = encryptLabelCode(key, serial, canonical);
  const b = encryptLabelCode(key, serial, canonical);
  assert.ok(a !== b && !a.includes(canonical) && !b.includes(canonical));
  assert.ok(decryptLabelCode(key, serial, a) === canonical);
  assert.ok(decryptLabelCode(key, serial, b) === canonical);
});

test("a changed serial, key, envelope or purpose cannot recover a label", () => {
  const sealed = encryptLabelCode(key, serial, canonical);
  const parts = sealed.split(".");
  parts[1] = (parts[1][0] === "A" ? "B" : "A") + parts[1].slice(1);
  for (const [otherKey, otherSerial, blob] of [
    [randomBytes(32), serial, sealed], [key, "JLN-12B1126-F02", sealed], [key, serial, parts.join(".")],
    [key, serial, sealed + ".extra"], [key, serial, encryptOrderCode(key, serial, canonical)],
  ] as const) assert.throws(() => decryptLabelCode(otherKey, otherSerial, blob), /^Error: Physical label recovery failed\.$/);
});

test("invalid codes, virtual serials and short keys are refused without echoing inputs", () => {
  for (const run of [
    () => encryptLabelCode(Buffer.alloc(8), serial, canonical),
    () => encryptLabelCode(key, "JLN-12B1126-M01", canonical),
    () => encryptLabelCode(key, serial, "invalid"),
  ]) assert.throws(run, /^Error: Physical label recovery failed\.$/);
});
