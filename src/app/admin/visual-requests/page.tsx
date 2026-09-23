import { hasDb } from "../../../lib/db";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, string> = {
  draft: "Draf",
  pending: "Menunggu",
  queued: "Dalam Barisan",
  generating: "Menjana",
  generated: "Dijana",
  failed: "Gagal",
  under_review: "Semakan",
  approved: "Diluluskan",
  rejected: "Ditolak",
  attached: " Dipaut",
};

const APPROVAL_LABELS: Record<string, string> = {
  pending: "Menunggu",
  approved: "Diluluskan",
  rejected: "Ditolak",
};

function formatDate(date: Date | string | null): string {
  if (!date) return "—";
  const d = new Date(date);
  return d.toLocaleDateString("ms-MY", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function AdminVisualRequestsPage() {
  if (!hasDb()) {
    return (
      <div className="admin-placeholder">
        <header className="admin-page-header">
          <h1>Visual Requests</h1>
          <p className="admin-page-sub">Admin visual request management</p>
        </header>
        <div className="admin-placeholder-content">
          <p>Database tidak tersedia. Set <code>DATABASE_URL</code> untuk mengaktifkan ciri admin.</p>
        </div>
      </div>
    );
  }

  const { listVisualRequests } = await import("../../../lib/admin/visual-request-service");
  const requests = await listVisualRequests();

  return (
    <div className="admin-visual-requests">
      <header className="admin-page-header">
        <div className="admin-page-header-row">
          <div>
            <h1>Visual Requests</h1>
            <p className="admin-page-sub">{requests.length} permintaan visual</p>
          </div>
          <a href="/admin/visual-requests/new" className="admin-btn admin-btn-primary">
            + Permintaan Baharu
          </a>
        </div>
      </header>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Work</th>
              <th>Submission</th>
              <th>Role</th>
              <th>Provider</th>
              <th>Status</th>
              <th>Approval</th>
              <th>Dicipta</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {requests.length === 0 ? (
              <tr>
                <td colSpan={9} className="admin-table-empty">
                  Tiada permintaan visual.
                </td>
              </tr>
            ) : (
              requests.map((r) => (
                <tr key={r.id}>
                  <td>{r.id}</td>
                  <td>{r.work_id || "—"}</td>
                  <td>{r.submission_id || "—"}</td>
                  <td>
                    <span className={`admin-kind admin-kind-${r.visual_role}`}>
                      {r.visual_role}
                    </span>
                  </td>
                  <td>{r.provider}</td>
                  <td>
                    <span className={`admin-status admin-status-${r.status === "approved" || r.status === "attached" ? "published" : r.status === "rejected" || r.status === "failed" ? "archived" : "review"}`}>
                      {STATUS_LABELS[r.status] ?? r.status}
                    </span>
                  </td>
                  <td>{APPROVAL_LABELS[r.approval_state] ?? r.approval_state}</td>
                  <td>{formatDate(r.created_at)}</td>
                  <td>
                    <div className="admin-table-actions">
                      <a href={`/admin/visual-requests/${r.id}`} className="admin-btn admin-btn-sm">
                        Edit
                      </a>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
