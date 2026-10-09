import { getDb } from "../../../../../lib/db";
import { logActivity } from "../../../../../lib/admin/activity";
import { actor, bad, guarded, json, readBody, sameOriginOrRefuse, str } from "../../../../../lib/admin/langganan-api";
import { listSharedCodes } from "../../../../../lib/reader-auth/admin";
import { createSharedCode } from "../../../../../lib/reader-auth/redeem";
import { isValidSharedGrant, type SharedGrant } from "../../../../../lib/subscription/shared-code";

export const dynamic = "force-dynamic";

export async function GET() {
  return guarded(async () => json({ codes: await listSharedCodes(getDb()) }));
}

/** Make a shared code: the length of access it gives, how many readers may use it, and (optionally) its last day. */
export async function POST(request: Request) {
  return guarded(async () => {
    const refused = sameOriginOrRefuse(request);
    if (refused) return refused;
    const body = await readBody(request);
    const unit = str(body.unit, 10);
    const amount = Number(body.amount);
    const grant = { unit, amount } as SharedGrant;
    if (!isValidSharedGrant(grant)) return bad("Pilih tempoh: 7 atau 14 hari, atau 1, 6 atau 12 bulan.");
    const max = Number(body.maxRedemptions);
    if (!Number.isInteger(max) || max < 1 || max > 100000) return bad("Had penebusan mesti antara 1 dan 100000.");
    let expiresAt: Date | null = null;
    const rawExpiry = str(body.expiresAt, 40);
    if (rawExpiry) {
      // The last day is a date in Malaysia; the code stops working at the end of that day.
      const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(rawExpiry);
      if (!match) return bad("Tarikh luput tidak sah.");
      const end = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]) + 1, -8, 0, 0));
      if (Number.isNaN(end.getTime()) || end.getTime() <= Date.now()) return bad("Tarikh luput mesti pada masa hadapan.");
      expiresAt = end;
    }
    const who = await actor();
    const channel = str(body.channel, 60) || undefined;
    const made = await createSharedCode(getDb(), { grant, maxRedemptions: max, expiresAt, channel, note: str(body.note, 300) || undefined, createdBy: who.name });
    await logActivity({ action: "subscription.shared.create", subjectType: "shared_code", subjectId: made.id, summary: `${made.code}: ${amount} ${unit === "days" ? "hari" : "bulan"}, had ${max}${channel ? `, ${channel}` : ""}` });
    return json({ ok: true, code: made.code, id: made.id }, 201);
  });
}
