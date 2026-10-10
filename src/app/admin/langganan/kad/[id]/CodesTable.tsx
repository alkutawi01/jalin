"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { confirmAction, toast } from "../../../../../lib/admin/dialogs";
import { errorText } from "../../../../../lib/admin/error-text";
import { api, fmtDate, Notice } from "../../../../../components/admin/langganan-ui";

type Row = { serial: string; state: "generated" | "issued" | "revoked"; issuedAt: string | null; revokedAt: string | null; revokeReason: string | null; redeemedAt: string | null; redeemedBy: string | null; accessEndsAt: string | null };
type Page = { rows: Row[]; total: number; page: number; pageSize: number };

const FILTERS: { value: string; label: string }[] = [
  { value: "all", label: "Semua" },
  { value: "unredeemed", label: "Belum ditebus" },
  { value: "redeemed", label: "Sudah ditebus" },
  { value: "generated", label: "Belum diaktifkan" },
  { value: "issued", label: "Diaktifkan" },
  { value: "revoked", label: "Dibatalkan" },
];

function statusOf(row: Row): { text: string; tone: "ok" | "wait" | "off" | "done" } {
  if (row.redeemedAt) return { text: "Ditebus", tone: "done" };
  if (row.state === "revoked") return { text: "Dibatalkan", tone: "off" };
  if (row.state === "issued") return { text: "Diaktifkan, belum ditebus", tone: "ok" };
  return { text: "Belum diaktifkan", tone: "wait" };
}

