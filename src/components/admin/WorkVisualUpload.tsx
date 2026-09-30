"use client";

import { useEffect, useState } from "react";

/**
 * Upload an image straight from a work's Visual tab. One step: the file is
 * stored, the editor's approval is recorded, and the image is attached to
 * the work. The work is never published by this.
 */
export default function WorkVisualUpload({ workId, onDone, hasHero }: { workId: string; onDone: () => void; hasHero: boolean }) {
  const [role, setRole] = useState(hasHero ? "inline" : "hero");
  const [alt, setAlt] = useState("");
  const [anchor, setAnchor] = useState("");
  const [place, setPlace] = useState("after");
  const [approved, setApproved] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (hasHero && role === "hero") setRole("inline");
  }, [hasHero, role]);

  const canSubmit = !!file && alt.trim().length > 0 && (role === "hero" || anchor.trim().length > 0) && approved && !busy;

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
      if (role !== "hero") {
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
      <h3 style={{ margin: "0 0 8px" }}>Tambah imej baharu</h3>
      <p className="admin-form-hint">
        Pilih imej (PNG/JPEG/WebP, maksimum 10 MB; disyorkan bawah 4 MB). Ia disimpan dan dipautkan terus. Direkod sebagai sumber
        &quot;manual&quot;.
      </p>

      {error ? <div className="admin-alert admin-alert-error">{error}</div> : null}
      {success ? <div className="admin-alert admin-alert-success">{success}</div> : null}

      <div className="admin-form-row">
        <div className="admin-form-group">
          <label htmlFor="wvu-role">Jenis *</label>
          <select id="wvu-role" value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="hero" disabled={hasHero}>Hero (gambar utama)</option>
            <option value="inline">Inline (dalam teks)</option>
            <option value="section">Bahagian</option>
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
        <label htmlFor="wvu-alt">Teks alternatif * (satu ayat menerangkan gambar untuk pembaca yang tidak nampak gambar)</label>
        <input id="wvu-alt" value={alt} onChange={(e) => setAlt(e.target.value)} placeholder="cth. Seorang penyelidik berniqab menghadap skrin komputer…" />
      </div>

      {role !== "hero" ? (
        <div className="admin-form-row">
          <div className="admin-form-group">
            <label htmlFor="wvu-anchor">Anchor (teks dalam karya; salin satu perenggan penuh)</label>
            <textarea id="wvu-anchor" className="admin-textarea" rows={3} value={anchor} onChange={(e) => setAnchor(e.target.value)} />
          </div>
          <div className="admin-form-group">
            <label htmlFor="wvu-place">Letak imej</label>
            <select id="wvu-place" value={place} onChange={(e) => setPlace(e.target.value)}>
              <option value="after">Selepas petikan penanda</option>
              <option value="before">Sebelum petikan penanda</option>
            </select>
          </div>
        </div>
      ) : null}

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
