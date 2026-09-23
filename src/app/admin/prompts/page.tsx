import { hasDb } from "../../../lib/db";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, string> = {
  active: "Aktif",
  inactive: "Tidak Aktif",
};

const SCOPE_LABELS: Record<string, string> = {
  global: "Global",
  category: "Kategori",
  work: "Karya",
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

export default async function AdminPromptsPage() {
  if (!hasDb()) {
    return (
      <div className="admin-placeholder">
        <header className="admin-page-header">
          <h1>Prompt Templates</h1>
          <p className="admin-page-sub">Admin prompt template management</p>
        </header>
        <div className="admin-placeholder-content">
          <p>Database tidak tersedia. Set <code>DATABASE_URL</code> untuk mengaktifkan ciri admin.</p>
        </div>
      </div>
    );
  }

  const { listPromptTemplates } = await import("../../../lib/admin/prompt-template-service");
  const templates = await listPromptTemplates();

  return (
    <div className="admin-prompts">
      <header className="admin-page-header">
        <div className="admin-page-header-row">
          <div>
            <h1>Prompt Templates</h1>
            <p className="admin-page-sub">{templates.length} template dalam database</p>
          </div>
          <a href="/admin/prompts/new" className="admin-btn admin-btn-primary">
            + Template Baharu
          </a>
        </div>
      </header>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Nama</th>
              <th>Skop</th>
              <th>Jenis Karya</th>
              <th>Versi</th>
              <th>Status</th>
              <th>Dikemas kini</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {templates.length === 0 ? (
              <tr>
                <td colSpan={8} className="admin-table-empty">
                  Tiada prompt template dalam database.
                </td>
              </tr>
            ) : (
              templates.map((t) => (
                <tr key={t.id}>
                  <td>{t.id}</td>
                  <td className="admin-table-title">{t.name}</td>
                  <td>{SCOPE_LABELS[t.scope] ?? t.scope}</td>
                  <td>{t.work_type || "—"}</td>
                  <td>{t.version}</td>
                  <td>
                    <span className={`admin-status admin-status-${t.status === "active" ? "published" : "archived"}`}>
                      {STATUS_LABELS[t.status] ?? t.status}
                    </span>
                  </td>
                  <td>{formatDate(t.updated_at)}</td>
                  <td>
                    <div className="admin-table-actions">
                      <a href={`/admin/prompts/${t.id}`} className="admin-btn admin-btn-sm">
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