/** Every card of one batch: its state, when it was switched on and redeemed, by whom; cancel unredeemed cards (several at once) or replace one. */
export default function CodesTable({ batchId, batchNumber, batchStatus }: { batchId: string; batchNumber: string; batchStatus: string }) {
  const [filter, setFilter] = useState("all");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Page | null>(null);
  const [error, setError] = useState("");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api<{ codes: Page }>(`/api/admin/langganan/batch/${batchId}?tapis=${filter}&q=${encodeURIComponent(q)}&halaman=${page}`, "GET");
      setData(res.codes);
      setError("");
    } catch (e) {
      setError(errorText(e, "Senarai kad tidak dapat dimuatkan."));
    }
  }, [batchId, filter, q, page]);
  useEffect(() => { void load(); }, [load]);

  const actionable = useMemo(() => (data?.rows ?? []).filter((r) => !r.redeemedAt && r.state !== "revoked"), [data]);
  const allPicked = actionable.length > 0 && actionable.every((r) => picked.has(r.serial));
  const toggle = (serial: string) => setPicked((s) => { const n = new Set(s); if (n.has(serial)) n.delete(serial); else n.add(serial); return n; });

  async function revokePicked() {
    if (picked.size === 0) return;
    if (!reason.trim()) { setError("Tulis sebab pembatalan."); return; }
    if (!(await confirmAction(`Batalkan ${picked.size} kad yang belum ditebus? Kod ini tidak boleh ditebus lagi.`, { confirmLabel: "Ya, batalkan", danger: true }))) return;
    setBusy(true); setError("");
    try {
      const res = await api<{ revoked: number; skipped: { serial: string; why: string }[] }>(`/api/admin/langganan/batch/${batchId}`, "POST", { action: "revoke_codes", serials: [...picked], reason });
      toast(`${res.revoked} kad dibatalkan${res.skipped.length ? `, ${res.skipped.length} dilangkau` : ""}.`, "success");
      setPicked(new Set()); setReason("");
      await load();
    } catch (e) {
      setError(errorText(e, "Tidak berjaya."));
    } finally {
      setBusy(false);
    }
  }

  async function replace(row: Row) {
    if (!reason.trim()) { setError("Tulis sebab penggantian dahulu (kotak sebab di bawah jadual)."); return; }
    if (!(await confirmAction(`Ganti kad ${row.serial}? Kod lama dibatalkan dan satu label baharu dimuat turun untuk dicetak (kod baharu hanya kelihatan dalam PDF itu).`, { confirmLabel: "Ya, ganti", danger: true }))) return;
    setBusy(true); setError("");
    try {
      const res = await fetch(`/api/admin/langganan/kod/${encodeURIComponent(row.serial)}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "replace", reason }) });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error || "Penggantian tidak berjaya.");
      }
      const newSerial = res.headers.get("X-New-Serial") || "baharu";
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `kad-ganti-${newSerial}.pdf`; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      toast(`${row.serial} diganti dengan ${newSerial}. Cetak label yang dimuat turun.`, "success");
      setReason("");
      await load();
    } catch (e) {
      setError(errorText(e, "Tidak berjaya."));
    } finally {
      setBusy(false);
    }
  }

  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  const disabled = batchStatus === "VOIDED";

  return (
    <section aria-label={`Kad dalam kelompok ${batchNumber}`}>
      <h2>Kad</h2>
      {error ? <Notice kind="error">{error}</Notice> : null}
      <div className="admin-form-row">
        <div className="admin-form-group">
          <label htmlFor="codes-filter">Tunjukkan</label>
          <select id="codes-filter" value={filter} onChange={(e) => { setFilter(e.target.value); setPage(1); setPicked(new Set()); }}>
            {FILTERS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>
        </div>
        <div className="admin-form-group">
          <label htmlFor="codes-q">Nombor siri</label>
          <input id="codes-q" type="search" value={q} placeholder="JLN-26-0001" onChange={(e) => { setQ(e.target.value); setPage(1); }} />
        </div>
      </div>
      {!data ? <p className="admin-form-hint">Memuatkan…</p> : (
        <>
          <p className="admin-form-hint">{data.total} kad{data.total > data.pageSize ? `, halaman ${data.page} daripada ${pages}` : ""}.</p>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th scope="col"><input type="checkbox" aria-label="Pilih semua kad yang belum ditebus pada halaman ini" checked={allPicked} disabled={disabled || actionable.length === 0} onChange={() => setPicked(allPicked ? new Set() : new Set(actionable.map((r) => r.serial)))} /></th>
                  <th scope="col">Nombor siri</th><th scope="col">Keadaan</th><th scope="col">Diaktifkan</th><th scope="col">Ditebus</th><th scope="col">Oleh</th><th scope="col">Akses hingga</th><th scope="col">Tindakan</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((r) => {
                  const st = statusOf(r);
                  const canAct = !disabled && !r.redeemedAt && r.state !== "revoked";
                  return (
                    <tr key={r.serial}>
                      <td>{canAct ? <input type="checkbox" aria-label={`Pilih ${r.serial}`} checked={picked.has(r.serial)} onChange={() => toggle(r.serial)} /> : null}</td>
                      <td><strong>{r.serial}</strong></td>
                      <td>{st.text}{r.state === "revoked" && r.revokeReason ? <div className="admin-form-hint">{r.revokeReason}</div> : null}</td>
                      <td>{r.issuedAt ? fmtDate(r.issuedAt, true) : "—"}</td>
                      <td>{r.redeemedAt ? fmtDate(r.redeemedAt, true) : "—"}</td>
                      <td>{r.redeemedBy ?? "—"}</td>
                      <td>{r.accessEndsAt ? fmtDate(r.accessEndsAt) : "—"}</td>
                      <td>{canAct ? <button type="button" className="admin-btn admin-btn-sm admin-btn-outline" disabled={busy} onClick={() => void replace(r)}>Ganti kad</button> : null}</td>
                    </tr>
                  );
                })}
                {data.rows.length === 0 ? <tr><td colSpan={8}>Tiada kad yang sepadan.</td></tr> : null}
              </tbody>
            </table>
          </div>
          {pages > 1 ? (
            <p className="admin-inline-form">
              <button type="button" className="admin-btn admin-btn-sm admin-btn-outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>Sebelumnya</button>
              <span> Halaman {page} / {pages} </span>
              <button type="button" className="admin-btn admin-btn-sm admin-btn-outline" disabled={page >= pages} onClick={() => setPage(page + 1)}>Seterusnya</button>
            </p>
          ) : null}
          {!disabled ? (
            <div className="admin-form-group">
              <label htmlFor="codes-reason">Sebab (untuk batal atau ganti)</label>
              <input id="codes-reason" type="text" maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Contoh: kad hilang dalam pos" />
              <div className="admin-form-actions">
                <button type="button" className="admin-btn admin-btn-danger" disabled={busy || picked.size === 0} onClick={() => void revokePicked()}>Batalkan {picked.size || ""} kad dipilih</button>
              </div>
              <p className="admin-form-hint">Hanya kad yang belum ditebus boleh dibatalkan atau diganti. Akses yang sudah diberikan oleh kad yang ditebus dibatalkan pada halaman pembaca.</p>
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}
