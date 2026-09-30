"use client";

import { useState } from "react";

/**
 * Upload an image straight from a work's Visual tab. One step: the file is
 * stored, the editor's approval is recorded, and the image is attached to
 * the work. The work is never published by this.
 */
export default function WorkVisualUpload({ workId, onDone }: { workId: string; onDone: () => void }) {
  const [role, setRole] = useState("hero");
  const [alt, setAlt] = useState("");
  const [anchor, setAnchor] = useState("");
  const [place, setPlace] = useState("after");
  const [tool, setTool] = useState("");
  const [approved, setApproved] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const canSubmit = !!file && alt.trim().length > 0 && approved && !busy;

  async function submit() {
    if (!file) return;
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("role", role);
      body.append("alt", alt);
      body.append("approved", approved ? "true" : "false");
      if (tool.trim()) body.append("tool", tool.trim());
      if (role === "inline") {
        if (anchor.trim()) body.append("anchor", anchor.trim());
        body.append("place", place);
      }
      const res = await fetch(`/api/admin/works/${workId}/visuals/upload`, { method: "POST", body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memuat naik imej.");
      setSuccess("Imej dimuat naik dan dipautkan ke karya. Karya belum diterbitkan.");
      setFile(null);
      setAlt("");
      setAnchor("");
      setApproved(false);
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ralat tidak diketahui.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="admin-credit-form" style={{ marginBottom: 16 }}>
      <h3 style={{ margin: "0 0 8px" }}>Muat naik imej</h3>
      <p className="admin-form-hint">
        Pilih imej (PNG/JPEG/WebP, maksimum 10 MB; disyorkan bawah 4 MB). Ia disimpan dan dipautkan terus. Direkod sebagai sumber
        &quot;manual&quot;.
      </p>

      {error ? <div className="admin-alert admin-alert-error">{error}</div> : null}
      {success ? <div className="admin-alert admin-alert-success">{success}</div> : null}

      <div className="admin-form-row">
        <div className="admin-form-group">
          <label htmlFor="wvu-role">Role *</label>
          <select id="wvu-role" value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="hero">Hero (gambar utama)</option>
            <option value="inline">Inline (dalam teks)</option>
            <option value="section">Section</option>
          </select>
        </div>
        <div className="admin-form-group">
          <label htmlFor="wvu-file">Fail imej *</label>
          <input
            id="wvu-file"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </div>
      </div>

      <div className="admin-form-group">
        <label htmlFor="wvu-alt">Alt text * (satu ayat menerangkan gambar)</label>
        <input id="wvu-alt" value={alt} onChange={(e) => setAlt(e.target.value)} placeholder="cth. Seorang penyelidik berniqab menghadap skrin komputer…" />
      </div>

      {role === "inline" ? (
        <div className="admin-form-row">
          <div className="admin-form-group">
            <label htmlFor="wvu-anchor">Anchor (teks dalam karya; salin satu perenggan penuh)</label>
            <textarea id="wvu-anchor" className="admin-textarea" rows={3} value={anchor} onChange={(e) => setAnchor(e.target.value)} />
          </div>
          <div className="admin-form-group">
            <label htmlFor="wvu-place">Letak imej</label>
            <select id="wvu-place" value={place} onChange={(e) => setPlace(e.target.value)}>
              <option value="after">Selepas anchor</option>
              <option value="before">Sebelum anchor</option>
            </select>
          </div>
        </div>
      ) : null}

      <div className="admin-form-group">
        <label htmlFor="wvu-tool">Alat yang digunakan (pilihan)</label>
        <input id="wvu-tool" value={tool} onChange={(e) => setTool(e.target.value)} placeholder="cth. ChatGPT" />
      </div>

      <label className="admin-checkbox-label">
        <input type="checkbox" checked={approved} onChange={(e) => setApproved(e.target.checked)} /> Saya telah menyemak imej ini
        (muka manusia tidak jelas, sepadan dengan adegan, tiada teks, nombor, jenama atau bingkai pada imej) dan meluluskannya.
      </label>

      <div className="admin-form-actions">
        <button type="button" className="admin-btn admin-btn-primary" disabled={!canSubmit} onClick={submit}>
          {busy ? "Memuat naik…" : "Muat naik & pautkan"}
        </button>
      </div>
    </div>
  );
}
