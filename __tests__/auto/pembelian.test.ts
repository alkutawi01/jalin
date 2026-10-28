/**
 * The pieces of buying a code that need no database: the encrypted wait for the e-mail, Billplz's signature and bill call, the prices, and
 * the e-mail itself. (The order rules are checked against a real database in scripts/orders-check.ts.)
 */
import { createHmac } from "node:crypto";
import { billplzConfigFromEnv, billplzSignature, createBillplzBill, parseBillplzCallback, verifyBillplzSignature } from "../../src/lib/subscription/billplz";
import { decryptOrderCode, encryptOrderCode } from "../../src/lib/subscription/order-crypto";
import { purchaseMessage } from "../../src/lib/subscription/order-email";
import { chipConfigFromEnv, chipPurchaseIdFromCallback, createChipPurchase, fetchChipPurchase, parseChipPurchase } from "../../src/lib/subscription/chip";
import { formatRinggit, paymentProviderFromEnv, parsePlanPrices, purchaseStatus } from "../../src/lib/subscription/prices";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}
const throws = (fn: () => unknown) => { try { fn(); return false; } catch { return true; } };

// The code waits encrypted until the e-mail has gone.
{
  const key = Buffer.alloc(32, 3);
  const code = "7H3K9QM2XD5NPB84X";
  const blob = encryptOrderCode(key, "JP-ABCDEFGHJK", code);
  assert(blob.startsWith("v1.") && !blob.includes(code), "an encrypted code is not the code");
  assert(decryptOrderCode(key, "JP-ABCDEFGHJK", blob) === code, "and opens again with the same key and order");
  assert(encryptOrderCode(key, "JP-ABCDEFGHJK", code) !== blob, "each time it is encrypted it looks different (a fresh nonce)");
  assert(throws(() => decryptOrderCode(key, "JP-OTHERORDER", blob)), "a copy moved to another order does not open");
  assert(throws(() => decryptOrderCode(Buffer.alloc(32, 4), "JP-ABCDEFGHJK", blob)), "another key does not open it");
  const parts = blob.split(".");
  parts[3] = parts[3].slice(0, -2) + (parts[3].endsWith("AA") ? "BB" : "AA");
  assert(throws(() => decryptOrderCode(key, "JP-ABCDEFGHJK", parts.join("."))), "a changed copy does not open");
  assert(throws(() => decryptOrderCode(Buffer.alloc(16, 1), "JP-ABCDEFGHJK", blob)) && throws(() => encryptOrderCode(Buffer.alloc(16, 1), "JP-X", code)), "a key under 256 bits is refused");
  assert(throws(() => decryptOrderCode(key, "JP-ABCDEFGHJK", "v2.a.b.c")) && throws(() => decryptOrderCode(key, "JP-ABCDEFGHJK", "")), "an unknown format is refused");
}

