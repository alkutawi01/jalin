"use client";

import { useState } from "react";
import { confirmAction, toast } from "../../../../lib/admin/dialogs";
import { api, fmtDate, Notice } from "../../../../components/admin/langganan-ui";

type Hit = { id: string; email: string; displayName: string | null; createdAt: string };
type Ledger = { id: string; kind: "TRIAL" | "CARD" | "SHARED" | "ADMIN"; startsAt: string; endsAt: string; revokedAt: string | null; reason: string | null; revokeReason: string | null };
type Detail = { id: string; email: string; displayName: string | null; createdAt: string; lastLoginAt: string | null; devices: number; access: { state: string; endsAt: string | null; currentPeriodEndsAt: string | null }; ledger: Ledger[] };

const KIND = { TRIAL: "Percubaan percuma", CARD: "Kad", SHARED: "Kod kongsi", ADMIN: "Diberi pemilik" } as const;
const STATE: Record<string, string> = { trial: "Dalam percubaan percuma", subscribed: "Melanggan", expired: "Akses tamat", none: "Tiada akses" };
const GRANTS = [
  { value: "days:7", label: "7 hari" }, { value: "days:14", label: "14 hari" },
  { value: "months:1", label: "1 bulan" }, { value: "months:6", label: "6 bulan" }, { value: "months:12", label: "12 bulan" },
];

/** Find a reader by e-mail, see their access period by period, give access (with a reason) or cancel a period (with a reason). */
export default function ReaderLookup() {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[] | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [error, setError] = useState("");
  const [grant, setGrant] = useState({ value: "months:1", reason: "" });
  const [cancelling, setCancelling] = useState<{ id: string; reason: string } | null>(null);

  async function search(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setDetail(null);
    if (q.trim().length < 3) { setError("Taip sekurang-kurangnya tiga huruf emel."); return; }
    try {
      const data = await api<{ readers: Hit[] }>(`/api/admin/langganan/pembaca?q=${encodeURIComponent(q.trim())}`, "GET");
      setHits(data.readers);
    } catch (err) { setError(err instanceof Error ? err.message : "Carian tidak berjaya."); }
  }

  async function open(id: string) {
    setError("");
    try {
      const data = await api<{ reader: Detail }>(`/api/admin/langganan/pembaca/${id}`, "GET");
      setDetail(data.reader);
      setCancelling(null);
    } catch (err) { setError(err instanceof Error ? err.message : "Tidak berjaya."); }
  }

  async function give(e: React.FormEvent) {
    e.preventDefault();
    if (!detail) return;
    setError("");
    if (!grant.reason.trim()) { setError("Sebab diperlukan."); return; }
    const [unit, amount] = grant.value.split(":");
    try {
      await api(`/api/admin/langganan/pembaca/${detail.id}/beri`, "POST", { unit, amount: Number(amount), reason: grant.reason });
      toast("Akses diberi.", "success");
      setGrant({ ...grant, reason: "" });
      await open(detail.id);
    } catch (err) { setError(err instanceof Error ? err.message : "Tidak berjaya."); }
  }

  async function cancel() {
    if (!detail || !cancelling) return;
    if (!cancelling.reason.trim()) { setError("Sebab diperlukan."); return; }
    if (!(await confirmAction("Batalkan tempoh akses ini? Tempoh selepasnya tidak dialihkan lebih awal.", { confirmLabel: "Ya, batalkan", danger: true }))) return;
    try {
      await api(`/api/admin/langganan/entitlements/${cancelling.id}/batal`, "POST", { reason: cancelling.reason });
      toast("Tempoh dibatalkan.", "success");
      await open(detail.id);
    } catch (err) { setError(err instanceof Error ? err.message : "Tidak berjaya."); }
  }

  return (
    <div className="admin-readers">
      {error ? <Notice kind="error">{error}</Notice> : null}
      <form onSubmit={search} className="admin-inline-form">
        <input aria-label="Emel pembaca" placeholder="Sebahagian emel pembaca" value={q} onChange={(e) => setQ(e.target.value)} />
        <button type="submit" className="admin-btn admin-btn-sm admin-btn-primary">Cari</button>
      </form>

      {hits && hits.length === 0 ? <p className="admin-form-hint">Tiada pembaca dijumpai.</p> : null}
      {hits && hits.length > 0 ? (
        <ul className="admin-user-list">
          {hits.map((h) => (
            <li key={h.id} className="admin-user-card">
              <div className="admin-user-main"><strong>{h.email}</strong>{h.displayName ? ` (${h.displayName})` : ""}<div className="admin-form-hint">Mendaftar {fmtDate(h.createdAt)}</div></div>
              <button type="button" className="admin-btn admin-btn-sm" onClick={() => void open(h.id)}>Buka</button>
            </li>
          ))}
        </ul>
      ) : null}

      {detail ? (
        <section className="admin-reader-detail">
          <h2>{detail.email}</h2>
          <p>{STATE[detail.access.state] ?? detail.access.state}{detail.access.endsAt ? ` · akses sehingga ${fmtDate(detail.access.endsAt, true)}` : ""} · {detail.devices} peranti · log masuk terakhir {detail.lastLoginAt ? fmtDate(detail.lastLoginAt, true) : "tiada"}</p>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr><th>Jenis</th><th>Mula</th><th>Tamat</th><th>Sebab</th><th></th></tr></thead>
              <tbody>
                {detail.ledger.map((l) => (
                  <tr key={l.id}>
                    <td>{KIND[l.kind]}{l.revokedAt ? <div className="admin-form-hint">Dibatalkan: {l.revokeReason}</div> : null}</td>
                    <td>{fmtDate(l.startsAt, true)}</td>
                    <td>{fmtDate(l.endsAt, true)}</td>
                    <td>{l.reason ?? ""}</td>
                    <td>
                      {!l.revokedAt ? (
                        cancelling?.id === l.id ? (
                          <span className="admin-inline-form">
                            <input aria-label="Sebab pembatalan" placeholder="Sebab" value={cancelling.reason} onChange={(e) => setCancelling({ id: l.id, reason: e.target.value })} />
                            <button type="button" className="admin-btn admin-btn-sm admin-btn-danger" onClick={() => void cancel()}>Sahkan batal</button>
                            <button type="button" className="admin-btn admin-btn-sm admin-btn-outline" onClick={() => setCancelling(null)}>Tidak</button>
                          </span>
                        ) : <button type="button" className="admin-btn admin-btn-sm admin-btn-outline" onClick={() => setCancelling({ id: l.id, reason: "" })}>Batalkan</button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <h3>Beri akses</h3>
          <form onSubmit={give} className="admin-inline-form">
            <select aria-label="Tempoh" value={grant.value} onChange={(e) => setGrant({ ...grant, value: e.target.value })}>{GRANTS.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}</select>
            <input aria-label="Sebab" placeholder="Sebab (cth ganti kad rosak)" value={grant.reason} onChange={(e) => setGrant({ ...grant, reason: e.target.value })} />
            <button type="submit" className="admin-btn admin-btn-sm admin-btn-primary">Beri akses</button>
          </form>
          <p className="admin-form-hint">Akses bermula selepas akses yang pembaca sudah ada.</p>
        </section>
      ) : null}
    </div>
  );
}
