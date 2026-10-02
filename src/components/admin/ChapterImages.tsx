"use client";

import { useMemo, useState } from "react";
import { toast } from "../../lib/admin/dialogs";

interface VisualLike {
  id: number;
  role: string;
  src: string;
  alt: string | null;
  anchor: string | null;
  section_slug?: string | null;
}

/** Image markers written in a chapter's text, e.g. [[gambar:1]]. */
function markersIn(text: string): string[] {
  return [...new Set(text.match(/\[\[gambar:\d+\]\]/g) ?? [])];
}

/**
 * The images of one novela chapter: its own hero (shown at the head of the chapter; the novela's hero stands in
 * until one is added) and images inside its text, each tied to a marker written in that chapter.
 */
export default function ChapterImages({
  workId,
  section,
  visuals,
  published,
  onChanged
}: {
  workId: string;
  section: { slug: string; title: string | null; body: string };
  visuals: VisualLike[];
  published: boolean;
  onChanged: () => void;
}) {
  const mine = visuals.filter((visual) => visual.section_slug === section.slug);
  const hero = mine.find((visual) => visual.role === "section" && !visual.anchor);
  const inline = mine.filter((visual) => visual.anchor);
  const free = useMemo(() => markersIn(section.body).filter((marker) => !inline.some((visual) => visual.anchor === marker)), [section.body, inline]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [marker, setMarker] = useState("");

  async function send(file: File, role: "section" | "inline", anchor?: string, replaceId?: number) {
    setBusy(true);
    setError("");
    try {
      let res: Response;
      if (replaceId) {
        const body = new FormData();
        body.append("file", file);
        res = await fetch(`/api/admin/visuals/${replaceId}/replace`, { method: "POST", body });
      } else {
        const body = new FormData();
        body.append("file", file);
        body.append("role", role);
        body.append("sectionSlug", section.slug);
        body.append("alt", "");
        body.append("tool", "Muat naik editor");
        if (anchor) body.append("anchor", anchor);
        res = await fetch(`/api/admin/works/${workId}/visuals/upload`, { method: "POST", body });
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Gagal memuat naik gambar.");
      toast(published ? "Gambar disimpan dalam draf. Pembaca belum melihatnya: tekan Terbitkan semula di atas karya." : "Gambar bab disimpan.", "success");
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ralat tidak diketahui.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: number) {
    if (!window.confirm("Padam gambar ini?")) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/visuals/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Gagal memadam gambar.");
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ralat tidak diketahui.");
    } finally {
      setBusy(false);
    }
  }

  const fileInput = (label: string, onFile: (file: File) => void, disabled = false) => (
    <label className={`admin-btn admin-btn-sm${disabled ? " is-disabled" : ""}`} style={{ cursor: disabled ? "not-allowed" : "pointer" }}>
      {label}
      <input type="file" accept="image/png,image/jpeg,image/webp" hidden disabled={disabled || busy} onChange={(e) => {
        const file = e.target.files?.[0];
        e.target.value = "";
        if (file) onFile(file);
      }} />
    </label>
  );

  return (
    <section className="a-chapter-images" aria-label={`Gambar bab ${section.slug}`}>
      <h4>Gambar untuk {section.title || section.slug}</h4>
      {error ? <div className="admin-alert admin-alert-error" role="alert">{error}</div> : null}

      <div className="a-chapter-block">
        <strong>Hero bab</strong>
        <p className="admin-form-hint">Dipaparkan di kepala bab ini. Jika tiada, hero Novela digunakan.</p>
        {hero ? (
          <div className="a-chapter-row">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={hero.src} alt={hero.alt || ""} />
            <div>
              {fileInput("Ganti gambar", (file) => void send(file, "section", undefined, hero.id))}
              <button type="button" className="admin-btn admin-btn-sm admin-btn-danger" onClick={() => void remove(hero.id)} disabled={busy}>Padam</button>
              <p className="admin-form-hint">Untuk memilih bahagian gambar yang dipaparkan, buka tab Kandungan, bahagian Gambar dalam karya, dan tekan Ubah butiran.</p>
            </div>
          </div>
        ) : fileInput("Muat naik hero bab", (file) => void send(file, "section"))}
      </div>

      <div className="a-chapter-block">
        <strong>Gambar dalam teks bab</strong>
        <p className="admin-form-hint">Tulis penanda seperti <code>[[gambar:1]]</code> pada baris sendiri dalam teks bab ini (nombor bermula semula bagi setiap bab), simpan bab, kemudian pilih penanda dan muat naik gambar.</p>
        {inline.map((visual) => (
          <div className="a-chapter-row" key={visual.id}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={visual.src} alt={visual.alt || ""} />
            <div>
              <code>{visual.anchor}</code>{" "}
              {section.body.includes(visual.anchor ?? "") ? null : <span className="admin-form-hint">Penanda tiada dalam teks tersimpan: gambar tidak muncul.</span>}
              <div>
                {fileInput("Ganti gambar", (file) => void send(file, "inline", visual.anchor ?? undefined, visual.id))}
                <button type="button" className="admin-btn admin-btn-sm admin-btn-danger" onClick={() => void remove(visual.id)} disabled={busy}>Padam</button>
              </div>
            </div>
          </div>
        ))}
        {free.length === 0 ? (
          <p className="admin-form-hint">Tiada penanda kosong dalam teks tersimpan bab ini.</p>
        ) : (
          <div className="a-chapter-add">
            <select value={free.includes(marker) ? marker : free[0]} onChange={(e) => setMarker(e.target.value)} aria-label="Penanda gambar">
              {free.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
            {fileInput("Muat naik gambar", (file) => void send(file, "inline", free.includes(marker) ? marker : free[0]))}
          </div>
        )}
      </div>
    </section>
  );
}
