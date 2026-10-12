"use client";

import { useCallback, useEffect, useState } from "react";
import { errorText } from "../../lib/admin/error-text";
import { COUNTRY_OPTIONS, countryLabel, normaliseCountries } from "../../lib/reader/countries";

/**
 * Negara latar: the country the story is set in, shown on cards as the third part of the small line above the title.
 * The country only (never a village or a street). One country, or two when the story truly belongs to both
 * ("Malaysia-Indonesia"). Malaysia alone is not shown. Saved on its own into works.metadata.countries.
 */
export default function CountryEditor({ workId }: { workId: string }) {
  const [first, setFirst] = useState("");
  const [second, setSecond] = useState("");
  const [baseline, setBaseline] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/works/${workId}`);
    if (!res.ok) return setError("Negara latar tidak dapat dimuatkan.");
    const work = await res.json();
    const codes = normaliseCountries(work?.metadata?.countries);
    setFirst(codes[0] ?? "");
    setSecond(codes[1] ?? "");
    setBaseline(codes.join(","));
    setLoaded(true);
  }, [workId]);

  useEffect(() => {
    load();
  }, [load]);

  if (!loaded) return <p className="admin-form-hint">{error ?? "Memuatkan negara latar…"}</p>;

  const codes = [first, second].filter(Boolean);
  const current = codes.join(",");
  const dirty = current !== baseline;
  const preview = countryLabel(codes);

  async function save() {
    setError(null);
    setSuccess(null);
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/works/${workId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ countries: codes })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Negara latar tidak dapat disimpan.");
      setBaseline(current);
      setSuccess("Negara latar disimpan. Terbitkan semula karya ini supaya pembaca melihatnya.");
      setTimeout(() => setSuccess(null), 4000);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="admin-places">
      <div className="admin-credits-header">
        <h3>Negara Latar</h3>
      </div>
      <p className="admin-form-hint">
        Negara tempat cerita ini berlaku, bukan kampung, lorong atau daerah. Dipaparkan pada kad (Cerpen · Sejarah · Jepun) dan
        halaman karya. Isi hanya jika teks menyatakannya atau jelas menunjukkannya; jika perlu meneka, biarkan kosong. Malaysia
        sahaja tidak dipaparkan. Pilih negara kedua hanya jika cerita itu benar-benar milik kedua-dua negara
        (contoh: Malaysia-Indonesia); jika tidak, pilih satu sahaja. Zaman sejarah: pilih negara hari ini, contohnya Peru untuk
        Empayar Inka.
      </p>
      {error ? <div className="admin-alert admin-alert-error" role="alert">{error}</div> : null}
      {success ? <div className="admin-alert admin-alert-success" role="status">{success}</div> : null}
      <div className="admin-form-row">
        <div className="admin-form-group">
          <label htmlFor="country-1">Negara</label>
          <select
            id="country-1"
            value={first}
            onChange={(e) => {
              setFirst(e.target.value);
              if (!e.target.value || e.target.value === second) setSecond("");
            }}
          >
            <option value="">Tiada (tidak dipaparkan)</option>
            {COUNTRY_OPTIONS.map((option) => (
              <option key={option.code} value={option.code}>{option.name}</option>
            ))}
          </select>
        </div>
        <div className="admin-form-group">
          <label htmlFor="country-2">Negara kedua (jarang)</label>
          <select id="country-2" value={second} disabled={!first} onChange={(e) => setSecond(e.target.value)}>
            <option value="">Tiada</option>
            {COUNTRY_OPTIONS.filter((option) => option.code !== first).map((option) => (
              <option key={option.code} value={option.code}>{option.name}</option>
            ))}
          </select>
        </div>
      </div>
      <p className="admin-form-hint" role="status">
        Pada kad: {preview ? <strong>{preview}</strong> : "tiada negara dipaparkan"}.
      </p>
      <div className="admin-form-actions">
        <button type="button" className="admin-btn admin-btn-primary" disabled={saving || !dirty} onClick={save}>
          {saving ? "Menyimpan…" : "Simpan negara latar"}
        </button>
        {dirty ? <span className="admin-form-hint" role="status"> Ada perubahan yang belum disimpan.</span> : null}
      </div>
    </div>
  );
}
