import { NextResponse } from "next/server";
import { getDb } from "../../../../../../lib/db";
import { logActivity } from "../../../../../../lib/admin/activity";
import { guarded } from "../../../../../../lib/admin/langganan-api";
import { listMembers } from "../../../../../../lib/reader-auth/admin";

export const dynamic = "force-dynamic";

const cell = (value: unknown) => {
  const text = value === null || value === undefined ? "" : value instanceof Date ? value.toISOString() : String(value);
  // A spreadsheet runs a cell that starts with = + - @ as a formula: keep a reader's name from being one.
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
};

/** The list of members as a CSV file (personal data: the owner only, and the download is recorded). */
export async function GET() {
  return guarded(async () => {
    const lines: string[] = [["E-mel", "Nama", "Daftar", "Log masuk terakhir", "Status", "Tarikh akhir", "Sumber", "Peranti"].map(cell).join(",")];
    for (let page = 1; page <= 200; page++) {
      const { rows } = await listMembers(getDb(), { page, pageSize: 500 });
      if (rows.length === 0) break;
      for (const r of rows) lines.push([r.email, r.displayName, r.createdAt, r.lastLoginAt, r.status, r.endsAt, r.source, r.devices].map(cell).join(","));
      if (rows.length < 500) break;
    }
    await logActivity({ action: "subscription.switch", subjectType: "export", subjectId: "members", summary: `Senarai ahli dimuat turun (${lines.length - 1} baris)` });
    const stamp = new Date().toISOString().slice(0, 10);
    return new NextResponse("\uFEFF" + lines.join("\r\n") + "\r\n", { status: 200, headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="jalin-ahli-${stamp}.csv"`, "Cache-Control": "no-store" } });
  });
}
