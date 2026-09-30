"use client";

import { useEffect, useState } from "react";

/**
 * Upload an image straight from a work. One step: the file is
 * stored, the editor's action is recorded as approval, and the image is attached to
 * the work. The work is never published by this.
 */
export default function WorkVisualUpload({ workId, onDone, hasHero, published, suggestedAnchor = "" }: { workId: string; onDone: () => void; hasHero: boolean; published: boolean; suggestedAnchor?: string }) {
  const [role, setRole] = useState(hasHero ? "inline" : "hero");
  const [alt, setAlt] = useState("");
  const [anchor, setAnchor] = useState("");
  const [place, setPlace] = useState("after");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (hasHero && role === "hero") setRole("inline");
  }, [hasHero, role]);
  useEffect(() => {
    if (suggestedAnchor) {
      setRole("inline");
      setAnchor(suggestedAnchor);
    }
  }, [suggestedAnchor]);

  const canSubmit = !!file && alt.trim().length > 0 && (role === "hero" || anchor.trim().length > 0) && !busy;

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
      if (role !== "hero") {
        if (anchor.trim()) body.append("anchor", anchor.trim());
        body.append("place", place);
      }
      const res = await fetch(`/api/admin/works/${workId}/visuals/upload`, { method: "POST", body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memuat naik imej.");
      setSuccess(published ? "Gambar disimpan. Semak pratonton dan halaman awam; perubahan mungkin mengambil masa sehingga 30 saat untuk muncul." : "Gambar disimpan. Semak pratonton sebelum menerbitkan karya.");
      setFile(null);
      setAlt("");
      setAnchor("");
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ralat tidak diketahui.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="admin-credit-form" style={{ marginBottom: 16 }}>
      <h4 style={{ margin: "0 0 8px" }}>Tambah gambar</h4>
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
            <option value="inline">Dalam teks</option>
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
            <label htmlFor="wvu-anchor">Perenggan tempat gambar muncul</label>
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

      <div className="admin-form-actions">
        <button type="button" className="admin-btn admin-btn-primary" disabled={!canSubmit} onClick={submit}>
          {busy ? "Memuat naik…" : "Muat naik & pautkan"}
        </button>
      </div>
    </div>
  );
}
