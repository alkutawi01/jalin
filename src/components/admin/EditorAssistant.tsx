"use client";
import { useState } from "react";
import { copyText } from "./CopyButton";
import { errorText } from "../../lib/admin/error-text";
import { buildEditorPrompt, EDITOR_SCOPE_NAMES, type EditorScope, type EditorContext } from "../../lib/admin/authoring/editor-assistant";

export default function EditorAssistant({ workId, scope, context, blocked, onApplied }: { workId: string; scope: EditorScope; context: EditorContext; blocked: boolean; onApplied: () => void }) {
  const [answer, setAnswer] = useState("");
  const [manualPaste, setManualPaste] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const id = `assistant-${scope}`;
  async function copy() {
    setError("");
    try {
      const prompt = buildEditorPrompt(scope, context);
      if (!await copyText(prompt)) throw new Error("Penyalinan gagal. Benarkan akses papan keratan dan cuba lagi.");
      setNote("Arahan disalin. Berikan arahan atau bahan kepada bot sembang, kemudian salin jawapannya dan tekan Tampal jawapan.");
    } catch (e) { setError(errorText(e, "Arahan tidak dapat disalin.")); }
  }
  async function request(text: string) {
    if (blocked || document.querySelector('[data-unsaved="true"]')) { setError("Simpan atau batalkan perubahan manual dahulu supaya kerja anda tidak hilang."); return; }
    setError(""); setBusy(true);
    try {
      const res = await fetch(`/api/admin/works/${workId}/assistant-fill`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "editor", action: "apply", scope, text }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Jawapan tidak dapat dibaca.");
      if (!Array.isArray(data.notes)) throw new Error("Respons pelayan tidak lengkap. Muat semula untuk menyemak status simpan.");
      setNote(data.notes.join(" "));
      onApplied();
    } catch (e) { setError(errorText(e, "Sambungan terputus. Muat semula untuk menyemak status simpan.")); }
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
      <textarea id={`${id}-answer`} className="admin-textarea" rows={5} value={answer} disabled={busy} onChange={e => setAnswer(e.target.value)} autoFocus />
      <button type="button" className="admin-btn admin-btn-outline" disabled={busy || blocked || !answer.trim()} onClick={() => void request(answer)}>{busy ? "Mengisi…" : "Isi daripada jawapan"}</button>
    </div>}
    {blocked && <p className="admin-form-hint">Simpan atau batalkan perubahan manual sebelum menyemak jawapan AI.</p>}
    {error && <p role="alert" className="admin-alert admin-alert-error">{error}</p>}
    {note && <p role="status" className="admin-form-hint">{note}</p>}
  </details>;
}
