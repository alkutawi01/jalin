"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";

const WORK_TYPES = [
  { value: "cerpen", label: "Cerpen" },
  { value: "novela", label: "Novela" },
  { value: "bersiri", label: "Bersiri" },
  { value: "fragmen", label: "Fragmen" },
  { value: "sinopsis", label: "Sinopsis" },
];

const GENRE_SUGGESTIONS = ["Keluarga", "Drama Sosial", "Sejarah", "Drama", "Coming-of-age", "Misteri"];

function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

function estimateReadingMinutes(wordCount: number): number {
  return Math.max(1, Math.round(wordCount / 200));
}

/**
 * Jalin publishes Melayu originals alongside translations, so a title can
 * carry diacritics (Melayu, Vietnamese, French, ...) or a non-Latin script
 * (Arab, Cina, ...) entirely. NFKD + stripping combining marks recovers a
 * usable slug for the diacritic case; a script with no Latin base at all
 * (e.g. Arabic) still strips to nothing, so that case falls back to a
 * short, guaranteed-unique placeholder rather than an empty/invalid slug.
 * The field stays editable either way — this only has to not be empty.
 */
function generateSlug(title: string): string {
  const base = title
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return base || `karya-${Date.now().toString(36)}`;
}

export default function NewWorkPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  // Once the editor edits slug or readingMinutes by hand, stop silently
  // overwriting their value from title/body changes.
  const [slugTouched, setSlugTouched] = useState(false);
  const [readingMinutesTouched, setReadingMinutesTouched] = useState(false);
  const [wordCount, setWordCount] = useState(0);

  const [form, setForm] = useState({
    title: "",
    slug: "",
    type: "cerpen",
    body: "",
    genre: "",
    audience: "13-17",
    dek: "",
    readingMinutes: "",
    version: "v0.1",
  });

  function handleTitleChange(value: string) {
    setForm((prev) => ({
      ...prev,
      title: value,
      slug: slugTouched ? prev.slug : generateSlug(value),
    }));
  }

  function handleBodyChange(value: string) {
    // Count words exactly once per change (novela-length manuscripts run
    // 30,000-50,000 words; scanning the body twice per keystroke — once
    // for the display count, once for the readingMinutes estimate — was
    // measurably slower while typing). The one count is reused for both.
    const count = countWords(value);
    setWordCount(count);
    setForm((prev) => ({
      ...prev,
      body: value,
      readingMinutes: readingMinutesTouched
        ? prev.readingMinutes
        : String(estimateReadingMinutes(count)),
    }));
  }

  function handleSlugChange(value: string) {
    setSlugTouched(true);
    setForm((prev) => ({ ...prev, slug: value }));
  }

  function handleReadingMinutesChange(value: string) {
    setReadingMinutesTouched(true);
    // Reject negative input at the source rather than relying on the
    // number input's min attribute, which some browsers only enforce
    // on the spinner and not on typed or pasted values.
    const n = Number(value);
    if (value !== "" && (Number.isNaN(n) || n < 0)) return;
    setForm((prev) => ({ ...prev, readingMinutes: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/works", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          // New works always start as a draft. Review/ready is a
          // deliberate editorial decision made afterwards on the work's
          // own edit page, not a choice made while still typing a title.
          status: "draft",
          readingMinutes: form.readingMinutes ? Number(form.readingMinutes) : undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Gagal menyimpan.");
      }

      const work = await res.json();
      router.push(`/admin/works/${work.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ralat tidak diketahui.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="admin-form-page">
      <header className="admin-page-header">
        <h1>Karya Baharu</h1>
        <p className="admin-page-sub">Mulakan draf karya baharu</p>
      </header>

      {error && (
        <div className="admin-alert admin-alert-error">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="admin-form">
        {/* 1. Butiran asas */}
        <h2 className="admin-form-section-title">Butiran asas</h2>

        <div className="admin-form-group">
          <label htmlFor="title">Tajuk *</label>
          <input
            id="title"
            type="text"
            required
            value={form.title}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="Contoh: Kerusi di Beranda"
          />
        </div>

        <div className="admin-form-group">
          <label htmlFor="type">Jenis</label>
          <select
            id="type"
            aria-describedby="type-hint"
            value={form.type}
            onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value }))}
          >
            {WORK_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          <span id="type-hint" className="admin-form-hint">Lalai: Cerpen. Tukar jika karya ini jenis lain.</span>
        </div>

        <div className="admin-form-group">
          <label htmlFor="dek">Ringkasan pendek</label>
          <input
            id="dek"
            type="text"
            value={form.dek}
            onChange={(e) => setForm((prev) => ({ ...prev, dek: e.target.value }))}
            placeholder="Satu ayat ringkasan karya, tanpa spoiler"
          />
        </div>

        {/* 2. Manuskrip */}
        <h2 className="admin-form-section-title">Manuskrip</h2>

        <div className="admin-form-group">
          <label htmlFor="body">Manuskrip (Markdown) *</label>
          <textarea
            id="body"
            required
            aria-describedby="body-hint"
            value={form.body}
            onChange={(e) => handleBodyChange(e.target.value)}
            placeholder="Tampal atau tulis manuskrip di sini dalam format Markdown..."
            rows={20}
            className="admin-textarea"
          />
          <div className="admin-manuscript-meta">
            <span id="body-hint" className="admin-form-hint">
              Gunakan Markdown untuk pemformatan. Baris kosong memulakan perenggan baharu.
            </span>
            <span className="admin-word-count">{wordCount} perkataan</span>
          </div>
          <button
            type="button"
            className="admin-btn admin-btn-outline admin-btn-sm admin-preview-toggle"
            onClick={() => setShowPreview((v) => !v)}
          >
            {showPreview ? "Sembunyikan pratonton" : "Pratonton Markdown"}
          </button>
          {showPreview && (
            <div className="admin-markdown-preview">
              {form.body.trim() ? (
                <ReactMarkdown>{form.body}</ReactMarkdown>
              ) : (
                <p className="admin-form-hint">Tiada kandungan untuk dipratonton lagi.</p>
              )}
            </div>
          )}
        </div>

        {/* 3. Butiran penerbitan */}
        <h2 className="admin-form-section-title">Butiran penerbitan</h2>

        <div className="admin-form-row">
          <div className="admin-form-group">
            <label htmlFor="genre">Genre</label>
            <input
              id="genre"
              type="text"
              list="genre-suggestions"
              value={form.genre}
              onChange={(e) => setForm((prev) => ({ ...prev, genre: e.target.value }))}
              placeholder="Keluarga"
            />
            <datalist id="genre-suggestions">
              {GENRE_SUGGESTIONS.map((g) => (
                <option key={g} value={g} />
              ))}
            </datalist>
          </div>

          <div className="admin-form-group">
            <label htmlFor="audience">Audiens</label>
            <select
              id="audience"
              value={form.audience}
              onChange={(e) => setForm((prev) => ({ ...prev, audience: e.target.value }))}
            >
              <option value="13-17">13-17</option>
            </select>
          </div>

          <div className="admin-form-group">
            <label htmlFor="readingMinutes">Minit Bacaan</label>
            <input
              id="readingMinutes"
              type="number"
              min={0}
              aria-describedby="reading-minutes-hint"
              value={form.readingMinutes}
              onChange={(e) => handleReadingMinutesChange(e.target.value)}
              placeholder="15"
            />
            <span id="reading-minutes-hint" className="admin-form-hint">
              Anggaran automatik daripada manuskrip. Boleh dilaraskan.
            </span>
          </div>
        </div>

        <div className="admin-form-group">
          <label htmlFor="slug">Alamat pautan *</label>
          <input
            id="slug"
            type="text"
            required
            aria-describedby="slug-hint"
            value={form.slug}
            onChange={(e) => handleSlugChange(e.target.value)}
            placeholder="kerusi-di-beranda"
          />
          <span id="slug-hint" className="admin-form-hint">
            /kategori/{form.type}/{form.slug || "alamat-pautan"} — dijana daripada tajuk, boleh disunting. Mesti unik.
          </span>
        </div>

        <p className="admin-status-notice">
          Karya baharu sentiasa bermula sebagai <strong>Draf</strong>. Tukar status ke Semakan
          atau Sedia selepas ini pada halaman sunting karya.
        </p>

        <div className="admin-form-row">
          <details className="admin-advanced-field">
            <summary>Versi (lanjutan)</summary>
            <div className="admin-form-group">
              <label htmlFor="version">Versi</label>
              <input
                id="version"
                type="text"
                value={form.version}
                onChange={(e) => setForm((prev) => ({ ...prev, version: e.target.value }))}
                placeholder="v0.1"
              />
              <span className="admin-form-hint">Karya baharu bermula pada v0.1.</span>
            </div>
          </details>
        </div>

        {/* 4. Simpan */}
        <div className="admin-form-actions">
          <a href="/admin/works" className="admin-btn admin-btn-outline">
            Batal
          </a>
          <button
            type="submit"
            className="admin-btn admin-btn-primary"
            disabled={saving}
          >
            {saving ? "Menyimpan..." : "Simpan Draf"}
          </button>
        </div>
      </form>
    </div>
  );
}
