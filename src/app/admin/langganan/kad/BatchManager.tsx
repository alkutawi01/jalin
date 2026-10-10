"use client";

import { useEffect, useMemo, useState } from "react";
import { confirmAction, toast } from "../../../../lib/admin/dialogs";
import { errorText } from "../../../../lib/admin/error-text";
import { api, fmtDate, Notice } from "../../../../components/admin/langganan-ui";

type Batch = {
  id: string; batchNumber: string; months: number; quantity: number; status: "PENDING_PRINT" | "PRINT_CONFIRMED" | "VOIDED";
  orderRef: string | null; note: string | null; createdAt: string; voidReason: string | null;
  generated: number; issued: number; revoked: number; redeemed: number;
};
type CodeInfo = { serial: string; batchNumber: string; months: number; state: string; batchStatus: string; revokeReason: string | null; redeemedAt: string | null; redeemedBy: string | null };
type LayoutAnswer = { layout: { problems: { level: "error" | "warning"; text: string }[]; code: string; codeFontPt: number; codeWidthMm: number; dotsPerLetter203: number } };

const STATUS: Record<Batch["status"], string> = { PENDING_PRINT: "Menunggu pengesahan cetakan", PRINT_CONFIRMED: "Cetakan disahkan", VOIDED: "Dibatalkan" };
const STATE: Record<string, string> = { generated: "belum diaktifkan", issued: "diaktifkan", revoked: "dibatalkan" };

const DEFAULTS = { widthMm: "50", heightMm: "30", scratchWidthMm: "40", scratchHeightMm: "8", scratchTopMm: "11", scratchPaddingMm: "2", separator: "-" };

