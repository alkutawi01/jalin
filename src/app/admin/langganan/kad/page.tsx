import { getDb, hasDb } from "../../../../lib/db";
import { listBatches, suggestBatchNumber, type BatchRow } from "../../../../lib/reader-auth/admin";
import { LanggananNav } from "../../../../components/admin/langganan-ui";
import BatchManager from "./BatchManager";

export const dynamic = "force-dynamic";

export default async function CardsPage() {
  let batches: BatchRow[] = [];
  let suggested = "";
  let problem: string | null = null;
  if (!hasDb()) problem = "Pangkalan data tidak tersedia.";
  else {
    try {
      [batches, suggested] = await Promise.all([listBatches(getDb()), suggestBatchNumber(getDb())]);
    } catch {
      problem = "Jadual langganan belum wujud pada pangkalan data ini. Migrasi 027 hingga 030 perlu dijalankan dahulu.";
    }
  }
  const plain = batches.map((b) => ({ ...b, createdAt: b.createdAt.toISOString(), confirmedAt: b.confirmedAt ? b.confirmedAt.toISOString() : null }));
  return (
    <div className="admin-langganan">
      <header className="admin-page-header">
        <h1>Kad dan kelompok</h1>
        <p className="admin-page-sub">Buat kod kad, cetak labelnya, sahkan cetakan, kemudian aktifkan kod apabila kad meninggalkan tempat anda.</p>
      </header>
      <LanggananNav current="/admin/langganan/kad" />
      {problem ? <div className="admin-alert admin-alert-error" role="alert">{problem}</div> : <BatchManager initialBatches={plain} suggested={suggested} />}
    </div>
  );
}
