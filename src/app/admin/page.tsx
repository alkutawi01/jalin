import { initContentRepository } from "../../lib/content";
import { getAllWorks } from "../../lib/content/workLoader";
import { hasDb } from "../../lib/db";
import { getDb } from "../../lib/db";
import { getEditorialHealth } from "../../lib/admin/editorial-health";
import { ExportReportButton } from "../../components/admin/ExportReportButton";
import { EditorialAuditHistory } from "../../components/admin/EditorialAuditHistory";
import { EditorialIssueQueue } from "../../components/admin/EditorialIssueQueue";
import { EditorialWorkflowDashboard } from "../../components/admin/EditorialWorkflowDashboard";
import { listWorks } from "../../lib/admin/work-service";
import { summarizeReadiness } from "../../lib/admin/publication-service";
import { countWorks } from "../../lib/admin/dashboard-counts";
import { buildContentChecks } from "../../lib/admin/dashboard-labels";

export const dynamic = "force-dynamic";

async function getStats() {
  if (!hasDb()) {
    return {
      contentSource: "markdown",
      counts: countWorks(getAllWorks().map((w) => ({ type: w.type, status: "published" }))),
      editorialHealth: null,
    };
  }

  const repo = await initContentRepository();
  const useDb = repo.source === "database";

  // Admin totals include drafts/review/ready, unlike the public repository.
  const works = await listWorks();
  
  let editorialHealth = null;
  try {
    editorialHealth = await getEditorialHealth();
  } catch (e) {
    // Ignore errors for now
  }

  return {
    contentSource: useDb ? "database" : "markdown",
    counts: countWorks(works),
    editorialHealth,
  };
}

const TYPE_LABELS: Record<string, string> = { cerpen: "Cerpen", novela: "Novela", bersiri: "Bersiri", fragmen: "Fragmen", sinopsis: "Sinopsis" };

const TODO_GROUPS: { status: string; title: string; hint: string }[] = [
  { status: "draft", title: "Draf untuk disiapkan", hint: "Lengkapkan gambar dan kredit, kemudian hantar untuk semakan." },
  { status: "review", title: "Menunggu semakan", hint: "Semak, kemudian tandakan sedia." },
  { status: "ready", title: "Sedia diterbitkan", hint: "Semua semakan lulus. Tekan Terbitkan bila anda bersedia." },
  { status: "blocked", title: "Bertanda sedia tetapi disekat", hint: "Status Sedia, tetapi satu semakan masih gagal. Buka untuk melihat puncanya." }
];

async function getTodo() {
  if (!hasDb()) return null;
  try {
    return await listWorks();
  } catch {
    return null;
  }
}

