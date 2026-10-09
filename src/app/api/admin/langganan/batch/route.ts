import { getDb } from "../../../../../lib/db";
import { logActivity } from "../../../../../lib/admin/activity";
import { actor, bad, guarded, layoutFrom, pdfResponse, readBody, sameOriginOrRefuse, str } from "../../../../../lib/admin/langganan-api";
import { codeKey } from "../../../../../lib/reader-auth/http";
import { createBatch, voidBatch } from "../../../../../lib/reader-auth/redeem";
import { suggestBatchNumber } from "../../../../../lib/reader-auth/admin";
import { buildLabelPdf, computeLayout } from "../../../../../lib/subscription/label";

export const dynamic = "force-dynamic";

/**
 * Make a batch of card codes and answer with the PDF to print. The plain codes exist only in this request and in the PDF it returns:
 * they are not stored, so a PDF that is lost means the batch is cancelled and made again. The label sizes are checked BEFORE anything is
 * made, so a layout that cannot work never uses up a batch.
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

    const batchNumber = str(body.batchNumber, 30) || (await suggestBatchNumber(db));
    const who = await actor();
    const made = await createBatch(db, { codeKey: codeKey() }, { batchNumber, months: months as 1 | 6 | 12, quantity, orderRef: str(body.orderRef, 100) || undefined, note: str(body.note, 300) || undefined, createdBy: who.name });

    let pdf: string;
    try {
      pdf = buildLabelPdf(settings, made.codes.map((c) => ({ canonical: c.canonical, batchNumber: made.batchNumber, serial: c.serial, planText: `${months} bulan` }))).pdf;
    } catch (error) {
      await voidBatch(db, made.batchId, "PDF tidak dapat dibina").catch(() => undefined);
      throw error;
    }
    await logActivity({ action: "subscription.batch.create", subjectType: "batch", subjectId: made.batchId, summary: `Kelompok ${made.batchNumber}: ${quantity} kad ${months} bulan` });
    return pdfResponse(pdf, `kad-${made.batchNumber}.pdf`, { "X-Batch-Id": made.batchId, "X-Batch-Number": made.batchNumber, "X-Cards": String(quantity) });
  });
}
