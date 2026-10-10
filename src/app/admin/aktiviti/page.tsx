import { getDb, hasDb } from "../../../lib/db";
import { getCurrentAdmin } from "../../../lib/admin/auth";
import { ACTIVITY_PAGE_SIZE, listActivity, listActors, type ActivityRow } from "../../../lib/admin/activity";
import type { Role } from "../../../lib/admin/permissions";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

const ROLE_LABELS: Record<Role, string> = { owner: "Pemilik", chief_editor: "Ketua penyunting", editor: "Penyunting" };

const when = (iso: string) => new Date(iso).toLocaleString("ms-MY", { timeZone: "Asia/Kuala_Lumpur", dateStyle: "medium", timeStyle: "short" });

const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) || undefined;

/** Aktiviti: who changed what, newest first. Only the owner and the chief editor open it (permissions.ts). */
export default async function ActivityPage({ searchParams }: { searchParams: Promise<{ orang?: string | string[]; karya?: string | string[] }> }) {
  const query = await searchParams;
  const admin = await getCurrentAdmin();
  if (!admin || (admin.role !== "admin" && admin.role !== "chief_editor")) notFound();
  const isOwner = admin?.role === "admin";
  const actorId = one(query.orang);
  const workId = one(query.karya);

  let rows: ActivityRow[] = [];
  let actors: { id: string; name: string }[] = [];
  const titles = new Map<string, string>();
  let problem: string | null = null;
  if (!hasDb()) {
    problem = "Pangkalan data tidak tersedia.";
  } else {
    try {
      [rows, actors] = await Promise.all([listActivity({ actorId, workId, includeSubscription: isOwner }), listActors()]);
      const ids = [...new Set(rows.map((row) => row.workId).filter((id): id is string => Boolean(id)))];
      if (ids.length > 0) {
        for (const work of await getDb().selectFrom("works").select(["id", "title"]).where("id", "in", ids).execute()) titles.set(work.id, work.title);
      }
    } catch {
      // Most likely migration 026 has not been applied on this database yet.
      problem = "Jadual aktiviti belum wujud. Migration 026 perlu dijalankan dahulu.";
    }
  }

  return (
    <div className="admin-activity">
      <header className="admin-page-header">
        <h1>Aktiviti</h1>
        <p className="admin-page-sub">Siapa mengubah apa: kredit, karya, bahagian dan gambar. Catatan bermula dari hari ia dihidupkan; {ACTIVITY_PAGE_SIZE} yang terkini dipaparkan.</p>
      </header>
      {problem ? (
        <div className="admin-alert admin-alert-error" role="alert">{problem}</div>
      ) : (
        <>
          <form method="get" className="admin-activity-filter">
            <div className="admin-form-group">
              <label htmlFor="aktiviti-orang">Orang</label>
              <select id="aktiviti-orang" name="orang" defaultValue={actorId ?? ""}>
                <option value="">Semua orang</option>
                {actors.map((actor) => <option key={actor.id} value={actor.id}>{actor.name}</option>)}
              </select>
            </div>
            {workId ? <input type="hidden" name="karya" value={workId} /> : null}
            <button type="submit" className="admin-btn">Tapis</button>
            {actorId || workId ? <a className="admin-btn" href="/admin/aktiviti">Semua aktiviti</a> : null}
          </form>
          {rows.length === 0 ? (
            <p className="admin-form-hint">Belum ada aktiviti{actorId || workId ? " untuk tapisan ini" : ""}.</p>
          ) : (
            <ul className="admin-user-list">
              {rows.map((row) => (
                <li key={row.id} className="admin-user-card">
                  <div className="admin-user-main">
                    <strong>{row.actionLabel}</strong>: {row.summary}
                    <div className="admin-form-hint">
                      {row.actorName} ({ROLE_LABELS[row.actorRole]}) · {when(row.at)}
                      {row.workId ? <> · <a href={`/admin/works/${row.workId}`}>{titles.get(row.workId) ?? row.workId}</a> · <a href={`/admin/aktiviti?karya=${encodeURIComponent(row.workId)}`}>Semua tentang karya ini</a></> : null}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
