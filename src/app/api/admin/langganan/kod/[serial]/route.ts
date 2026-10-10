import { getDb } from "../../../../../../lib/db";
import { logActivity } from "../../../../../../lib/admin/activity";
import { actor, bad, guarded, json, layoutFrom, pdfResponse, readBody, sameOriginOrRefuse, str } from "../../../../../../lib/admin/langganan-api";
import { codeKey } from "../../../../../../lib/reader-auth/http";
import { buildLabelPdf, computeLayout } from "../../../../../../lib/subscription/label";
import { findCodeBySerial } from "../../../../../../lib/reader-auth/admin";
import { replaceCode, revokeCode } from "../../../../../../lib/reader-auth/redeem";

export const dynamic = "force-dynamic";

/** One card, found by the serial number printed outside the scratch area. */
export async function GET(_request: Request, { params }: { params: Promise<{ serial: string }> }) {
  return guarded(async () => {
    const { serial } = await params;
    const info = await findCodeBySerial(getDb(), decodeURIComponent(serial));
    return info ? json({ code: info }) : bad("Nombor siri tidak dijumpai.", 404);
  });
}

/** Cancel one card (lost, stolen, damaged). Access it already gave stays until it is cancelled on the reader's page. */
export async function POST(request: Request, { params }: { params: Promise<{ serial: string }> }) {
  return guarded(async () => {
    const refused = sameOriginOrRefuse(request);
    if (refused) return refused;
    const { serial } = await params;
    const body = await readBody(request);
    const reason = str(body.reason, 300);
    const action = str(body.action, 20);
    if (action !== "revoke" && action !== "replace") return bad("Tindakan tidak dikenali.");
    if (!reason) return bad("Sebab diperlukan.");
    const clean = decodeURIComponent(serial).trim().toUpperCase();
    if (action === "replace") {
      // Check the label first, so a layout that cannot work never uses up a code.
      const settings = layoutFrom(body.layout as Record<string, unknown> | undefined);
      const errors = computeLayout(settings).problems.filter((p) => p.level === "error");
      if (errors.length) return bad(errors.map((p) => p.text).join(" "));
      const made = await replaceCode(getDb(), { codeKey: codeKey() }, { serial: clean, reason });
      const who = await actor();
      let pdf: string;
      try {
        pdf = buildLabelPdf(settings, [{ canonical: made.canonical, batchNumber: made.batchNumber, serial: made.serial, planText: `${made.months} bulan` }]).pdf;
      } catch (error) {
        // The new code was never shown to anyone: cancel it and say so, the old one is already cancelled and can be replaced again.
        await revokeCode(getDb(), made.serial, "PDF tidak dapat dibina").catch(() => undefined);
        throw error;
      }
      await logActivity({ action: "subscription.code.revoke", subjectType: "code", subjectId: clean, summary: `${clean} diganti dengan ${made.serial} (${who.name}): ${reason}` });
      return pdfResponse(pdf, `kad-ganti-${made.serial}.pdf`, { "X-Old-Serial": clean, "X-New-Serial": made.serial, "X-Batch-Number": made.batchNumber });
    }
    const done = await revokeCode(getDb(), clean, reason);
    if (!done) return bad("Kod sudah dibatalkan atau nombor siri tidak wujud.", 409);
    await logActivity({ action: "subscription.code.revoke", subjectType: "code", subjectId: clean, summary: `${clean}: ${reason}` });
    return json({ ok: true });
  });
}
