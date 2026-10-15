import { sql } from "kysely";
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
import { hasDedicatedAdminSessionKey } from "../../lib/admin/session-key";
import { isUntouchedProvisionalDraft } from "../../lib/admin/provisional-draft";

export const dynamic = "force-dynamic";

/** Whether uploaded pictures have somewhere lasting to go (the state of the system, shown under Status sistem). */
function imageStorageSet(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN || process.env.OBJECT_STORAGE_BUCKET || process.env.OBJECT_STORAGE_ENDPOINT);
}

async function loadSeriesOf(): Promise<Map<string, string>> {
  try {
    const rows = await getDb().selectFrom("series_entries").select(["series_id", "work_id"]).execute();
    return new Map(rows.map((r) => [String(r.work_id), String(r.series_id)]));
  } catch {
    return new Map();
  }
}

/** A real round trip to the database, not only "is DATABASE_URL set": the green chip must mean it answered. */
async function pingDatabase(): Promise<{ ok: boolean; message: string | null }> {
  if (!hasDb()) return { ok: false, message: "DATABASE_URL belum ditetapkan." };
  try {
    await Promise.race([
      sql`select 1`.execute(getDb()),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Pangkalan data tidak menjawab dalam 4 saat.")), 4000))
    ]);
    return { ok: true, message: null };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message.slice(0, 160) : "Ralat tidak diketahui." };
  }
}

function reasonOf(error: unknown): string {
  return error instanceof Error && error.message ? error.message.slice(0, 160) : "Ralat tidak diketahui.";
}

async function getStats() {
  if (!hasDb()) {
    return {
      contentSource: "markdown",
      counts: countWorks(getAllWorks().map((w) => ({ type: w.type, status: "published" }))),
      editorialHealth: null,
      healthError: null as string | null,
      entries: null as { works: number; episodes: number } | null,
    };
  }

  const repo = await initContentRepository();
  const useDb = repo.source === "database";

  // Admin totals include drafts/review/ready, unlike the public repository.
  const works = (await listWorks()).filter((work) => !isUntouchedProvisionalDraft(work));
  
  let editorialHealth = null;
  let healthError: string | null = null;
  try {
    editorialHealth = await getEditorialHealth();
  } catch (e) {
    healthError = reasonOf(e);
  }

  return {
    contentSource: useDb ? "database" : "markdown",
    counts: countWorks(works, await loadSeriesOf()),
    editorialHealth,
    healthError,
    // The cards count a series once; the list of works shows every episode as a work of its own. Both numbers are told.
    entries: {
      works: works.filter((work) => work.status === "published").length,
      episodes: works.filter((work) => work.status === "published" && work.type === "bersiri").length
    } as { works: number; episodes: number } | null,
  };
}

const TYPE_LABELS: Record<string, string> = { cerpen: "Cerpen", novela: "Novela", bersiri: "Bersiri", fragmen: "Fragmen", sinopsis: "Sinopsis" };

const TODO_GROUPS: { status: string; title: string; hint: string }[] = [
  { status: "draft", title: "Draf untuk disiapkan", hint: "Lengkapkan gambar dan kredit, kemudian hantar untuk semakan." },
  { status: "review", title: "Menunggu semakan", hint: "Semak, kemudian tandakan sedia." },
  { status: "ready", title: "Sedia diterbitkan", hint: "Semua semakan lulus. Tekan Terbitkan bila anda bersedia." },
  { status: "blocked", title: "Bertanda sedia tetapi disekat", hint: "Status Sedia, tetapi satu semakan masih gagal. Buka untuk melihat puncanya." }
];

async function getTodo(): Promise<{ works: Awaited<ReturnType<typeof listWorks>> | null; error: string | null }> {
  if (!hasDb()) return { works: null, error: "Pangkalan data tidak tersedia." };
  try {
    return { works: (await listWorks()).filter((work) => !isUntouchedProvisionalDraft(work)), error: null };
  } catch (e) {
    return { works: null, error: reasonOf(e) };
  }
}