/** Card batches: make one (and get the PDF to print), confirm the print, switch the codes on, cancel, and find one card by its serial. */
export default function BatchManager({ initialBatches, suggested }: { initialBatches: Batch[]; suggested: string }) {
  const [batches] = useState(initialBatches);
  const [form, setForm] = useState({ batchNumber: suggested, months: "6", quantity: "50", orderRef: "", note: "" });
  const [layout, setLayout] = useState(DEFAULTS);
  const [answer, setAnswer] = useState<LayoutAnswer["layout"] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");
  const [done, setDone] = useState("");
  const [voiding, setVoiding] = useState<{ id: string; reason: string } | null>(null);
  const [serial, setSerial] = useState("");
  const [found, setFound] = useState<CodeInfo | null>(null);
  const [revokeReason, setRevokeReason] = useState("");

  const query = useMemo(() => new URLSearchParams(layout).toString(), [layout]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/admin/langganan/label-ujian?format=json&${query}`);
        const data = (await res.json()) as LayoutAnswer;
        setAnswer(data.layout);
      } catch { setAnswer(null); }
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  async function createBatch(acceptSmall = false) {
    setError(""); setWarning(""); setDone("");
    const quantity = Number(form.quantity);
    if (!(await confirmAction(`Buat ${quantity} kod kad ${form.months} bulan dalam kelompok ${form.batchNumber || "baharu"}? Kod hanya ada dalam PDF yang dimuat turun sekarang. Jika PDF hilang, kelompok mesti dibatalkan dan dibuat semula.`, { confirmLabel: "Ya, buat kod dan PDF" }))) return;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/langganan/batch", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, months: Number(form.months), quantity, layout: Object.fromEntries(Object.entries(layout).map(([k, v]) => [k, k === "separator" ? v : Number(v)])), acceptSmall }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (res.status === 409) { setWarning(String(data.error ?? "")); return; }
        throw new Error(data.error || "Kelompok tidak berjaya dibuat.");
      }
      const blob = await res.blob();
      const number = res.headers.get("X-Batch-Number") ?? form.batchNumber;
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `kad-${number}.pdf`;
      document.body.appendChild(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(link.href), 60000);
      setDone(`Kelompok ${number} dibuat dan PDF dimuat turun. Cetak, semak hasilnya, kemudian tekan "Sahkan cetakan" di bawah.`);
      toast("Kelompok dibuat.", "success");
      setTimeout(() => window.location.reload(), 2500);
    } catch (e) {
      setError(errorText(e, "Kelompok tidak berjaya dibuat."));
    } finally {
      setBusy(false);
    }
  }

  async function act(batch: Batch, action: "confirm" | "issue" | "void", reason?: string) {
    setError("");
    try {
      const data = await api<{ issued?: number }>(`/api/admin/langganan/batch/${batch.id}`, "POST", { action, reason });
      toast(action === "confirm" ? "Cetakan disahkan." : action === "issue" ? `${data.issued ?? 0} kod diaktifkan.` : "Kelompok dibatalkan.", "success");
      setTimeout(() => window.location.reload(), 800);
    } catch (e) {
      setError(errorText(e, "Tidak berjaya."));
    }
  }

  async function lookup(e: React.FormEvent) {
    e.preventDefault();
    setFound(null); setError(""); setRevokeReason("");
    if (!serial.trim()) return;
    try {
      const data = await api<{ code: CodeInfo }>(`/api/admin/langganan/kod/${encodeURIComponent(serial.trim())}`, "GET");
      setFound(data.code);
    } catch (err) {
      setError(errorText(err, "Tidak dijumpai."));
    }
  }

  async function revoke() {
    if (!found) return;
    if (!revokeReason.trim()) { setError("Sebab diperlukan."); return; }
    try {
      await api(`/api/admin/langganan/kod/${encodeURIComponent(found.serial)}`, "POST", { action: "revoke", reason: revokeReason });
      toast("Kod dibatalkan.", "success");
      setFound({ ...found, state: "revoked", revokeReason });
      setRevokeReason("");
    } catch (err) {
      setError(errorText(err, "Tidak berjaya."));
    }
  }

  const num = (key: keyof typeof DEFAULTS, label: string, hint?: string) => (
    <div className="admin-form-group">
      <label htmlFor={`lb-${key}`}>{label}</label>
      <input id={`lb-${key}`} type="number" step="0.5" min="0" value={layout[key]} onChange={(e) => setLayout({ ...layout, [key]: e.target.value })} />
      {hint ? <p className="admin-form-hint">{hint}</p> : null}
    </div>
  );

  return (
    <div className="admin-batches">
      {error ? <Notice kind="error">{error}</Notice> : null}

      <h2>Buat kelompok kad</h2>
      <form className="admin-batch-form" onSubmit={(e) => { e.preventDefault(); void createBatch(); }}>
        <div className="admin-form-group">
          <label htmlFor="bt-number">Nombor batch</label>
          <input id="bt-number" value={form.batchNumber} onChange={(e) => setForm({ ...form, batchNumber: e.target.value })} />
          <p className="admin-form-hint">Tercetak pada setiap kad dan perlu ditaip pembaca bersama kod. Huruf besar, nombor dan sengkang.</p>
        </div>
        <div className="admin-form-group">
          <label htmlFor="bt-months">Tempoh langganan</label>
          <select id="bt-months" value={form.months} onChange={(e) => setForm({ ...form, months: e.target.value })}>
            <option value="1">1 bulan</option><option value="6">6 bulan</option><option value="12">12 bulan</option>
          </select>
        </div>
        <div className="admin-form-group">
          <label htmlFor="bt-qty">Bilangan kad</label>
          <input id="bt-qty" type="number" min="1" max="5000" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
          <p className="admin-form-hint">Mulakan dengan kelompok kecil (cth 30) sehingga cetakan terbukti tahan.</p>
        </div>
        <div className="admin-form-group">
          <label htmlFor="bt-order">Rujukan pesanan (pilihan)</label>
          <input id="bt-order" value={form.orderRef} onChange={(e) => setForm({ ...form, orderRef: e.target.value })} placeholder="Contoh: Sekolah Menengah ..." />
        </div>
        <div className="admin-form-group">
          <label htmlFor="bt-note">Nota (pilihan)</label>
          <input id="bt-note" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
        </div>

        <h3>Saiz label dan pelekat gores</h3>
        <p className="admin-form-hint">Saiz belum muktamad: ubah di sini dan lihat kesannya pada saiz kod. Nilai awal: label 50 x 30 mm, jalur gores 40 x 8 mm.</p>
        <div className="admin-batch-sizes">
          {num("widthMm", "Lebar label (mm)")}
          {num("heightMm", "Tinggi label (mm)")}
          {num("scratchWidthMm", "Lebar pelekat gores (mm)")}
          {num("scratchHeightMm", "Tinggi pelekat gores (mm)")}
          {num("scratchTopMm", "Jarak pelekat gores dari atas (mm)", "Ruang di atas untuk tajuk, batch dan siri.")}
          {num("scratchPaddingMm", "Ruang kosong dalam pelekat gores (mm)", "Supaya kod tetap tertutup jika pelekat dilekat sedikit senget.")}
          <div className="admin-form-group">
            <label htmlFor="lb-sep">Pemisah kumpulan kod</label>
            <select id="lb-sep" value={layout.separator} onChange={(e) => setLayout({ ...layout, separator: e.target.value })}>
              <option value="-">Sengkang (XXXX-XXXX-...)</option><option value=" ">Ruang (XXXX XXXX ...)</option><option value="">Tiada (lebih besar)</option>
            </select>
          </div>
        </div>
        {answer ? (
          answer.codeFontPt > 0 ? (
            <Notice kind={answer.problems.length ? "warning" : "success"}>
              Kod dicetak pada <strong>{answer.codeFontPt.toFixed(1)} pt</strong> (kira-kira {answer.dotsPerLetter203} titik selebar satu huruf pada pencetak 203 dpi), satu baris {answer.code.length} aksara.
              {answer.problems.map((p) => <div key={p.text}>{p.text}</div>)}
            </Notice>
          ) : <Notice kind="error">{answer.problems.map((p) => p.text).join(" ")}</Notice>
        ) : null}
        <p><a className="admin-btn admin-btn-outline admin-btn-sm" href={`/api/admin/langganan/label-ujian?${query}`}>Muat turun label ujian (PDF, kod palsu)</a></p>
        <p className="admin-form-hint">Cetak label ujian dahulu pada pencetak sebenar, lekatkan pelekat gores, dan semak sama ada semuanya muat sebelum membuat kod sebenar.</p>

        {warning ? (
          <Notice kind="warning">
            {warning}
            <div><button type="button" className="admin-btn admin-btn-sm" disabled={busy} onClick={() => void createBatch(true)}>Teruskan juga</button></div>
          </Notice>
        ) : null}
        {done ? <Notice kind="success">{done}</Notice> : null}
        <button type="submit" className="admin-btn admin-btn-primary" disabled={busy}>{busy ? "Membuat…" : "Buat kod dan muat turun PDF"}</button>
      </form>

      <h2>Kelompok</h2>
      {batches.length === 0 ? <p className="admin-form-hint">Belum ada kelompok.</p> : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead><tr><th>Batch</th><th>Tempoh</th><th>Kad</th><th>Status</th><th>Aktif</th><th>Ditebus</th><th>Tindakan</th></tr></thead>
            <tbody>
              {batches.map((b) => (
                <tr key={b.id}>
                  <td><a href={`/admin/langganan/kad/${b.id}`}><strong>{b.batchNumber}</strong></a><div className="admin-form-hint">{fmtDate(b.createdAt)}{b.orderRef ? ` · ${b.orderRef}` : ""}</div></td>
                  <td>{b.months} bulan</td>
                  <td>{b.quantity}</td>
                  <td>{STATUS[b.status]}{b.voidReason ? <div className="admin-form-hint">{b.voidReason}</div> : null}</td>
                  <td>{b.issued}{b.generated > 0 ? <span className="admin-form-hint"> ({b.generated} belum)</span> : null}</td>
                  <td>{b.redeemed}</td>
                  <td>
                    {b.status === "PENDING_PRINT" ? <button type="button" className="admin-btn admin-btn-sm admin-btn-primary" onClick={() => void act(b, "confirm")}>Sahkan cetakan</button> : null}
                    {b.status === "PRINT_CONFIRMED" && b.generated > 0 ? <button type="button" className="admin-btn admin-btn-sm admin-btn-primary" onClick={async () => { if (await confirmAction(`Aktifkan ${b.generated} kod kelompok ${b.batchNumber}? Kod boleh ditebus selepas ini.`, { confirmLabel: "Ya, aktifkan" })) void act(b, "issue"); }}>Aktifkan semua</button> : null}
                    {b.status !== "VOIDED" ? (
                      voiding?.id === b.id ? (
                        <span className="admin-inline-form">
                          <input aria-label="Sebab" placeholder="Sebab pembatalan" value={voiding.reason} onChange={(e) => setVoiding({ id: b.id, reason: e.target.value })} />
                          <button type="button" className="admin-btn admin-btn-sm admin-btn-danger" onClick={() => void act(b, "void", voiding.reason)}>Sahkan batal</button>
                          <button type="button" className="admin-btn admin-btn-sm admin-btn-outline" onClick={() => setVoiding(null)}>Tidak</button>
                        </span>
                      ) : <button type="button" className="admin-btn admin-btn-sm admin-btn-outline" onClick={() => setVoiding({ id: b.id, reason: "" })}>Batalkan kelompok</button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2>Cari satu kad</h2>
      <form onSubmit={lookup} className="admin-inline-form">
        <input aria-label="Nombor siri" placeholder="JLN-26-000123" value={serial} onChange={(e) => setSerial(e.target.value)} />
        <button type="submit" className="admin-btn admin-btn-sm">Cari</button>
      </form>
      {found ? (
        <div className="admin-card-found">
          <p><strong>{found.serial}</strong> · kelompok {found.batchNumber} · {found.months} bulan</p>
          <p>Keadaan: {STATE[found.state] ?? found.state}{found.revokeReason ? ` (${found.revokeReason})` : ""} · kelompok: {found.batchStatus === "PRINT_CONFIRMED" ? "cetakan disahkan" : found.batchStatus === "VOIDED" ? "dibatalkan" : "menunggu cetakan"}</p>
          <p>{found.redeemedAt ? `Ditebus pada ${fmtDate(found.redeemedAt, true)} oleh ${found.redeemedBy ?? "pembaca yang telah memadam akaun"}.` : "Belum ditebus."}</p>
          {found.state !== "revoked" ? (
            <span className="admin-inline-form">
              <input aria-label="Sebab pembatalan kod" placeholder="Sebab (cth kad hilang)" value={revokeReason} onChange={(e) => setRevokeReason(e.target.value)} />
              <button type="button" className="admin-btn admin-btn-sm admin-btn-danger" onClick={() => void revoke()}>Batalkan kod ini</button>
            </span>
          ) : null}
          {found.redeemedAt ? <p className="admin-form-hint">Membatalkan kod yang sudah ditebus tidak menarik balik akses. Untuk itu, batalkan tempoh akses pada halaman Pembaca.</p> : null}
        </div>
      ) : null}
    </div>
  );
}