// Billplz's signature, as its documentation describes it.
{
  const KEY = "S-testkey1234567890";
  const callback: Record<string, string> = { id: "abc123", collection_id: "col1", paid: "true", state: "paid", amount: "7900", paid_amount: "7900", due_at: "2026-10-25", email: "a@b.my", mobile: "", name: "Pembaca", url: "https://www.billplz.com/bills/abc123", paid_at: "2026-10-25 20:00:00 +0800" };
  // Independent build of the documented procedure: key+value, sorted ignoring case, joined with |, HMAC-SHA256 hex.
  const parts = Object.entries(callback).map(([k, v]) => k + v).sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
  const expected = createHmac("sha256", KEY).update(parts.join("|")).digest("hex");
  assert(billplzSignature(callback, KEY) === expected, "the signature is HMAC-SHA256 over the sorted key+value strings joined by |");
  const signed = { ...callback, x_signature: expected };
  assert(verifyBillplzSignature(signed, KEY), "a callback with the right signature passes");
  assert(!verifyBillplzSignature({ ...signed, paid_amount: "100" }, KEY), "a changed amount fails");
  assert(!verifyBillplzSignature({ ...signed, id: "other" }, KEY), "a changed bill fails");
  assert(!verifyBillplzSignature(signed, "another-key-123456789"), "another key fails");
  assert(!verifyBillplzSignature(callback, KEY) && !verifyBillplzSignature({ ...callback, x_signature: "" }, KEY) && !verifyBillplzSignature({ ...callback, x_signature: "xyz" }, KEY), "no signature, an empty one, or one that is not hex all fail");
  assert(!verifyBillplzSignature({ ...signed, x_signature: expected.slice(0, 62) }, KEY), "a short signature fails");
  const redirect: Record<string, string> = { "billplz[id]": "abc123", "billplz[paid]": "true", "billplz[paid_at]": "2026-10-25 20:00:00 +0800" };
  const rsig = createHmac("sha256", KEY).update(["billplzid" + "abc123", "billplzpaid" + "true", "billplzpaid_at" + "2026-10-25 20:00:00 +0800"].sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase())).join("|")).digest("hex");
  assert(verifyBillplzSignature({ ...redirect, "billplz[x_signature]": rsig }, KEY), "a redirect names its keys billplz[id]; the brackets are dropped before signing");
  const parsed = parseBillplzCallback(signed);
  assert(!!parsed && parsed.billId === "abc123" && parsed.paid && parsed.amountSen === 7900 && parsed.paidAmountSen === 7900, "a callback is read: bill, paid, amounts in sen");
  assert(parseBillplzCallback({ ...signed, paid: "false" })?.paid === false && parseBillplzCallback({ ...signed, paid_amount: "7.90" })?.paidAmountSen === null, "unpaid is unpaid, and an amount that is not whole sen is not trusted");
  assert(parseBillplzCallback({ paid: "true" }) === null && parseBillplzCallback({ id: "a b" }) === null, "a callback without a plain bill id is refused");
}