export default async function AdminDashboard() {
  const stats = await getStats();
  const works = await getTodo();
  const checks = stats.editorialHealth ? buildContentChecks(stats.editorialHealth) : null;
  // The same readiness service the Terbitkan button uses decides who is really ready.
  const verdicts = works ? await summarizeReadiness(works.filter((w) => w.status === "ready").map((w) => w.id)) : new Map();
  const inGroup = (w: { id: string; status: string }, g: string) =>
    g === "ready" ? w.status === "ready" && verdicts.get(w.id)?.ready !== false
    : g === "blocked" ? w.status === "ready" && verdicts.get(w.id)?.ready === false
    : w.status === g;

  return (
    <div className="admin-dashboard">
      <header className="admin-page-header">
        <h1>Papan Pemuka</h1>
        <p className="admin-page-sub">Pentadbiran Jalin</p>
      </header>

      <section className="admin-section" aria-label="Yang perlu dibuat">
        <h2>Yang perlu dibuat</h2>
        {works === null ? (
          <p className="admin-form-hint">Senarai kerja belum tersedia.</p>
        ) : TODO_GROUPS.every((g) => !works.some((w) => inGroup(w, g.status))) ? (
          <div className="a-empty">
            <strong>Tiada kerja tertunggak.</strong>
            Mulakan dengan butang Tambah Karya di sebelah kiri.
          </div>
        ) : (
          TODO_GROUPS.map((group) => {
            const items = works.filter((w) => inGroup(w, group.status));
            if (items.length === 0) return null;
            return (
              <div key={group.status} style={{ marginBottom: 18 }}>
                <h3 style={{ margin: "0 0 2px" }}>
                  {group.title} ({items.length})
                </h3>
                <p className="admin-form-hint" style={{ margin: "0 0 8px" }}>{group.hint}</p>
                <div className="admin-table-wrap">
                  <table className="admin-table a-todo-table">
                    <tbody>
                      {items.slice(0, 6).map((w) => (
                        <tr key={w.id}>
                          <td className="admin-table-title">
                            {w.title}
                            {group.status === "blocked" && verdicts.get(w.id)?.firstBlocker ? (
                              <span className="admin-form-hint" style={{ display: "block", margin: 0 }}>
                                {verdicts.get(w.id)?.firstBlocker}
                              </span>
                            ) : null}
                          </td>
                          <td>{TYPE_LABELS[w.type] ?? w.type}</td>
                          <td style={{ textAlign: "right" }}>
                            <a href={`/admin/works/${w.id}${group.status === "blocked" ? "#" + (verdicts.get(w.id)?.firstTab ?? "content") : ""}`} className="admin-btn admin-btn-sm admin-btn-primary">
                              Buka
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {items.length > 6 ? (
                  <p className="admin-form-hint">
                    <a href={`/admin/works?status=${group.status}`}>Lihat semua {items.length}</a>
                  </p>
                ) : null}
              </div>
            );
          })
        )}
      </section>

      <div className="admin-stats-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" }}>
        {([["Karya diterbitkan", stats.counts.total], ["Cerpen", stats.counts.byType.cerpen], ["Novela", stats.counts.byType.novela], ["Bersiri", stats.counts.byType.bersiri], ["Fragmen", stats.counts.byType.fragmen], ["Sinopsis", stats.counts.byType.sinopsis]] as const).map(([label, count]) => (
          <div className="admin-stat-card" key={label}>
            <div className="admin-stat-label">{label}</div>
            <div className="admin-stat-value">{count?.published ?? 0}</div>
            {count && count.pending > 0 ? <div className="admin-section-meta">+ {count.pending} belum diterbitkan</div> : null}
          </div>
        ))}
      </div>

      <section className="admin-section" aria-label="Semakan kandungan">
        <h2>Semakan kandungan</h2>
        {!checks ? (
          <p className="admin-form-hint">Semakan belum tersedia.</p>
        ) : checks.needAttention.length === 0 ? (
          <div className="a-empty">
            <strong>Semua semakan lulus.</strong>
            Tiada karya terbit yang perlu dibaiki.
          </div>
        ) : (
          <>
            {checks.needAttention.map((row) => (
              <div className="a-check" key={row.key}>
                <div className="a-check-head">
                  <h3>{row.title}</h3>
                  <span className={`a-chip a-chip-${row.status}`}>{row.statusLabel}</span>
                  <span className="admin-form-hint a-check-count">{row.total} karya</span>
                </div>
                <p className="admin-form-hint">{row.about}</p>
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <tbody>
                      {row.shown.map((item) => (
                        <tr key={item.href + item.message}>
                          <td className="admin-table-title">{item.message}</td>
                          <td style={{ textAlign: "right" }}>
                            <a href={item.href} className="admin-btn admin-btn-sm">{row.fix}</a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {row.hidden > 0 ? (
                  <p className="admin-form-hint">dan {row.hidden} lagi. <a href="/admin/works">Lihat senarai karya</a></p>
                ) : null}
              </div>
            ))}
            {checks.passed.length > 0 ? (
              <p className="admin-form-hint">Lulus: {checks.passed.join(", ")}.</p>
            ) : null}
          </>
        )}
      </section>

      <details className="admin-section a-tech">
        <summary>Alat pentadbir (jarang diperlukan)</summary>
        <div className="a-tech-body">
          <div>
            <h3>Semak dan segerakkan</h3>
            <EditorialWorkflowDashboard />
            <ExportReportButton />
          </div>
          <div>
            <h3>Sejarah semakan</h3>
            <EditorialAuditHistory />
          </div>
          <div>
            <h3>Isu yang direkodkan</h3>
            <EditorialIssueQueue />
          </div>
        </div>
      </details>
    </div>
  );
}
