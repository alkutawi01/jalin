"use client";
import { useState } from "react";
import { copyText } from "./CopyButton";
import { errorText } from "../../lib/admin/error-text";
import { buildEditorPrompt, EDITOR_SCOPE_NAMES, type EditorScope, type EditorContext, type EditorChange } from "../../lib/admin/authoring/editor-assistant";

export default function EditorAssistant({ workId, scope, context, blocked, onApplied }: { workId: string; scope: EditorScope; context: EditorContext; blocked: boolean; onApplied: () => void }) {
  const [task, setTask] = useState("");
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<{ version: string; changes: EditorChange[] } | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const id = `assistant-${scope}`;
  async function copy() {
    setError("");
    try {
      const prompt = buildEditorPrompt(scope, context, task);
      if (!await copyText(prompt)) throw new Error("Penyalinan gagal. Benarkan akses papan keratan dan cuba lagi.");
      setNote("Arahan disalin. Tampal jawapan AI di bawah untuk semakan.");
    } catch (e) { setError(errorText(e, "Arahan tidak dapat disalin.")); }
  }
  async function request(text: string, apply = false) {
    if (blocked || document.querySelector('[data-unsaved="true"]')) { setError("Simpan atau batalkan perubahan manual dahulu supaya kerja anda tidak hilang."); return; }
    setError(""); setBusy(true);
    if (!apply) setPreview(null);
    try {
      const res = await fetch(`/api/admin/works/${workId}/assistant-fill`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "editor", action: apply ? "apply" : "preview", scope, text, version: preview?.version, selected }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Jawapan tidak dapat dibaca.");
      if (!Array.isArray(data.notes) || !Array.isArray(data.changes)) throw new Error("Respons pelayan tidak lengkap. Muat semula untuk menyemak status simpan.");
      setNote(data.notes.join(" "));
      if (apply) { setPreview(null); onApplied(); }
      else { setPreview(data); setSelected(data.changes.filter((c: EditorChange) => c.selected).map((c: EditorChange) => c.id)); }
    } catch (e) { setError(errorText(e, "Sambungan terputus. Muat semula untuk menyemak status simpan.")); }
    finally { setBusy(false); }
  }
  async function paste() {
    try { const text = await navigator.clipboard.readText(); setAnswer(text); await request(text); }
    catch { setError("Tampal secara manual dalam kotak jawapan di bawah, kemudian tekan Semak jawapan."); }
  }
  return <details className="a-assistant" data-editor-assistant={scope}>
    <summary>{scope === "all" ? "Bantuan AI master — semua tab" : `Bantuan AI — ${EDITOR_SCOPE_NAMES[scope]}`}</summary>
    <p className="admin-form-hint">{scope === "all" ? "Lengkapkan medan editorial di semua tab yang berkenaan." : `Jawapan hanya mengisi tab ${EDITOR_SCOPE_NAMES[scope]}.`} Semak nilai lama/baharu dan pilih perubahan sebelum disimpan. Hak, skor AI dan fail gambar bukan keputusan automatik.</p>
    <label htmlFor={`${id}-task`}>{context.body.trim() || context.chapters?.length ? "Arahan tambahan kepada AI (pilihan)" : "Bahan atau tugasan untuk AI"}</label>
    <textarea id={`${id}-task`} className="admin-textarea" rows={3} value={task} disabled={busy} onChange={e => { setTask(e.target.value); setPreview(null); }} placeholder={scope === "content" ? "Contoh: Tulis cerpen berdasarkan bahan ini, atau sunting manuskrip tanpa mengubah jalan cerita." : "Nyatakan bahan, maklumat sebenar atau perkara yang perlu diperincikan."} />
    <div className="admin-form-actions">
      <button type="button" className="admin-btn admin-btn-outline" disabled={busy} onClick={() => void copy()}>1. Salin arahan</button>
      <button type="button" className="admin-btn admin-btn-outline" disabled={busy || blocked} onClick={() => void paste()}>2. Tampal jawapan</button>
    </div>
    <label htmlFor={`${id}-answer`}>Jawapan AI — boleh tampal secara manual</label>
    <textarea id={`${id}-answer`} className="admin-textarea" rows={5} value={answer} disabled={busy} onChange={e => { setAnswer(e.target.value); setPreview(null); }} />
    <button type="button" className="admin-btn admin-btn-outline" disabled={busy || blocked || !answer.trim()} onClick={() => void request(answer)}>{busy ? "Memproses…" : "Semak jawapan"}</button>
    {blocked && <p className="admin-form-hint">Simpan atau batalkan perubahan manual sebelum menyemak jawapan AI.</p>}
    {error && <p role="alert" className="admin-alert admin-alert-error">{error}</p>}
    {note && <p role="status" className="admin-form-hint">{note}</p>}
    {preview && <section aria-label={`Pratonton AI ${EDITOR_SCOPE_NAMES[scope]}`}>
      <h3>Pilih perubahan untuk diisi</h3>
      {preview.changes.map(change => <div className="admin-form-group" key={change.id}>
        <label><input type="checkbox" disabled={busy} checked={selected.includes(change.id)} onChange={e => setSelected(values => e.target.checked ? [...values, change.id] : values.filter(v => v !== change.id))} /> {change.label}{change.before ? " — mengganti nilai sedia ada" : " — medan kosong"}</label>
        <details><summary>Lihat nilai lama dan baharu</summary><p>Nilai lama</p><pre className="a-assistant-value">{change.before || "(kosong)"}</pre><p>Cadangan baharu</p><pre className="a-assistant-value">{change.after}</pre></details>
      </div>)}
      <div className="admin-form-actions">
        <button type="button" className="admin-btn admin-btn-primary" disabled={busy || blocked || !selected.length} onClick={() => void request(answer, true)}>Sahkan &amp; isi ({selected.length})</button>
        <button type="button" className="admin-btn admin-btn-outline" disabled={busy} onClick={() => { setPreview(null); setSelected([]); }}>Batal</button>
      </div>
    </section>}
  </details>;
}
