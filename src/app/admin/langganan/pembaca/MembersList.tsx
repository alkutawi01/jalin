"use client";

import { useCallback, useEffect, useState } from "react";
import { errorText } from "../../../../lib/admin/error-text";
import { api, fmtDate, Notice } from "../../../../components/admin/langganan-ui";

type Status = "percubaan" | "aktif" | "tamat" | "tiada";
type Member = { id: string; email: string; displayName: string | null; createdAt: string; lastLoginAt: string | null; status: Status; endsAt: string | null; source: string | null; devices: number };
type Result = { rows: Member[]; total: number; page: number; pageSize: number; counts: Record<Status | "semua", number> };

const LABEL: Record<Status | "semua", string> = { semua: "Semua", percubaan: "Percubaan", aktif: "Aktif", tamat: "Tamat", tiada: "Tiada akses" };

/** All members: how many are in each state, and the list with the end date of their access. Search by e-mail or name. */
export default function MembersList() {
  const [status, setStatus] = useState<Status | "semua">("semua");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Result | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setData(await api<Result>(`/api/admin/langganan/ahli?status=${status}&q=${encodeURIComponent(q)}&halaman=${page}`, "GET"));
      setError("");
    } catch (e) {
      setError(errorText(e, "Senarai ahli tidak dapat dimuatkan."));
    }
  }, [status, q, page]);
  useEffect(() => { const t = setTimeout(() => void load(), q ? 250 : 0); return () => clearTimeout(t); }, [load, q]);

  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  return (
    <section aria-label="Senarai ahli">
      <h2>Semua ahli</h2>
      {error ? <Notice kind="error">{error}</Notice> : null}
      <div className="admin-inline-form" role="group" aria-label="Tapis mengikut status">
        {(Object.keys(LABEL) as (Status | "semua")[]).map((s) => (
          <button key={s} type="button" className={`admin-btn admin-btn-sm ${status === s ? "admin-btn-primary" : "admin-btn-outline"}`} aria-pressed={status === s} onClick={() => { setStatus(s); setPage(1); }}>
            {LABEL[s]}{data ? ` (${data.counts[s]})` : ""}
          </button>
        ))}
      </div>
      <div className="admin-form-group">
        <label htmlFor="members-q">Cari emel atau nama</label>
        <input id="members-q" type="search" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="sebahagian emel atau nama" />
      </div>
      <p><a className="admin-btn admin-btn-sm admin-btn-outline" href="/api/admin/langganan/ahli/csv">Muat turun CSV (data peribadi)</a></p>
      {!data ? <p className="admin-form-hint">Memuatkan…</p> : (
        <>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr><th scope="col">Emel</th><th scope="col">Status</th><th scope="col">Akses hingga</th><th scope="col">Sumber</th><th scope="col">Daftar</th><th scope="col">Log masuk akhir</th><th scope="col">Peranti</th></tr></thead>
              <tbody>
                {data.rows.map((m) => (
                  <tr key={m.id}>
                    <td><a href={`/admin/langganan/pembaca?id=${m.id}`}>{m.email}</a>{m.displayName ? <div className="admin-form-hint">{m.displayName}</div> : null}</td>
                    <td>{LABEL[m.status]}</td>
                    <td>{m.endsAt ? fmtDate(m.endsAt) : "—"}</td>
                    <td>{m.source ?? "—"}</td>
                    <td>{fmtDate(m.createdAt)}</td>
                    <td>{m.lastLoginAt ? fmtDate(m.lastLoginAt) : "—"}</td>
                    <td>{m.devices}</td>
                  </tr>
                ))}
                {data.rows.length === 0 ? <tr><td colSpan={7}>Tiada ahli yang sepadan.</td></tr> : null}
              </tbody>
            </table>
          </div>
          {pages > 1 ? (
            <p className="admin-inline-form">
              <button type="button" className="admin-btn admin-btn-sm admin-btn-outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>Sebelumnya</button>
              <span> Halaman {page} / {pages} ({data.total} ahli) </span>
              <button type="button" className="admin-btn admin-btn-sm admin-btn-outline" disabled={page >= pages} onClick={() => setPage(page + 1)}>Seterusnya</button>
            </p>
          ) : <p className="admin-form-hint">{data.total} ahli.</p>}
        </>
      )}
    </section>
  );
}