// Making a bill: what is sent, and what is refused.
(async () => {
  const config = billplzConfigFromEnv({ BILLPLZ_API_KEY: "key_secret", BILLPLZ_COLLECTION_ID: "col9", BILLPLZ_X_SIGNATURE_KEY: "sig" })!;
  assert(config.baseUrl === "https://www.billplz-sandbox.com/api" && billplzConfigFromEnv({ BILLPLZ_API_KEY: "k", BILLPLZ_COLLECTION_ID: "c", BILLPLZ_X_SIGNATURE_KEY: "s", BILLPLZ_ENV: "production" })!.baseUrl === "https://www.billplz.com/api", "the sandbox is the default; the real service only when BILLPLZ_ENV=production");
  assert(billplzConfigFromEnv({ BILLPLZ_API_KEY: "k", BILLPLZ_COLLECTION_ID: "c" }) === null, "a missing key means no gateway");
  let seen: { url: string; init: RequestInit } | null = null;
  const ok: typeof fetch = async (url, init) => { seen = { url: String(url), init: init ?? {} }; return new Response(JSON.stringify({ id: "bill77", url: "https://www.billplz-sandbox.com/bills/bill77" }), { status: 200 }); };
  const input = { name: "Pembaca", email: "a@b.my", amountSen: 7900, description: "Langganan Jalin 6 bulan (JP-X)", callbackUrl: "https://jalin.adjung.com/api/langganan/panggilan-balik", redirectUrl: "https://jalin.adjung.com/beli/selesai?ref=JP-X", reference: "JP-X" };
  const bill = await createBillplzBill(config, input, ok);
  const sentBody = new URLSearchParams(String(seen!.init.body));
  assert(bill.id === "bill77" && seen!.url === "https://www.billplz-sandbox.com/api/v3/bills" && seen!.init.method === "POST", "a bill is made with POST to the v3 bills address");
  assert((seen!.init.headers as Record<string, string>).Authorization === `Basic ${Buffer.from("key_secret:").toString("base64")}`, "with the secret key as the user name and an empty password");
  assert(sentBody.get("collection_id") === "col9" && sentBody.get("amount") === "7900" && sentBody.get("callback_url") === input.callbackUrl && sentBody.get("reference_1") === "JP-X" && !String(seen!.init.body).includes("key_secret"), "the collection, amount in sen, callback and order reference go; the key does not");
  const refuse: typeof fetch = async () => new Response("no", { status: 401 });
  let refused = ""; try { await createBillplzBill(config, input, refuse); } catch (e) { refused = String(e); }
  assert(refused.includes("401") && !refused.includes("key_secret"), "a refusal is reported without the key");
  const odd: typeof fetch = async () => new Response(JSON.stringify({ id: 5, url: "http://x" }), { status: 200 });
  let oddThrown = false; try { await createBillplzBill(config, input, odd); } catch { oddThrown = true; }
  assert(oddThrown, "an unexpected answer (no https address) is refused");
  let tiny = false; try { await createBillplzBill(config, { ...input, amountSen: 50 }, ok); } catch { tiny = true; }
  assert(tiny, "an amount under RM1 is refused before anything is sent");

  // Prices and the switch.
  assert(JSON.stringify(parsePlanPrices("1=15,6=79,12=149")) === JSON.stringify({ 1: 1500, 6: 7900, 12: 14900 }) && parsePlanPrices("1=15.5, 6=79.90, 12=149")?.[6] === 7990 && parsePlanPrices("1=15.5,6=79,12=149")?.[1] === 1550, "prices in ringgit become sen");
  assert(parsePlanPrices(undefined) === null && parsePlanPrices("") === null && parsePlanPrices("1=15,6=79") === null && parsePlanPrices("1=15,6=79,12=abc") === null && parsePlanPrices("3=10,6=79,12=149") === null && parsePlanPrices("1=0,6=79,12=149") === null, "missing, partial, odd or free prices mean nothing can be bought");
  assert(formatRinggit(14900) === "RM149" && formatRinggit(7990) === "RM79.90", "prices are shown as RM149 or RM79.90");
  const BRAND = "409eb80e-3782-4b1d-afa8-b779759266a5";
  const full = { READER_ACCOUNTS_ENABLED: "yes", PURCHASES_ENABLED: "yes", CHIP_SECRET_KEY: "k", CHIP_BRAND_ID: BRAND, PLAN_PRICES_MYR: "1=15,6=79,12=149" };
  assert(purchaseStatus(full).enabled, "with everything set, buying is on");
  for (const drop of ["READER_ACCOUNTS_ENABLED", "PURCHASES_ENABLED", "CHIP_SECRET_KEY", "CHIP_BRAND_ID", "PLAN_PRICES_MYR"]) {
    const env: Record<string, string | undefined> = { ...full };
    delete env[drop];
    assert(!purchaseStatus(env).enabled, `without ${drop}, buying is off`);
  }
  assert(!purchaseStatus({ ...full, PURCHASES_ENABLED: "true" }).enabled, "only the word yes switches it on");
  const chipOn = purchaseStatus(full);
  assert(chipOn.enabled && chipOn.provider === "chip" && chipOn.providerName === "CHIP" && paymentProviderFromEnv({}) === "chip", "CHIP is the gateway unless Billplz is asked for");
  const billplzEnv = { READER_ACCOUNTS_ENABLED: "yes", PURCHASES_ENABLED: "yes", PAYMENT_PROVIDER: "billplz", BILLPLZ_API_KEY: "k", BILLPLZ_COLLECTION_ID: "c", BILLPLZ_X_SIGNATURE_KEY: "s", PLAN_PRICES_MYR: "1=15,6=79,12=149" };
  const billplzOn = purchaseStatus(billplzEnv);
  assert(billplzOn.enabled && billplzOn.provider === "billplz" && billplzOn.providerName === "Billplz", "PAYMENT_PROVIDER=billplz keeps Billplz");
  assert(!purchaseStatus({ ...billplzEnv, PAYMENT_PROVIDER: undefined }).enabled, "Billplz keys alone do not open buying while CHIP is the gateway");
  assert(!purchaseStatus({ ...full, CHIP_BRAND_ID: "not-a-uuid" }).enabled, "a brand id that is not a UUID means no gateway");

  // CHIP: making a purchase, and asking what became of it.
  const chip = chipConfigFromEnv({ CHIP_SECRET_KEY: "chip_secret", CHIP_BRAND_ID: BRAND })!;
  assert(chip.baseUrl === "https://gate.chip-in.asia/api/v1" && chipConfigFromEnv({ CHIP_SECRET_KEY: "k" }) === null, "CHIP needs a key and a brand id");
  let cSeen: { url: string; init: RequestInit } | null = null;
  const PID = "00000000-0000-0000-0000-000000000001";
  const chipOk: typeof fetch = async (url, init) => { cSeen = { url: String(url), init: init ?? {} }; return new Response(JSON.stringify({ id: PID, checkout_url: "https://gate.chip-in.asia/p/" + PID + "/" }), { status: 201 }); };
  const cInput = { email: "a@b.my", name: "Langganan Jalin 6 bulan (JP-X)", amountSen: 7900, reference: "JP-X", successCallback: "https://jalin.adjung.com/api/langganan/panggilan-balik-chip", successRedirect: "https://jalin.adjung.com/beli/selesai?ref=JP-X", failureRedirect: "https://jalin.adjung.com/beli/selesai?ref=JP-X" };
  const cp = await createChipPurchase(chip, cInput, chipOk);
  const cBody = JSON.parse(String(cSeen!.init.body));
  assert(cp.id === PID && cp.url.startsWith("https://gate.chip-in.asia/p/") && cSeen!.url === "https://gate.chip-in.asia/api/v1/purchases/" && cSeen!.init.method === "POST", "a purchase is made with POST to /purchases/ and the buyer is sent to the checkout address");
  assert((cSeen!.init.headers as Record<string, string>).Authorization === "Bearer chip_secret" && !JSON.stringify(cBody).includes("chip_secret"), "the secret key goes in the header, never in the body");
  assert(cBody.brand_id === BRAND && cBody.client.email === "a@b.my" && cBody.purchase.currency === "MYR" && cBody.purchase.products[0].price === 7900 && cBody.reference === "JP-X" && cBody.success_callback === cInput.successCallback && cBody.success_redirect === cInput.successRedirect, "the brand, buyer, amount in sen, order number, callback and redirect go");
  let cRefused = ""; try { await createChipPurchase(chip, cInput, async () => new Response("no", { status: 401 })); } catch (e) { cRefused = String(e); }
  assert(cRefused.includes("401") && !cRefused.includes("chip_secret"), "a refusal is reported without the key");
  let cOdd = false; try { await createChipPurchase(chip, cInput, async () => new Response(JSON.stringify({ id: "x", checkout_url: "http://evil" }), { status: 201 })); } catch { cOdd = true; }
  assert(cOdd, "an answer without a proper id and https checkout address is refused");
  let cTiny = false; try { await createChipPurchase(chip, { ...cInput, amountSen: 50 }, chipOk); } catch { cTiny = true; }
  assert(cTiny, "an amount under RM1 is refused before anything is sent");
  const paidJson = { id: PID, status: "paid", is_test: false, reference: "JP-X", purchase: { total: 7900 }, payment: { amount: 7900 } };
  const parsed = parseChipPurchase(paidJson);
  assert(!!parsed && parsed.status === "paid" && parsed.totalSen === 7900 && parsed.paidSen === 7900 && !parsed.isTest && parsed.reference === "JP-X", "what CHIP says is read: status, amounts in sen, test or not, reference");
  assert(parseChipPurchase({ ...paidJson, is_test: true })?.isTest === true && parseChipPurchase({ ...paidJson, payment: null })?.paidSen === null && parseChipPurchase({ ...paidJson, payment: { amount: 79.5 } })?.paidSen === null, "a test purchase is known, an unpaid one has no paid amount, and an amount that is not whole sen is not trusted");
  assert(parseChipPurchase(null) === null && parseChipPurchase({ id: "short", status: "paid" }) === null && parseChipPurchase({ id: PID }) === null, "an answer without a proper id or status is refused");
  const asked: string[] = [];
  const got = await fetchChipPurchase(chip, PID, async (url, init) => { asked.push(String(url) + "|" + (init?.headers as Record<string, string>).Authorization); return new Response(JSON.stringify(paidJson), { status: 200 }); });
  assert(got.status === "paid" && asked[0] === "https://gate.chip-in.asia/api/v1/purchases/" + PID + "/|Bearer chip_secret", "a payment is confirmed by asking CHIP itself, with our secret key");
  let wrongOne = false; try { await fetchChipPurchase(chip, "00000000-0000-0000-0000-000000000009", async () => new Response(JSON.stringify(paidJson), { status: 200 })); } catch { wrongOne = true; }
  let notThere = false; try { await fetchChipPurchase(chip, PID, async () => new Response("", { status: 404 })); } catch { notThere = true; }
  let badId = false; try { await fetchChipPurchase(chip, "../etc", async () => new Response("{}", { status: 200 })); } catch { badId = true; }
  assert(wrongOne && notThere && badId, "an answer about another purchase, an error from CHIP, or something that is not a purchase number is refused");
  assert(chipPurchaseIdFromCallback({ id: PID.toUpperCase(), status: "paid" }) === PID && chipPurchaseIdFromCallback({ id: "'; DROP" }) === null && chipPurchaseIdFromCallback(null) === null && chipPurchaseIdFromCallback({ status: "paid" }) === null, "a callback is only used for the purchase number it names");

  // The e-mail.
  const good = { serial: "JLN-12B1026-M01", code: "7H3K-9QM2-XD5N-PB84-X", months: 12 as const, redeemByLabel: "25 OKT 2027", orderReference: "JP-ABCDEFGHJK", redeemUrl: "https://jalin.adjung.com/tebus" };
  const msg = purchaseMessage(good);
  assert(msg.subject === "Kod langganan Jalin anda (12 bulan)" && msg.text.includes("Nombor siri: JLN-12B1026-M01") && msg.text.includes("Kod: 7H3K-9QM2-XD5N-PB84-X") && msg.text.includes("Tebus sebelum: 25 OKT 2027") && msg.text.includes("JP-ABCDEFGHJK"), "the e-mail names the serial, code, length, last day and order");
  assert(msg.html.includes("JLN-12B1026-M01") && msg.html.includes("7H3K-9QM2-XD5N-PB84-X") && msg.html.includes("https://jalin.adjung.com/tebus") && msg.html.includes("lang=\"ms\""), "and so does the HTML part");
  assert(msg.text.includes("Jangan sertakan kod langganan penuh dalam e-mel") && msg.text.includes("editorial@adjung.com"), "it says where to ask, and not to put the full code in an e-mail");
  for (const [name, bad] of [
    ["a physical serial", { ...good, serial: "JLN-12B1026-F01" }], ["markup in the serial", { ...good, serial: "JLN-12B1026-M01<script>" }],
    ["a code in the wrong shape", { ...good, code: "<b>HELLO</b>" }], ["a code with the letter U", { ...good, code: "7H3K-9QM2-XD5N-PB84-U" }],
    ["a label with markup", { ...good, redeemByLabel: "25 OKT 2027<img>" }], ["an order number in the wrong shape", { ...good, orderReference: "JP-1" }],
    ["a redeem address with a query", { ...good, redeemUrl: "https://jalin.adjung.com/tebus?x=\"><script>" }], ["an http address that is not localhost", { ...good, redeemUrl: "http://jalin.adjung.com/tebus" }], ["a length of 3 months", { ...good, months: 3 as 1 }],
  ] as const) assert(throws(() => purchaseMessage(bad)), `${name} is refused`);

  assert(purchaseMessage({ ...good, redeemUrl: "http://localhost:3100/tebus" }).text.includes("http://localhost:3100/tebus"), "localhost over http is allowed, for development only");

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed) process.exit(1);
})();