export default async function AdminDashboard({ searchParams }: { searchParams?: Promise<{ terhad?: string | string[] }> }) {
  // The page a person asked for is not for their role (see middleware.ts): say so instead of landing here without a word.
  const notAllowed = ((await searchParams)?.terhad ?? "") === "1";
  const stats = await getStats();
  const { works, error: todoError } = await getTodo();
  const dbCheck = await pingDatabase();
  const storageSet = imageStorageSet();
  const sessionKeyOk = hasDedicatedAdminSessionKey();
  const systemOk = dbCheck.ok && storageSet && sessionKeyOk;
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
        <h1>Papan pemuka</h1>
        <p className="admin-page-sub">Pentadbiran Jalin</p>
      </header>

      {notAllowed ? (
        <div className="admin-alert admin-alert-error" role="alert">
          Halaman itu tidak dibuka kerana peranan anda tidak mempunyai kebenaran untuknya. Hubungi pemilik jika anda memerlukannya.{" "}
          <a href="/admin">Tutup</a>
        </div>
      ) : null}

      <section className="admin-section" aria-label="Yang perlu dibuat">
        <h2>Yang perlu dibuat</h2>
        {works === null ? (
          <div className="admin-alert admin-alert-warning" role="alert">
            <strong>Senarai kerja tidak dapat dimuat.</strong> {todoError ?? "Sebab tidak diketahui."} <a href="/admin">Cuba lagi</a>
          </div>
        ) : TODO_GROUPS.every((g) => !works.some((w) => inGroup(w, g.status))) ? (
          <div className="a-empty a-empty-compact">
            <span><strong>Tiada kerja tertunggak.</strong> Mulakan dengan karya baharu.</span>
            <a href="/admin/works/add" className="admin-btn admin-btn-primary admin-btn-sm">Tambah karya</a>
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
                    <thead className="a-visually-hidden"><tr><th scope="col">Tajuk</th><th scope="col">Jenis</th><th scope="col">Tindakan</th></tr></thead>
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

      <div className="a-stats-wrap">
      <div className="admin-stats-grid a-stats" role="group" aria-label="Bilangan karya mengikut jenis">
        {([
          ["Jumlah diterbitkan", stats.counts.total, "/admin/works?status=published"],
          ["Cerpen", stats.counts.byType.cerpen, "/admin/works?type=cerpen&status=published"],
          ["Novela", stats.counts.byType.novela, "/admin/works?type=novela&status=published"],
          // A series is one card here; its episodes are works of their own, so the list to open is the list of series.
          ["Bersiri", stats.counts.byType.bersiri, "/admin/series"],
          ["Fragmen", stats.counts.byType.fragmen, "/admin/works?type=fragmen&status=published"],
          ["Sinopsis", stats.counts.byType.sinopsis, "/admin/works?type=sinopsis&status=published"]
        ] as const).map(([label, count, href]) => (
          <a className={`admin-stat-card a-stat-link${label === "Jumlah diterbitkan" ? " is-total" : ""}`} key={label} href={href} aria-label={`${label}: ${count?.published ?? 0}. Buka senarai.`}>
            <div className="admin-stat-label">{label}</div>
            <div className="admin-stat-value">{count?.published ?? 0}</div>
            {label === "Bersiri" && stats.entries ? <div className="admin-section-meta">{stats.entries.episodes} episod diterbitkan</div> : null}
            {label === "Jumlah diterbitkan" && stats.entries ? <div className="admin-section-meta">{stats.entries.works} termasuk setiap episod</div> : null}
            {count && count.pending > 0 ? <div className="admin-section-meta">+ {count.pending} belum diterbitkan</div> : null}
          </a>
        ))}
      </div>
      </div>

      <section className="admin-section a-system" id="status-sistem" aria-label="Status sistem">
        {systemOk ? (
          <p className="a-system-line">
            <strong>Sistem baik.</strong> Pangkalan data menjawab; storan gambar dan kunci sesi sudah dikonfigurasi (storan tidak diuji dengan memuat naik).
          </p>
        ) : (
          <>
            <h2>Status sistem</h2>
            {!sessionKeyOk ? <div className="admin-alert admin-alert-warning" role="alert">ADMIN_SESSION_KEY belum ditetapkan. Sesi pentadbir masih menggunakan kunci log masuk lama untuk tandatangan.</div> : null}
            <ul className="a-system-status">
              <li>
                <span>Pangkalan data</span>
                <span className={`a-chip ${dbCheck.ok ? "a-chip-pass" : "a-chip-fail"}`}>{dbCheck.ok ? "Menjawab" : "Tidak dapat dihubungi"}</span>
                {dbCheck.ok ? null : <span className="admin-form-hint">{dbCheck.message}</span>}
              </li>
              <li>
                <span>Storan gambar</span>
                <span className={`a-chip ${storageSet ? "a-chip-neutral" : "a-chip-warning"}`}>{storageSet ? "Dikonfigurasi (tidak diuji)" : "Belum dikonfigurasi"}</span>
                {storageSet ? null : <span className="admin-form-hint">Gambar yang dimuat naik tidak kekal.</span>}
              </li>
            </ul>
          </>
        )}
      </section>

      <section className="admin-section" aria-label="Semakan kandungan">
        <h2>Semakan kandungan</h2>
        {!checks ? (
          <div className="admin-alert admin-alert-warning" role="alert">
            <strong>Semakan kandungan tidak dapat dijalankan.</strong> {stats.healthError ?? "Pangkalan data tidak tersedia."} <a href="/admin">Cuba lagi</a>
          </div>
        ) : checks.needAttention.length === 0 ? (
          <p className="a-empty a-empty-compact">
            <span><strong>Semua semakan lulus.</strong> {stats.counts.total.published} karya terbit disemak, 0 isu · disemak {new Date().toLocaleTimeString("ms-MY", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kuala_Lumpur" })}.</span>
          </p>
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
                    <thead className="a-visually-hidden"><tr><th scope="col">Isu</th><th scope="col">Tindakan</th></tr></thead>
                    <tbody>
                      {row.shown.map((item) => (
                        <tr key={item.href + item.message}>
                          <td className="admin-table-title">{item.message}</td>
                          <td style={{ textAlign: "right" }}>
                            <a href={item.href} className="admin-btn admin-btn-sm">{item.fix ?? row.fix}</a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {row.hidden > 0 ? (
                  <p className="admin-form-hint">dan {row.hidden} lagi. <a href="/admin/works">Lihat senarai kandungan</a></p>
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
        <summary>Alat lanjutan</summary>
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
