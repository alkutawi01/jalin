"use client";

import { useState } from "react";
import { confirmAction, toast } from "../../../../lib/admin/dialogs";
import { api, fmtDate, Notice } from "../../../../components/admin/langganan-ui";

type Row = { id: string; code: string; grantText: string; maxRedemptions: number; redeemedCount: number; expiresAt: string | null; status: "active" | "paused" | "revoked"; channel: string | null; note: string | null; createdAt: string };

const STATUS = { active: "Aktif", paused: "Dijeda", revoked: "Dibatalkan" } as const;
const GRANTS = [
  { value: "days:7", label: "7 hari" }, { value: "days:14", label: "14 hari" },
  { value: "months:1", label: "1 bulan" }, { value: "months:6", label: "6 bulan" }, { value: "months:12", label: "12 bulan" },
];

/** Shared codes: one code many readers may use, up to a limit, once each (for a Telegram channel, an event). */
export default function SharedManager({ initialRows }: { initialRows: Row[] }) {
  const [rows, setRows] = useState(initialRows);
  const [form, setForm] = useState({ grant: "months:1", max: "50", expiresAt: "", channel: "Telegram", note: "" });
  const [error, setError] = useState("");
  const [made, setMade] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState("");

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setMade(null);
    const [unit, amount] = form.grant.split(":");
    setBusy(true);
    try {
      const data = await api<{ code: string; id: string }>("/api/admin/langganan/kod-kongsi", "POST", { unit, amount: Number(amount), maxRedemptions: Number(form.max), expiresAt: form.expiresAt, channel: form.channel, note: form.note });
      setMade(data.code);
      toast("Kod kongsi dibuat.", "success");
      const list = await api<{ codes: Row[] }>("/api/admin/langganan/kod-kongsi", "GET");
      setRows(list.codes);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kod tidak dapat dibuat.");
    } finally {
      setBusy(false);
    }
  }

  async function setStatus(row: Row, status: Row["status"]) {
    if (status === "revoked" && !(await confirmAction(`Batalkan kod ${row.code}? Ia tidak boleh disambung semula. Akses yang sudah diberi kekal.`, { confirmLabel: "Ya, batalkan", danger: true }))) return;
    setError("");
    try {
      await api(`/api/admin/langganan/kod-kongsi/${row.id}`, "PATCH", { status });
      setRows((list) => list.map((r) => (r.id === row.id ? { ...r, status } : r)));
      toast(status === "active" ? "Kod disambung semula." : status === "paused" ? "Kod dijeda." : "Kod dibatalkan.", "success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Tidak berjaya.");
    }
  }

  async function copy(code: string) {
    try { await navigator.clipboard.writeText(code); setCopied(code); setTimeout(() => setCopied(""), 1500); } catch { /* the code is on screen; it can be selected */ }
  }

  return (
    <div className="admin-shared">
      {error ? <Notice kind="error">{error}</Notice> : null}
      <h2>Buat kod kongsi</h2>
      <form className="admin-batch-form" onSubmit={create}>
        <div className="admin-form-group">
          <label htmlFor="sk-grant">Akses yang diberi kepada setiap penebus</label>
          <select id="sk-grant" value={form.grant} onChange={(e) => setForm({ ...form, grant: e.target.value })}>{GRANTS.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}</select>
          <p className="admin-form-hint">Ditambah selepas akses yang pembaca sudah ada, termasuk percubaan percuma.</p>
        </div>
        <div className="admin-form-group">
          <label htmlFor="sk-max">Bilangan penebusan maksimum</label>
          <input id="sk-max" type="number" min="1" max="100000" value={form.max} onChange={(e) => setForm({ ...form, max: e.target.value })} />
          <p className="admin-form-hint">Apabila penuh, kod berhenti berfungsi. Setiap akaun hanya boleh menebus sekali.</p>
        </div>
        <div className="admin-form-group">
          <label htmlFor="sk-exp">Hari terakhir (pilihan)</label>
          <input id="sk-exp" type="date" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} />
          <p className="admin-form-hint">Kod boleh digunakan sehingga hujung hari ini (waktu Malaysia). Kosongkan jika tiada had masa.</p>
        </div>
        <div className="admin-form-group">
          <label htmlFor="sk-ch">Saluran</label>
          <input id="sk-ch" value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value })} />
        </div>
        <div className="admin-form-group">
          <label htmlFor="sk-note">Nota (pilihan)</label>
          <input id="sk-note" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
        </div>
        <button type="submit" className="admin-btn admin-btn-primary" disabled={busy}>{busy ? "Membuat…" : "Buat kod kongsi"}</button>
      </form>
      {made ? (
        <Notice kind="success">
          Kod kongsi baharu: <strong className="admin-code-big">{made}</strong>{" "}
          <button type="button" className="admin-btn admin-btn-sm" onClick={() => void copy(made)}>{copied === made ? "Disalin" : "Salin"}</button>
        </Notice>
      ) : null}

      <h2>Kod kongsi</h2>
      {rows.length === 0 ? <p className="admin-form-hint">Belum ada kod kongsi.</p> : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead><tr><th>Kod</th><th>Akses</th><th>Digunakan</th><th>Hari terakhir</th><th>Status</th><th>Tindakan</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td><strong className="admin-code-big">{r.code}</strong><div className="admin-form-hint">{r.channel ?? ""}{r.note ? ` · ${r.note}` : ""}</div></td>
                  <td>{r.grantText}</td>
                  <td>{r.redeemedCount} / {r.maxRedemptions}</td>
                  <td>{r.expiresAt ? fmtDate(r.expiresAt) : "Tiada"}</td>
                  <td>{STATUS[r.status]}</td>
                  <td>
                    <button type="button" className="admin-btn admin-btn-sm admin-btn-outline" onClick={() => void copy(r.code)}>{copied === r.code ? "Disalin" : "Salin"}</button>{" "}
                    {r.status === "active" ? <button type="button" className="admin-btn admin-btn-sm" onClick={() => void setStatus(r, "paused")}>Jeda</button> : null}
                    {r.status === "paused" ? <button type="button" className="admin-btn admin-btn-sm admin-btn-primary" onClick={() => void setStatus(r, "active")}>Sambung</button> : null}
                    {r.status !== "revoked" ? <>{" "}<button type="button" className="admin-btn admin-btn-sm admin-btn-danger" onClick={() => void setStatus(r, "revoked")}>Batalkan</button></> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
