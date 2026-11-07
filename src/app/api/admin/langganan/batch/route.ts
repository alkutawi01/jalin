import { getDb } from "../../../../../lib/db";
import { actor, bad, guarded, layoutFrom, pdfResponse, readBody, sameOriginOrRefuse, str } from "../../../../../lib/admin/langganan-api";
import { codeKey } from "../../../../../lib/reader-auth/http";
import { generatePhysicalLabels, LabelPrintError } from "../../../../../lib/reader-auth/physical-labels";
import { mmyyFromMonthInput, redeemByFromDateInput } from "../../../../../lib/subscription/redeem-code";
import { computeLayout } from "../../../../../lib/subscription/label";
import { PHYSICAL_LABEL_COPY as COPY } from "../../../../../lib/subscription/physical-label-copy";

export const dynamic = "force-dynamic";

/**
 * Store encrypted physical codes and recover them for the first PDF in one audited transaction.
 */
export async function POST(request: Request) {
  return guarded(async () => {
    const refused = sameOriginOrRefuse(request);
    if (refused) return refused;
    const body = await readBody(request);
    const db = getDb();

    const months = Number(body.months);
    const quantity = Number(body.quantity);
    if (![1, 6, 12].includes(months)) return bad("Pilih tempoh 1, 6 atau 12 bulan.");
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 5000) return bad("Bilangan kad mesti antara 1 dan 5000.");
    const settings = layoutFrom(body.layout as Record<string, unknown> | undefined);
    const layout = computeLayout(settings);
    const errors = layout.problems.filter((p) => p.level === "error");
    if (errors.length) return bad(errors.map((p) => p.text).join(" "));
    if (layout.problems.length && body.acceptSmall !== true) return bad(`${layout.problems.map((p) => p.text).join(" ")} Sahkan untuk meneruskan.`, 409);

    const issueMmyy = body.issueMonth ? mmyyFromMonthInput(str(body.issueMonth, 10)) : undefined;
    if (body.issueMonth && !issueMmyy) return bad("Bulan dijangka dikeluarkan tidak sah.");
    const redeemBy = redeemByFromDateInput(str(body.redeemBy, 12));
    if (!redeemBy) return bad("Tarikh tebus sebelum diperlukan (hari terakhir kod boleh ditebus).");
    if (redeemBy.getTime() <= Date.now()) return bad("Tarikh tebus sebelum mesti pada masa depan.");
    const who = await actor();
    try {
      const made = await generatePhysicalLabels(db, { codeKey: codeKey(), actor: who }, { months: months as 1 | 6 | 12, quantity, redeemBy, issueMmyy: issueMmyy ?? undefined, orderRef: str(body.orderRef, 100) || undefined, note: str(body.note, 300) || undefined, labelLayout: settings });
      return pdfResponse(made.pdf, `kad-${made.batchNumber}.pdf`, { "X-Batch-Id": made.batchId, "X-Batch-Number": made.batchNumber, "X-Cards": String(made.count) });
    } catch (error) {
      // Never log driver errors: they can contain encrypted/secret SQL parameters.
      return bad(error instanceof LabelPrintError && error.reason === "layout" ? COPY.layout : COPY.failed, 503);
    }
  });
}
