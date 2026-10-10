"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "../../lib/admin/dialogs";
import { errorText } from "../../lib/admin/error-text";
import type { PanelView } from "../../lib/panel/view";
import { api, fmtDate, Notice } from "./langganan-ui";

/**
 * The Penilaian AI tab of a work (and the same section on a submission). Deliberately short: prepare the text, copy the instruction,
 * press one button to paste the answer. The comparison between reviewers, charts and history are in the Penilaian AI module, one
 * link away; nothing here is a setting.
 */
export default function PanelTab({ kind, subjectId }: { kind: "work" | "submission"; subjectId: string }) {
  const [view, setView] = useState<PanelView | null>(null);
  const [loadError, setLoadError] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [needPaste, setNeedPaste] = useState(false);
  const [consent, setConsent] = useState(false);
  const [voiding, setVoiding] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  const load = useCallback(async () => {
    try {
      setView(await api<PanelView>(`/api/admin/panel/view?kind=${kind}&id=${encodeURIComponent(subjectId)}`, "GET"));
      setLoadError("");
    } catch (e) {
      setLoadError(errorText(e, "Penilaian AI tidak dapat dimuatkan."));
    }
  }, [kind, subjectId]);

  useEffect(() => { void load(); }, [load]);

  async function prepare() {
    setBusy(true); setError("");
    try {
      await api("/api/admin/panel/snapshot", "POST", { kind, id: subjectId, consent });
      toast("Teks semasa disediakan untuk dinilai.", "success");
      await load();
    } catch (e) { setError(errorText(e, "Tidak dapat disediakan.")); } finally { setBusy(false); }
  }

  async function copyPrompt() {
    if (!view?.active) return;
    try { await navigator.clipboard.writeText(view.active.prompt); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { setError("Penyalinan gagal. Buka arahan di bawah dan salin dengan tangan."); }
  }

  /** The answer goes straight in: read, checked, named after its own MODEL line. Nothing is typed. */
  async function ingest(raw: string) {
    const active = view?.active;
    if (!active) return;
    if (raw.trim().length < 50) { setError("Papan keratan kosong atau terlalu pendek. Salin jawapan penilai dahulu."); return; }
    setBusy(true); setError(""); setErrors([]); setNeedPaste(false);
    try {
      const res = await fetch(`/api/admin/panel/snapshot/${active.snapshotId}/rating`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ raw }) });
      const data = (await res.json().catch(() => ({}))) as { errors?: string[]; error?: string; composite?: string };
      if (res.status === 422 && data.errors) { setErrors(data.errors); toast("Jawapan ditolak dan disimpan sebagai ditolak.", "error"); await load(); return; }
      if (!res.ok) throw new Error(data.error || "Tidak berjaya.");
      toast(`Penilaian ditambah: ${data.composite}.`, "success");
      await load();
    } catch (err) { setError(errorText(err, "Tidak berjaya.")); } finally { setBusy(false); }
  }

  async function pasteFromClipboard() {
    try { await ingest(await navigator.clipboard.readText()); } catch { setNeedPaste(true); }
  }

  async function confirmVoid() {
    if (!voiding) return;
    setBusy(true); setError("");
    try {
      await api(`/api/admin/panel/rating/${voiding}/void`, "POST", { reason });
      toast("Penilaian dibatalkan.", "success");
      setVoiding(null); setReason("");
      await load();
    } catch (err) { setError(errorText(err, "Tidak berjaya.")); } finally { setBusy(false); }
  }

  if (loadError) return <Notice kind="error">{loadError}</Notice>;
  if (!view) return <p className="admin-form-hint">Memuatkan penilaian AI…</p>;
  const active = view.active;
  const t = view.settings.thresholdText;
  const detail = `/admin/panel/${kind}/${encodeURIComponent(subjectId)}`;
  const result = active?.result;

  return (
    <div className="admin-panel-workbench">
      {error ? <Notice kind="error">{error}</Notice> : null}
      {!view.eligible ? <Notice kind="info">{view.problem}</Notice> : null}

      {view.eligible && !active ? (
        <section>
          <h3>Sediakan penilaian</h3>
          <p>Teks semasa{view.words !== null ? ` (${view.words} perkataan)` : ""} belum dinilai. Ini menyimpan salinan tepat teks dan memberinya kod rujukan.</p>
          {view.history.length > 0 ? <Notice kind="info">Teks ini telah berubah sejak penilaian terdahulu. Penilaian lama kekal untuk versi lamanya (lihat di modul Penilaian AI).</Notice> : null}
          {kind === "submission" ? (
            <p><label><input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} /> Penulis telah dimaklumkan bahawa manuskrip ini akan dihantar kepada penyedia AI untuk penilaian dalaman (direkodkan).</label></p>
          ) : null}
          <button type="button" className="admin-btn admin-btn-primary" onClick={() => void prepare()} disabled={busy || (kind === "submission" && !consent)}>{busy ? "Menyediakan…" : "Sediakan penilaian"}</button>
        </section>
      ) : null}

      {active && result ? (
        <>
          <section>
            {result.count === 0 ? (
              <p><strong>Belum ada penilaian {view.settings.referenceName}.</strong> Satu penilaian sudah cukup.</p>
            ) : (
              <div className={`admin-alert admin-alert-${result.meets ? "success" : "warning"}`} role="status">
                <strong>Min {result.meanText}</strong> ({view.settings.referenceName}, {result.count} penilaian): {result.meets ? `melepasi syarat skor (lebih daripada ${t}).` : `tidak melepasi syarat skor (mesti lebih daripada ${t}).`} Ini bukan keputusan penerimaan atau penerbitan.
              </div>
            )}
            {active.compare ? <p>{active.compare.summary.slice(0, 2).join(" ")}</p> : null}
            {active.compare && active.compare.models.length > 0 ? (
              <p className="admin-form-hint">
                {active.compare.models.map((m) => `${m.name} ${m.mean}${m.official ? "" : " (tambahan)"}`).join(" · ")}
              </p>
            ) : null}
            <p><a className="admin-btn admin-btn-sm admin-btn-outline" href={detail}>Perbandingan penuh, graf dan sejarah</a></p>
          </section>

          <section>
            <h3>Nilai atau nilai semula</h3>
            <p>
              <button type="button" className="admin-btn admin-btn-outline" onClick={() => void copyPrompt()}>{copied ? "Disalin" : "1. Salin arahan"}</button>{" "}
              <button type="button" className="admin-btn admin-btn-primary" onClick={() => void pasteFromClipboard()} disabled={busy}>{busy ? "Menyemak…" : "2. Tampal jawapan"}</button>
            </p>
            <p className="admin-form-hint">Tampal arahan dalam sesi baharu pada {view.settings.referenceName}, salin jawapannya, kemudian tekan Tampal jawapan. Kod rujukan <strong>{active.refCode}</strong>, {active.chars.toLocaleString("ms-MY")} aksara.</p>
            {needPaste ? (
              <div className="admin-alert admin-alert-info" role="status" tabIndex={0} onPaste={(e) => { e.preventDefault(); void ingest(e.clipboardData.getData("text")); }} ref={(el) => el?.focus()}>
                Pelayar tidak membenarkan bacaan papan keratan terus. Tekan <strong>Ctrl+V</strong> (atau Cmd+V) sekarang untuk menampal.
              </div>
            ) : null}
            {errors.length > 0 ? <Notice kind="error"><strong>Jawapan ditolak:</strong><ul>{errors.map((m, i) => <li key={i}>{m}</li>)}</ul>Disimpan sebagai ditolak dan tidak dikira. Minta penilai menjawab semula dalam format yang betul.</Notice> : null}
          </section>

          {active.ratings.filter((r) => r.status === "valid").length > 0 ? (
            <section>
              <h3>Penilaian untuk teks ini</h3>
              <ul className="admin-panel-lines">
                {active.ratings.filter((r) => r.status === "valid").map((r) => (
                  <li key={r.id} className={r.voided ? "is-voided" : ""}>
                    <span><strong>{r.reviewer}</strong>{!r.counted ? " (tambahan, tidak dikira)" : ""}{r.voided ? " · dibatalkan" : ""}</span>
                    <span className="admin-panel-line-score">{r.composite}</span>
                    <span className="admin-form-hint">{fmtDate(r.createdAt, true)}</span>
                    {!r.voided ? <button type="button" className="admin-btn admin-btn-sm admin-btn-danger" onClick={() => { setVoiding(r.id); setReason(""); }}>Batalkan</button> : null}
                  </li>
                ))}
              </ul>
              {voiding ? (
                <div className="admin-alert admin-alert-warning">
                  <label htmlFor="pn-void">Sebab membatalkan penilaian ini (wajib; dikekalkan dalam rekod)</label>
                  <input id="pn-void" className="admin-input-wide" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} />
                  <p>
                    <button type="button" className="admin-btn admin-btn-danger admin-btn-sm" disabled={busy || !reason.trim()} onClick={() => void confirmVoid()}>Batalkan penilaian</button>{" "}
                    <button type="button" className="admin-btn admin-btn-sm" onClick={() => setVoiding(null)}>Tidak jadi</button>
                  </p>
                </div>
              ) : null}
            </section>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
