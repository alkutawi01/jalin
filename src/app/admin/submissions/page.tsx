import { hasDb } from "../../../lib/db";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, string> = {
  draft: "Draf",
  submitted: "Dihantar",
  under_review: "Dalam Semakan",
  changes_requested: "Perubahan Diminta",
  approved: "Diluluskan",
  rejected: "Ditolak",
  published: "Diterbitkan",
};

const SUBMITTER_LABELS: Record<string, string> = {
  human: "Manusia",
  ai: "AI",
  guest: "Tetamu",
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

export default async function AdminSubmissionsPage() {
  if (!hasDb()) {
    return (
      <div className="admin-placeholder">
        <header className="admin-page-header">
          <h1>Submissions</h1>
          <p className="admin-page-sub">Admin submissions management</p>
        </header>
        <div className="admin-placeholder-content">
          <p>Database tidak tersedia. Set <code>DATABASE_URL</code> untuk mengaktifkan ciri admin.</p>
        </div>
      </div>
    );
  }

  const { listSubmissions } = await import("../../../lib/admin/submission-service");
  const submissions = await listSubmissions();

  return (
    <div className="admin-submissions">
      <header className="admin-page-header">
        <div className="admin-page-header-row">
          <div>
            <h1>Submissions</h1>
            <p className="admin-page-sub">{submissions.length} submissions dalam database</p>
          </div>
          <a href="/admin/submissions/new" className="admin-btn admin-btn-primary">
            + Submission Baharu
          </a>
        </div>
      </header>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Tajuk</th>
              <th>Jenis</th>
              <th>Status</th>
              <th>Penyerah</th>
              <th>Dicipta</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {submissions.length === 0 ? (
              <tr>
                <td colSpan={7} className="admin-table-empty">
                  Tiada submissions dalam database.
                </td>
              </tr>
            ) : (
              submissions.map((sub) => (
                <tr key={sub.id}>
                  <td>{sub.id}</td>
                  <td className="admin-table-title">{sub.proposed_title || "—"}</td>
                  <td>{sub.proposed_type || "—"}</td>
                  <td>
                    <span className={`admin-status admin-status-${sub.status === "approved" ? "published" : sub.status === "rejected" ? "archived" : "review"}`}>
                      {STATUS_LABELS[sub.status] ?? sub.status}
                    </span>
                  </td>
                  <td>{SUBMITTER_LABELS[sub.submitter_type] ?? sub.submitter_type}</td>
                  <td>{formatDate(sub.created_at)}</td>
                  <td>
                    <div className="admin-table-actions">
                      <a href={`/admin/submissions/${sub.id}`} className="admin-btn admin-btn-sm">
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
