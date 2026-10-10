import { notFound } from "next/navigation";
import { getDb, hasDb } from "../../../../../lib/db";
import { LanggananNav } from "../../../../../components/admin/langganan-ui";
import { batchInfo } from "../../../../../lib/reader-auth/admin";
import CodesTable from "./CodesTable";

export const dynamic = "force-dynamic";

/** One batch of cards: where it is (made, printed, issued), and every card with its state and dates. */
export default async function BatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id) || !hasDb()) notFound();
  const batch = await batchInfo(getDb(), id).catch(() => null);
  if (!batch) notFound();
  const when = (d: Date | null) => (d ? d.toLocaleString("ms-MY", { timeZone: "Asia/Kuala_Lumpur", day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" }) : "belum");
  return (
    <div className="admin-langganan">
      <header className="admin-page-header">
        <h1>Kelompok {batch.batchNumber}</h1>
        <p className="admin-page-sub">
          {batch.months} bulan · {batch.counts.total} kad{batch.orderRef ? ` · ${batch.orderRef}` : ""}. <a href="/admin/langganan/kad">Kembali ke senarai kelompok</a>
        </p>
      </header>
      <LanggananNav current="/admin/langganan/kad" />
      <div className="admin-table-wrap">
        <table className="admin-table">
          <tbody>
            <tr><th scope="row">Dibuat</th><td>{when(batch.createdAt)}{batch.createdBy ? ` oleh ${batch.createdBy}` : ""}</td></tr>
            <tr><th scope="row">Cetakan disahkan</th><td>{batch.status === "VOIDED" ? "Kelompok dibatalkan" : when(batch.confirmedAt)}</td></tr>
            {batch.status === "VOIDED" ? <tr><th scope="row">Dibatalkan</th><td>{when(batch.voidedAt)}: {batch.voidReason}</td></tr> : null}
            <tr><th scope="row">Belum diaktifkan</th><td>{batch.counts.generated}</td></tr>
            <tr><th scope="row">Diaktifkan (sedia ditebus)</th><td>{batch.counts.issued}, daripadanya {batch.counts.redeemed} sudah ditebus</td></tr>
            <tr><th scope="row">Dibatalkan</th><td>{batch.counts.revoked}</td></tr>
            {batch.note ? <tr><th scope="row">Nota</th><td>{batch.note}</td></tr> : null}
          </tbody>
        </table>
      </div>
      <CodesTable batchId={batch.id} batchNumber={batch.batchNumber} batchStatus={batch.status} />
    </div>
  );
}
