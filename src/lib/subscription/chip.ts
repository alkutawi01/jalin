/**
 * CHIP Collect, the payment gateway Jalin is moving to (Billplz would not verify Izzat; see docs/KAJIAN_PENYEDIA_BAYARAN.md). Written from CHIP's
 * own documentation (docs.chip-in.asia):
 *  - a purchase is made with POST https://gate.chip-in.asia/api/v1/purchases/, Authorization: Bearer <secret key>, amounts as integer sen;
 *    the answer carries \`id\` and \`checkout_url\`, where the buyer is sent;
 *  - when the purchase is paid, CHIP POSTs the whole Purchase as JSON to \`success_callback\` (retried up to 8 times over 36 hours, and a
 *    delivery can be repeated even after a 200), and sends the buyer to \`success_redirect\`;
 *  - whether a key is a test key decides whether the purchase is a test one (\`is_test\`): there is no separate sandbox address.
 *
 * How a payment is trusted: NOT from the callback. The callback body only says which purchase to look at; the answer to "was it paid, and
 * how much" is read back from CHIP with our secret key (GET /purchases/{id}/). A forged callback can therefore only make us ask CHIP, and
 * CHIP says the truth. (The callback is also signed, X-Signature with a public key from GET /public_key/; that is not relied on, so the
 * security does not depend on a detail of the signature that cannot be tried without an account.)
 * NOT yet tried against the real CHIP: that needs Izzat's account and a test key. Pure functions plus calls that take fetch.
 */
export type ChipConfig = { secretKey: string; brandId: string; baseUrl: string };

/** CHIP_SECRET_KEY and CHIP_BRAND_ID (a UUID). A test key makes test purchases, a live key real ones. */
export function chipConfigFromEnv(env: Record<string, string | undefined> = process.env): ChipConfig | null {
  const secretKey = env.CHIP_SECRET_KEY?.trim();
  const brandId = env.CHIP_BRAND_ID?.trim();
  if (!secretKey || !brandId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(brandId)) return null;
  // For development only (a stand-in server on this machine); the live site always talks to CHIP itself.
  const dev = env.NODE_ENV !== "production" && /^http:\/\/localhost:\d{2,5}\/api\/v1$/.test(env.CHIP_BASE_URL ?? "") ? env.CHIP_BASE_URL : null;
  return { secretKey, brandId, baseUrl: dev ?? "https://gate.chip-in.asia/api/v1" };
}

export type CreateChipPurchaseInput = { email: string; name: string; amountSen: number; reference: string; successCallback: string; successRedirect: string; failureRedirect: string };

export async function createChipPurchase(config: ChipConfig, input: CreateChipPurchaseInput, fetchImpl: typeof fetch = fetch): Promise<{ id: string; url: string }> {
  if (!Number.isInteger(input.amountSen) || input.amountSen < 100) throw new Error("The amount must be at least RM1.00 (in sen).");
  const response = await fetchImpl(`${config.baseUrl}/purchases/`, {
    method: "POST",
    headers: { Authorization: `Bearer ${config.secretKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      brand_id: config.brandId,
      client: { email: input.email },
      // CHIP's API rejects "ms" (invalid_choice); English is its supported checkout language.
      purchase: { currency: "MYR", language: "en", products: [{ name: input.name.slice(0, 256), price: input.amountSen, quantity: 1 }] },
      reference: input.reference.slice(0, 128),
      send_receipt: false,
      success_callback: input.successCallback,
      success_redirect: input.successRedirect,
      failure_redirect: input.failureRedirect,
      cancel_redirect: input.failureRedirect,
    }),
  });
  if (!response.ok) throw new Error(`The payment gateway refused the purchase (${response.status}).`);
  const json = (await response.json()) as { id?: unknown; checkout_url?: unknown };
  if (typeof json.id !== "string" || typeof json.checkout_url !== "string" || !/^https:\/\//.test(json.checkout_url)) throw new Error("The payment gateway sent back an unexpected answer.");
  return { id: json.id, url: json.checkout_url };
}

export type ChipPurchase = { id: string; status: string; isTest: boolean; totalSen: number | null; paidSen: number | null; reference: string | null };

/** What CHIP says about a purchase. Amounts are whole sen; `paidSen` is what was actually paid (null while unpaid or not stated). */
export function parseChipPurchase(json: unknown): ChipPurchase | null {
  if (!json || typeof json !== "object") return null;
  const p = json as { id?: unknown; status?: unknown; is_test?: unknown; reference?: unknown; purchase?: { total?: unknown }; payment?: { amount?: unknown } | null };
  if (typeof p.id !== "string" || !/^[0-9a-f-]{36}$/i.test(p.id) || typeof p.status !== "string") return null;
  const sen = (value: unknown) => (typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : null);
  return { id: p.id, status: p.status, isTest: p.is_test === true, totalSen: sen(p.purchase?.total), paidSen: sen(p.payment?.amount), reference: typeof p.reference === "string" ? p.reference : null };
}

/** Ask CHIP, with our own key, what became of a purchase. The only thing that can mark an order paid. */
export async function fetchChipPurchase(config: ChipConfig, purchaseId: string, fetchImpl: typeof fetch = fetch): Promise<ChipPurchase> {
  if (!/^[0-9a-f-]{36}$/i.test(purchaseId)) throw new Error("Not a purchase number.");
  const response = await fetchImpl(`${config.baseUrl}/purchases/${purchaseId}/`, { headers: { Authorization: `Bearer ${config.secretKey}` } });
  if (!response.ok) throw new Error(`The payment gateway would not say (${response.status}).`);
  const purchase = parseChipPurchase(await response.json());
  if (!purchase || purchase.id.toLowerCase() !== purchaseId.toLowerCase()) throw new Error("The payment gateway sent back an unexpected answer.");
  return purchase;
}

/** The id a callback names, or null. The rest of the callback body is ignored. */
export function chipPurchaseIdFromCallback(body: unknown): string | null {
  const id = body && typeof body === "object" ? (body as { id?: unknown }).id : null;
  return typeof id === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) ? id.toLowerCase() : null;
}
