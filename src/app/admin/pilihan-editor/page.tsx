import EditorPicksManager from "../../../components/admin/EditorPicksManager";
import { getPickState } from "../../../lib/admin/editor-picks-service";
import { hasDb } from "../../../lib/db";

export const dynamic = "force-dynamic";

export default async function EditorPicksPage() {
  if (!hasDb()) {
    return (
      <div className="admin-placeholder">
        <h1>Pilihan Editor</h1>
        <p>Pangkalan data tidak tersedia.</p>
      </div>
    );
  }
  const state = await getPickState();
  return (
    <div className="admin-form-page">
      <header className="admin-page-header">
        <p className="admin-form-hint"><a href="/admin/works">← Karya</a></p>
        <h1>Pilihan Editor</h1>
        <p className="admin-page-sub">
          Karya yang diketengahkan di laman utama. Maksimum 3, disusun mengikut kedudukan. Hanya karya yang sudah terbit boleh dipilih.
        </p>
      </header>
      <EditorPicksManager initial={state} />
    </div>
  );
}
