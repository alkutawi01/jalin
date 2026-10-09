import { NextResponse } from "next/server";
import { bad, layoutFrom, pdfResponse } from "../../../../../lib/admin/langganan-api";
import { buildLabelPdf, computeLayout } from "../../../../../lib/subscription/label";

export const dynamic = "force-dynamic";

/**
 * A test label with a made-up code, so the sizes can be lined up with the real sticker and the printer before any real code is made.
 * With format=json it only reports what the sizes give (the size of the code, and any warning). Nothing is stored.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const settings = layoutFrom(url.searchParams);
  const layout = computeLayout(settings, "TESTTESTTESTTESTT");
  if (url.searchParams.get("format") === "json") {
    return NextResponse.json({ layout }, { headers: { "Cache-Control": "no-store" } });
  }
  const errors = layout.problems.filter((p) => p.level === "error");
  if (errors.length) return bad(errors.map((p) => p.text).join(" "));
  const { pdf } = buildLabelPdf(settings, [{ canonical: "TESTTESTTESTTESTT", batchNumber: "UJIAN", serial: "BUKAN-KOD-SEBENAR", planText: "6 bulan" }], { guides: true });
  return pdfResponse(pdf, "label-ujian.pdf");
}
