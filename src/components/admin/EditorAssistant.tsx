"use client";
import { useEffect, useState } from "react";
import { DEFAULT_AUDIENCE_BANDS, type AudienceBand } from "../../lib/audience";
import { copyText } from "./CopyButton";
import { errorText } from "../../lib/admin/error-text";
import { confirmAction } from "../../lib/admin/dialogs";
import { buildEditorPrompt, EDITOR_SCOPE_NAMES, type EditorScope, type EditorContext } from "../../lib/admin/authoring/editor-assistant";

export default function EditorAssistant({ workId, scope, context, blocked, onApplied }: { workId: string; scope: EditorScope; context: EditorContext; blocked: boolean; onApplied: () => void }) {
  const [answer, setAnswer] = useState("");
  const [manualPaste, setManualPaste] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const id = `assistant-${scope}`;
  // The prompt asks for Audiens from the bands as Tetapan has them now, not from a copy of the defaults.
  const [bands, setBands] = useState<AudienceBand[]>(DEFAULT_AUDIENCE_BANDS);
  useEffect(() => {
    let alive = true;
    fetch("/api/admin/audience-bands").then((res) => (res.ok ? res.json() : null)).then((data: { bands?: AudienceBand[] } | null) => { if (alive && data?.bands?.length) setBands(data.bands); }).catch(() => {});
    return () => { alive = false; };
  }, []);
  async function copy() {
    setError("");
    try {
      const prompt = buildEditorPrompt(scope, { ...context, bands });
      if (!await copyText(prompt)) throw new Error("Penyalinan gagal. Benarkan akses papan keratan dan cuba lagi.");
      setNote("Arahan disalin. Berikan arahan atau bahan kepada bot sembang, kemudian salin jawapannya dan tekan Tampal jawapan.");
    } catch (e) { setError(errorText(e, "Arahan tidak dapat disalin.")); }
  }
  async function request(text: string) {
    // The form is reloaded with the answer, so an edit that is not saved yet would be lost: say so and let the editor decide, instead of a greyed-out button.
    if ((blocked || document.querySelector('[data-unsaved="true"]')) && !await confirmAction("Ada perubahan pada borang yang belum disimpan. Jika jawapan AI diisi sekarang, perubahan itu akan hilang. Teruskan?", { title: "Perubahan belum disimpan", confirmLabel: "Isi dan buang perubahan", cancelLabel: "Batal" })) return;
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
    catch {
      // Some browsers (and the in-app browser) never let a page read the clipboard. A paste the reader makes themselves is always allowed,
      // so the box below takes the answer the moment it is pasted: Ctrl+V is the whole job, no second button.
      setManualPaste(true);
      setNote("Pelayar tidak membenarkan bacaan papan keratan terus. Tekan Ctrl+V (atau Cmd+V) dalam kotak di bawah; jawapan terus diisi.");
    }
  }
  function pasted(event: React.ClipboardEvent<HTMLTextAreaElement>) {
    const text = event.clipboardData.getData("text");
    if (!text.trim()) return;
    event.preventDefault();
    setAnswer(text);
    void request(text);
  }
  return <details className="a-assistant" data-editor-assistant={scope}>
    <summary>{scope === "all" ? "Bantuan AI master — semua tab" : `Bantuan AI — ${EDITOR_SCOPE_NAMES[scope]}`}</summary>
    <p className="admin-form-hint">{scope === "all" ? "Isi semua tab yang berkenaan." : `Isi tab ${EDITOR_SCOPE_NAMES[scope]} sahaja.`} Arahan menggunakan format teks berlabel yang mudah dibaca dan boleh diterima walaupun jarak atau pemisah barisnya tidak sempurna.</p>
    <div className="admin-form-actions">
      <button type="button" className="admin-btn admin-btn-outline" disabled={busy} onClick={() => void copy()}>1. Salin arahan</button>
      <button type="button" className="admin-btn admin-btn-outline" disabled={busy} onClick={() => void paste()}>{busy ? "Mengisi…" : "2. Tampal jawapan"}</button>
    </div>
    {manualPaste && <div className="a-assistant-manual">
      <label htmlFor={`${id}-answer`}>Tampal jawapan secara manual</label>
      <textarea id={`${id}-answer`} className="admin-textarea" rows={5} value={answer} disabled={busy} onChange={e => setAnswer(e.target.value)} onPaste={pasted} autoFocus />
      <button type="button" className="admin-btn admin-btn-outline" disabled={busy || !answer.trim()} onClick={() => void request(answer)}>{busy ? "Mengisi…" : "Isi daripada jawapan"}</button>
    </div>}
    {error && <p role="alert" className="admin-alert admin-alert-error">{error}</p>}
    {note && <p role="status" className="admin-form-hint">{note}</p>}
  </details>;
}
