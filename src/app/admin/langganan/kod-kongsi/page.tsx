import { getDb, hasDb } from "../../../../lib/db";
import { listSharedCodes, type SharedRow } from "../../../../lib/reader-auth/admin";
import { LanggananNav } from "../../../../components/admin/langganan-ui";
import SharedManager from "./SharedManager";

export const dynamic = "force-dynamic";

export default async function SharedCodesPage() {
  let rows: SharedRow[] = [];
  let problem: string | null = null;
  if (!hasDb()) problem = "Pangkalan data tidak tersedia.";
  else {
    try {
      rows = await listSharedCodes(getDb());
    } catch {
      problem = "Jadual langganan belum wujud pada pangkalan data ini. Migrasi 027 hingga 030 perlu dijalankan dahulu.";
    }
  }
  const plain = rows.map((r) => ({ ...r, expiresAt: r.expiresAt ? r.expiresAt.toISOString() : null, createdAt: r.createdAt.toISOString() }));
  return (
    <div className="admin-langganan">
      <header className="admin-page-header">
        <h1>Kod kongsi</h1>
        <p className="admin-page-sub">Satu kod yang boleh ditebus ramai orang, untuk dikongsi (contohnya di Telegram), dengan had penebusan.</p>
      </header>
      <LanggananNav current="/admin/langganan/kod-kongsi" />
      {problem ? <div className="admin-alert admin-alert-error" role="alert">{problem}</div> : <SharedManager initialRows={plain} />}
    </div>
  );
}
