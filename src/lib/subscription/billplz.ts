/**
 * Billplz, the payment gateway chosen first (docs/KAJIAN_PENYEDIA_BAYARAN.md). It only takes the money and tells us so; the code, the
 * period and the redemption are ours. Written from Billplz's own API documentation (support.billplz.com/api):
 *  - a bill is created with POST {base}/v3/bills, HTTP Basic with the secret key as the user name and an empty password, over HTTPS;
 *  - the customer is sent to the bill's `url`; Billplz then calls our `callback_url` (server to server) with the result;
 *  - the callback and the redirect carry `x_signature`: HMAC-SHA256 (hex) with the X Signature key over the parameters, each as
 *    key+value, without x_signature, sorted case-insensitively and joined with "|". The redirect names its keys billplz[id] and the
 *    like; the brackets are dropped before signing;
 *  - the callback and the redirect can come in either order, so only the callback ever makes a code.
 * NOT yet tried against the real Billplz sandbox: that needs Izzat's account and keys. Pure functions plus one call that takes fetch.
 */
import { createHmac, timingSafeEqual } from "node:crypto";

export type BillplzConfig = { apiKey: string; collectionId: string; xSignatureKey: string; baseUrl: string };

/** BILLPLZ_API_KEY, BILLPLZ_COLLECTION_ID and BILLPLZ_X_SIGNATURE_KEY, and BILLPLZ_ENV=production for the real service (sandbox otherwise). */
export function billplzConfigFromEnv(env: Record<string, string | undefined> = process.env): BillplzConfig | null {
  const apiKey = env.BILLPLZ_API_KEY?.trim();
  const collectionId = env.BILLPLZ_COLLECTION_ID?.trim();
  const xSignatureKey = env.BILLPLZ_X_SIGNATURE_KEY?.trim();
  if (!apiKey || !collectionId || !xSignatureKey) return null;
  return { apiKey, collectionId, xSignatureKey, baseUrl: env.BILLPLZ_ENV === "production" ? "https://www.billplz.com/api" : "https://www.billplz-sandbox.com/api" };
}

/** The signature Billplz would put on these parameters. */
export function billplzSignature(params: Record<string, string>, xSignatureKey: string): string {
  const source = Object.entries(params)
    .filter(([key]) => key !== "x_signature" && key !== "billplz[x_signature]")
    .map(([key, value]) => key.replace(/^billplz\[(.*)\]$/, "billplz$1") + value);
  source.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
  return createHmac("sha256", xSignatureKey).update(source.join("|")).digest("hex");
}

export function verifyBillplzSignature(params: Record<string, string>, xSignatureKey: string): boolean {
  const given = params.x_signature ?? params["billplz[x_signature]"];
  if (!given || !/^[0-9a-f]{64}$/i.test(given)) return false;
  const expected = Buffer.from(billplzSignature(params, xSignatureKey), "hex");
  const actual = Buffer.from(given.toLowerCase(), "hex");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export type BillplzCallback = { billId: string; paid: boolean; amountSen: number | null; paidAmountSen: number | null };

/** What a (signature-checked) callback says. Amounts are whole sen. */
export function parseBillplzCallback(params: Record<string, string>): BillplzCallback | null {
  const billId = params.id ?? params["billplz[id]"];
  if (!billId || !/^[A-Za-z0-9_-]{4,40}$/.test(billId)) return null;
  const sen = (value: string | undefined) => (value && /^\d{1,9}$/.test(value) ? Number(value) : null);
  return { billId, paid: (params.paid ?? params["billplz[paid]"]) === "true", amountSen: sen(params.amount), paidAmountSen: sen(params.paid_amount) };
}

export type CreateBillInput = { name: string; email: string; amountSen: number; description: string; callbackUrl: string; redirectUrl: string; reference: string };

export async function createBillplzBill(config: BillplzConfig, input: CreateBillInput, fetchImpl: typeof fetch = fetch): Promise<{ id: string; url: string }> {
  if (!Number.isInteger(input.amountSen) || input.amountSen < 100) throw new Error("The amount must be at least RM1.00 (in sen).");
  const body = new URLSearchParams({
    collection_id: config.collectionId,
    email: input.email,
    name: input.name.slice(0, 100),
    amount: String(input.amountSen),
    description: input.description.slice(0, 200),
    callback_url: input.callbackUrl,
    redirect_url: input.redirectUrl,
    reference_1_label: "Pesanan",
    reference_1: input.reference.slice(0, 120),
  });
  const response = await fetchImpl(`${config.baseUrl}/v3/bills`, {
    method: "POST",
    headers: { Authorization: `Basic ${Buffer.from(`${config.apiKey}:`).toString("base64")}`, "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!response.ok) throw new Error(`The payment gateway refused the bill (${response.status}).`);
  const json = (await response.json()) as { id?: unknown; url?: unknown };
  if (typeof json.id !== "string" || typeof json.url !== "string" || !/^https:\/\//.test(json.url)) throw new Error("The payment gateway sent back an unexpected answer.");
  return { id: json.id, url: json.url };
}
