"use client";

import AudiencePicker from "../../../../components/admin/AudiencePicker";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { slugify } from "../../../../lib/admin/import/text-utils";
import { errorText } from "../../../../lib/admin/error-text";
import CopyButton from "../../../../components/admin/CopyButton";
import { composeSeriesPrompt, parseSeriesAnswer } from "../../../../lib/admin/series-fill";

export default function NewSeriesPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Until the editor types an address themselves, it follows the title. */
  const [slugEdited, setSlugEdited] = useState(false);
  const [answer, setAnswer] = useState("");
  const [fillNote, setFillNote] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    slug: "",
    dek: "",
    genre: "",
    audience: "",
    mode: "continuous",
    status: "ongoing",
  });

  function fillFromAnswer() {
    const found = parseSeriesAnswer(answer);
    const count = Object.keys(found).length;
    if (count === 0) {
      setFillNote("Tiada medan dikenali. Pastikan jawapan ChatGPT menggunakan baris seperti 'Tajuk: ...'.");
      return;
    }
    if (found.slug) setSlugEdited(true);
    setForm((p) => ({ ...p, ...found }));
    setFillNote(`${count} medan diisi. Semak sebelum menambah siri.`);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/series", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Siri tidak dapat dicipta.");
      router.push(`/admin/series/${data.id}`);
    } catch (err) {
      setError(errorText(err));
      setSaving(false);
    }
  }

  return (
    <div className="admin-form-page">
      <header className="admin-page-header">
        <div>
          <h1>Siri baharu</h1>
          <p className="admin-page-sub">Bekas editorial untuk episod Bersiri</p>
        </div>
      </header>

      {error && <div className="admin-alert admin-alert-error" role="alert">{error}</div>}

      <section className="admin-form" aria-label="Isi dengan AI">
        <div className="admin-form-group">
          <label htmlFor="ai-answer">Isi dengan AI</label>
          <p className="admin-form-hint">Salin arahan, tampal ke ChatGPT bersama idea siri, kemudian tampal jawapannya di bawah.</p>
          <CopyButton text={composeSeriesPrompt()} label="Salin Arahan AI" />
          <textarea className="admin-textarea" rows={4} id="ai-answer" value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Tampal jawapan ChatGPT di sini" />
          <div className="admin-form-actions">
            <button type="button" className="admin-btn admin-btn-outline" onClick={fillFromAnswer} disabled={!answer.trim()}>Isi borang</button>
          </div>
          {fillNote && <p className="admin-form-hint" role="status">{fillNote}</p>}
        </div>
      </section>

      <form onSubmit={handleSubmit} className="admin-form">
        <div className="admin-form-group">
          <label htmlFor="title">Tajuk *</label>
          <input
            id="title"
            type="text"
            required
            value={form.title}
            onChange={(e) => setForm((p) => ({ ...p, title: e.target.value, ...(slugEdited ? {} : { slug: slugify(e.target.value) }) }))}
          />
        </div>
        <div className="admin-form-group">
          <label htmlFor="slug">Alamat pautan *</label>
          <input
            id="slug"
            type="text"
            required
            value={form.slug}
            onChange={(e) => { setSlugEdited(e.target.value !== ""); setForm((p) => ({ ...p, slug: e.target.value })); }}
            placeholder="siri-contoh"
          />
        </div>
        <div className="admin-form-group">
          <label htmlFor="dek">Blurb</label>
          <textarea className="admin-textarea" rows={4}
            id="dek"
            value={form.dek}
            onChange={(e) => setForm((p) => ({ ...p, dek: e.target.value }))}
          />
        </div>
        <div className="admin-form-row">
          <div className="admin-form-group">
            <label htmlFor="genre">Genre</label>
            <input
              id="genre"
              type="text"
              value={form.genre}
              onChange={(e) => setForm((p) => ({ ...p, genre: e.target.value }))}
            />
          </div>
          <div className="admin-form-group">
            <AudiencePicker value={form.audience} onChange={(next) => setForm((p) => ({ ...p, audience: next }))} />
          </div>
        </div>
        <div className="admin-form-row">
          <div className="admin-form-group">
            <label htmlFor="mode">Mod</label>
            <select
              id="mode"
              value={form.mode}
              onChange={(e) => setForm((p) => ({ ...p, mode: e.target.value }))}
            >
              <option value="continuous">Bersambung</option>
              <option value="anthology">Antologi</option>
            </select>
          </div>
          <div className="admin-form-group">
            <label htmlFor="status">Status</label>
            <select
              id="status"
              value={form.status}
              onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
            >
              <option value="ongoing">Masih diteruskan</option>
              <option value="completed">Tamat</option>
            </select>
          </div>
        </div>
        <div className="admin-form-actions">
          <a href="/admin/series" className="admin-btn admin-btn-outline">Kembali</a>
          <button type="submit" className="admin-btn admin-btn-primary" disabled={saving}>
            {saving ? "Menambah…" : "Tambah siri"}
          </button>
        </div>
      </form>
    </div>
  );
}
