"use client";
import { useState } from "react";
import { copyText } from "./CopyButton";
import { errorText } from "../../lib/admin/error-text";
import { buildEditorPrompt, EDITOR_SCOPE_NAMES, isDraftPlaceholder, type EditorScope, type EditorContext, type EditorChange } from "../../lib/admin/authoring/editor-assistant";

export default function EditorAssistant({ workId, scope, context, blocked, onApplied }: { workId: string; scope: EditorScope; context: EditorContext; blocked: boolean; onApplied: () => void }) {
  const [answer, setAnswer] = useState("");
  const [manualPaste, setManualPaste] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<{ version: string; changes: EditorChange[] } | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const id = `assistant-${scope}`;
  async function copy() {
    setError("");
    try {
      const prompt = buildEditorPrompt(scope, context);
      if (!await copyText(prompt)) throw new Error("Penyalinan gagal. Benarkan akses papan keratan dan cuba lagi.");
      setNote("Arahan disalin. Berikan arahan atau bahan kepada bot sembang, kemudian salin jawapannya dan tekan Tampal jawapan.");
    } catch (e) { setError(errorText(e, "Arahan tidak dapat disalin.")); }
  }
  async function request(text: string, apply = false) {
    if (blocked || document.querySelector('[data-unsaved="true"]')) { setError("Simpan atau batalkan perubahan manual dahulu supaya kerja anda tidak hilang."); return; }
    setError(""); setBusy(true);
    if (!apply) setPreview(null);
    try {
      const chosen = apply && preview ? preview.changes.map(change => change.id) : selected;
      const res = await fetch(`/api/admin/works/${workId}/assistant-fill`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "editor", action: apply ? "apply" : "preview", scope, text, version: preview?.version, selected: chosen }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Jawapan tidak dapat dibaca.");
      if (!Array.isArray(data.notes) || !Array.isArray(data.changes)) throw new Error("Respons pelayan tidak lengkap. Muat semula untuk menyemak status simpan.");
      setNote(data.notes.join(" "));
      if (apply) { setPreview(null); onApplied(); }
      else { setPreview(data); setSelected(data.changes.map((c: EditorChange) => c.id)); }
    } catch (e) { if (apply) setPreview(null); setError(errorText(e, "Sambungan terputus. Muat semula untuk menyemak status simpan.")); }
    finally { setBusy(false); }
  }
  async function paste() {
    try { const text = await navigator.clipboard.readText(); setAnswer(text); await request(text); }
    catch { setManualPaste(true); setError("Pelayar tidak membenarkan bacaan papan keratan. Gunakan tampalan manual yang dibuka di bawah."); }
  }
  return <details className="a-assistant" data-editor-assistant={scope}>
    <summary>{scope === "all" ? "Bantuan AI master — semua tab" : `Bantuan AI — ${EDITOR_SCOPE_NAMES[scope]}`}</summary>
    <p className="admin-form-hint">{scope === "all" ? "Isi semua tab yang berkenaan." : `Isi tab ${EDITOR_SCOPE_NAMES[scope]} sahaja.`} Arahan menggunakan format teks berlabel yang mudah dibaca dan boleh diterima walaupun jarak atau pemisah barisnya tidak sempurna.</p>
    <div className="admin-form-actions">
      <button type="button" className="admin-btn admin-btn-outline" disabled={busy} onClick={() => void copy()}>1. Salin arahan</button>
      <button type="button" className="admin-btn admin-btn-outline" disabled={busy || blocked} onClick={() => void paste()}>2. Tampal jawapan</button>
    </div>
    {manualPaste && <div className="a-assistant-manual">
      <label htmlFor={`${id}-answer`}>Tampal jawapan secara manual</label>
      <textarea id={`${id}-answer`} className="admin-textarea" rows={5} value={answer} disabled={busy} onChange={e => { setAnswer(e.target.value); setPreview(null); }} autoFocus />
      <button type="button" className="admin-btn admin-btn-outline" disabled={busy || blocked || !answer.trim()} onClick={() => void request(answer)}>{busy ? "Memproses…" : "Semak jawapan"}</button>
    </div>}
    {blocked && <p className="admin-form-hint">Simpan atau batalkan perubahan manual sebelum menyemak jawapan AI.</p>}
    {error && <p role="alert" className="admin-alert admin-alert-error">{error}</p>}
    {note && <p role="status" className="admin-form-hint">{note}</p>}
    {preview && <section aria-label={`Pratonton AI ${EDITOR_SCOPE_NAMES[scope]}`}>
      <h3>{preview.changes.length} perubahan ditemui</h3>
      <p className="admin-form-hint">Semak ringkasan di bawah. Tiada perubahan disimpan sehingga butang Isi borang ditekan.</p>
      {preview.changes.some(change => change.problem) ? <p role="alert" className="admin-alert admin-alert-error">Ada perubahan yang akan ditolak semasa disimpan. Betulkan jawapan AI (atau minta AI memendekkannya), kemudian tampal semula. Tiada yang disimpan lagi.</p> : null}
      {preview.changes.map(change => <div className="admin-form-group" key={change.id}>
        <strong>{change.label}</strong>
        {change.problem ? <p role="alert" className="admin-form-error">{change.problem}</p> : null}
        {change.before ? <details><summary>{isDraftPlaceholder(change) ? "Nilai sementara draf akan diganti" : "Nilai sedia ada akan diganti"}</summary><p>{isDraftPlaceholder(change) ? "Nilai sementara" : "Nilai lama"}</p><pre className="a-assistant-value">{change.before}</pre><p>Nilai baharu</p><pre className="a-assistant-value">{change.after}</pre></details> : <p className="admin-form-hint">Nilai baharu tersedia untuk diisi.</p>}
      </div>)}
      <div className="admin-form-actions">
        <button type="button" className="admin-btn admin-btn-primary" disabled={busy || blocked || !preview.changes.length || preview.changes.some(change => change.problem)} onClick={() => void request(answer, true)}>Isi borang</button>
        <button type="button" className="admin-btn admin-btn-outline" disabled={busy} onClick={() => { setPreview(null); setSelected([]); }}>Batal</button>
      </div>
    </section>}
  </details>;
}
