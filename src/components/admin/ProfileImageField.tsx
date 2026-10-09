"use client";

import { useState } from "react";
import { confirmAction, toast } from "../../lib/admin/dialogs";
import { errorText } from "../../lib/admin/error-text";
import { MAX_UPLOAD_LABEL, uploadTooLargeMessage } from "../../lib/admin/upload-limit";
import FilePicker from "./FilePicker";

/**
 * One picture that an editor uploads, replaces or removes, with the text that describes it. Used for the picture across the top of the Editorial page. The picture itself goes to `endpoint` (POST file + alt, PATCH alt, DELETE); the page
 * is told to reload through `onChanged`.
 */
export default function ProfileImageField({
  id,
  endpoint,
  src,
  alt,
  title,
  hint,
  onChanged
}: {
  id: string;
  endpoint: string;
  src: string;
  alt: string;
  title: string;
  hint: string;
  onChanged: () => void | Promise<void>;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState(alt);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(work: () => Promise<Response>, fallback: string, done: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await work();
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || fallback);
      toast(done, "success");
      setFile(null);
      await onChanged();
    } catch (err) {
      setError(errorText(err, fallback));
    } finally {
      setBusy(false);
    }
  }

  function upload() {
    if (!file) return;
    const tooLarge = uploadTooLargeMessage(file.size);
    if (tooLarge) return setError(tooLarge);
    const body = new FormData();
    body.set("file", file);
    body.set("alt", text);
    void run(() => fetch(endpoint, { method: "POST", body }), "Gambar tidak dapat dimuat naik.", "Gambar disimpan.");
  }

  async function remove() {
    if (!(await confirmAction("Buang gambar ini? Halaman awam kembali tanpa gambar.", { danger: true, confirmLabel: "Ya, buang" }))) return;
    void run(() => fetch(endpoint, { method: "DELETE" }), "Gambar tidak dapat dibuang.", "Gambar dibuang.");
  }

  function saveAlt() {
    void run(
      () => fetch(endpoint, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ alt: text }) }),
      "Teks alternatif tidak dapat disimpan.",
      "Teks alternatif disimpan."
    );
  }

  return (
    <section className="admin-section" aria-labelledby={`${id}-title`}>
      <h2 id={`${id}-title`} className="admin-form-section-title">{title}</h2>
      <p className="admin-form-hint">{hint}</p>
      {error ? <div className="admin-alert admin-alert-error" role="alert">{error}</div> : null}
      {src ? (
        <figure className="a-profile-figure">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt={alt || "Gambar"} />
          <figcaption className="admin-form-hint">{alt || "Tiada teks alternatif"}</figcaption>
        </figure>
      ) : (
        <p className="admin-form-hint">Belum ada gambar. Halaman awam tidak memaparkan ruang kosong.</p>
      )}
      <div className="admin-form-group">
        <label htmlFor={`${id}-file`}>Fail gambar (PNG, JPEG atau WebP, maksimum {MAX_UPLOAD_LABEL})</label>
        <FilePicker id={`${id}-file`} accept="image/png,image/jpeg,image/webp" selectedName={file?.name ?? null} onFile={setFile} />
      </div>
      <div className="admin-form-group">
        <label htmlFor={`${id}-alt`}>Teks alternatif</label>
        <input id={`${id}-alt`} type="text" value={text} onChange={(e) => setText(e.target.value)} placeholder="Satu ayat yang menerangkan gambar kepada pembaca yang tidak dapat melihatnya" />
      </div>
      <div className="admin-form-actions">
        <button type="button" className="admin-btn admin-btn-primary" disabled={busy || !file} onClick={upload}>
          {busy ? "Memuat naik…" : src ? "Ganti gambar" : "Muat naik gambar"}
        </button>
        {src ? <button type="button" className="admin-btn admin-btn-outline" disabled={busy || text.trim() === alt.trim()} onClick={saveAlt}>Simpan teks alternatif</button> : null}
        {src ? <button type="button" className="admin-btn admin-btn-danger" disabled={busy} onClick={() => void remove()}>Buang gambar</button> : null}
      </div>
    </section>
  );
}
