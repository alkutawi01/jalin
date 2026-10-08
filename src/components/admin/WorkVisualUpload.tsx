"use client";

import { useEffect, useRef, useState } from "react";
import { imageMarkerLabel } from "../../lib/reader/image-markers";
import { MAX_UPLOAD_LABEL, uploadTooLargeMessage } from "../../lib/admin/upload-limit";
import { errorText } from "../../lib/admin/error-text";
import FilePicker from "./FilePicker";

/**
 * Upload an image straight from a work. One step: the file is
 * stored, the editor's action is recorded as approval, and the image is attached to
 * the work. The work is never published by this.
 */
export default function WorkVisualUpload({ workId, onDone, hasHero, published, suggestedAnchor = "", markers }: { workId: string; onDone: () => void; hasHero: boolean; published: boolean; suggestedAnchor?: string; markers: string[] }) {
  const [role, setRole] = useState(hasHero ? "inline" : "hero");
  const [alt, setAlt] = useState("");
  const [anchor, setAnchor] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (hasHero && role === "hero") setRole("inline");
  }, [hasHero, role]);
  useEffect(() => {
    if (suggestedAnchor && markers.includes(suggestedAnchor)) {
      setRole("inline");
      setAnchor(suggestedAnchor);
    }
  }, [suggestedAnchor, markers]);

  const canSubmit = !!file && (role === "hero" || markers.includes(anchor)) && !busy;

  async function submit() {
    if (!file) return;
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const tooLarge = uploadTooLargeMessage(file.size);
      if (tooLarge) throw new Error(tooLarge);
      const body = new FormData();
      body.append("file", file);
      body.append("role", role);
      body.append("alt", alt);
      if (role !== "hero") {
        body.append("anchor", anchor);
        body.append("place", "after");
      }
      const res = await fetch(`/api/admin/works/${workId}/visuals/upload`, { method: "POST", body });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Imej tidak dapat dimuat naik.");
      setSuccess(published ? "Gambar disimpan dalam draf. Pembaca belum melihatnya: tekan Terbitkan semula di atas karya." : "Gambar disimpan. Semak pratonton sebelum menerbitkan karya.");
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setAlt("");
      setAnchor("");
      onDone();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="admin-credit-form" style={{ marginBottom: 16 }}>
      <h4 style={{ margin: "0 0 8px" }}>Tambah gambar</h4>
      <p className="admin-form-hint">
        Pilih imej (PNG/JPEG/WebP, maksimum {MAX_UPLOAD_LABEL}). Muat naik menyimpan dan memautkan gambar terus; tidak perlu tekan “Simpan teks &amp; maklumat” selepasnya.
      </p>

      {error ? <div className="admin-alert admin-alert-error" role="alert">{error}</div> : null}
      {success ? <div className="admin-alert admin-alert-success" role="status">{success}</div> : null}

      <div className="admin-form-row">
        <div className="admin-form-group">
          <label htmlFor="wvu-role">Jenis *</label>
          <select id="wvu-role" value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="hero" disabled={hasHero}>Gambar utama</option>
            <option value="inline">Dalam teks</option>
          </select>
        </div>
        <div className="admin-form-group">
          <label htmlFor="wvu-file">Fail imej *</label>
          <FilePicker id="wvu-file" inputRef={fileInputRef} accept="image/png,image/jpeg,image/webp" selectedName={file?.name ?? null} onFile={setFile} />
        </div>
      </div>

      <div className="admin-form-group">
        <label htmlFor="wvu-alt">Teks alternatif (pilihan; satu ayat untuk pembaca yang tidak nampak gambar)</label>
        <input id="wvu-alt" value={alt} onChange={(e) => setAlt(e.target.value)} placeholder="cth. Seorang penyelidik berniqab menghadap skrin komputer…" />
      </div>

      {role !== "hero" ? (
        <div className="admin-form-group">
          <label htmlFor="wvu-anchor">Penanda gambar dalam manuskrip *</label>
          <select id="wvu-anchor" value={markers.includes(anchor) ? anchor : ""} onChange={(e) => setAnchor(e.target.value)}>
            <option value="">Pilih penanda yang belum digunakan…</option>
            {markers.map((marker) => <option key={marker} value={marker}>{imageMarkerLabel(marker)}</option>)}
          </select>
          <span className="admin-form-hint">{markers.length === 0 ? "Tiada penanda kosong. Sisip penanda baharu dalam manuskrip dan simpan teks & maklumat dahulu." : "Gambar muncul di tempat penanda ini. Alihkan baris penanda dalam manuskrip untuk mengubah kedudukannya."}</span>
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
