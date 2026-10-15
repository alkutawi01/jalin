"use client";

import { useCallback, useEffect, useState } from "react";
import { errorText } from "../../lib/admin/error-text";
import { COUNTRY_OPTIONS, MAX_COUNTRY_LENGTH, cleanCountryText, countryLabel, countryName, normaliseCountries } from "../../lib/reader/countries";

/**
 * Negara latar: the country or region the story is set in, shown on cards beside the reading time ("Jepun · ± 11 minit").
 * The editor types it, so it can be an older region too (Empayar Inka, Al-Andalus, Joseon); the list only suggests names, among
 * them the work's own Latar tempat. Malaysia alone is not shown. Saved on its own into works.metadata.countries.
 */
export default function CountryEditor({ workId }: { workId: string }) {
  const [text, setText] = useState("");
  const [baseline, setBaseline] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/works/${workId}`);
    if (!res.ok) return setError("Negara latar tidak dapat dimuatkan.");
    const work = await res.json();
    const shown = normaliseCountries(work?.metadata?.countries).map(countryName).join("-");
    setText(shown);
    setBaseline(shown);
    const places = await fetch(`/api/admin/works/${workId}/places`).then((r) => (r.ok ? r.json() : [])).catch(() => []);
    const own = Array.isArray(places) ? places.map((p: { name?: unknown }) => (typeof p?.name === "string" ? p.name.trim() : "")).filter(Boolean) : [];
    setSuggestions(own);
    setLoaded(true);
  }, [workId]);

  useEffect(() => {
    load();
  }, [load]);

  if (!loaded) return <p className="admin-form-hint">{error ?? "Memuatkan negara latar…"}</p>;

  const value = cleanCountryText(text);
  const dirty = value !== baseline;
  const preview = countryLabel(value ? [value] : []);
  const tooLong = value.length > MAX_COUNTRY_LENGTH;
  const names = [...new Set([...suggestions, ...COUNTRY_OPTIONS.map((option) => option.name)])];

  async function save() {
    setError(null);
    setSuccess(null);
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/works/${workId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ countries: value ? [value] : [] })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Negara latar tidak dapat disimpan.");
      setBaseline(value);
      setSuccess("Negara latar disimpan. Tekan Terbitkan semula supaya pembaca melihatnya.");
      setTimeout(() => setSuccess(null), 4000);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="admin-places" data-unsaved={dirty || saving}>
      <div className="admin-credits-header">
        <h3>Negara Latar</h3>
      </div>
      <p className="admin-form-hint">
        Negara atau wilayah tempat cerita ini berlaku, ditaip seperti yang mahu dibaca pada kad (contoh: Jepun, Empayar Inka,
        Al-Andalus). Bukan kampung, lorong atau daerah. Isi hanya jika teks menyatakannya atau jelas menunjukkannya; jika perlu
        meneka, biarkan kosong. Isi SATU negara atau wilayah utama tempat kebanyakan cerita berlaku; jangan masukkan negara yang
        hanya disebut, dilalui atau menjadi asal-usul watak. Malaysia sahaja tidak dipaparkan. Cadangan di bawah termasuk Latar tempat karya ini.
      </p>
      {error ? <div className="admin-alert admin-alert-error" role="alert">{error}</div> : null}
      {success ? <div className="admin-alert admin-alert-success" role="status">{success}</div> : null}
      <div className="admin-form-group">
        <label htmlFor="country-text">Negara atau wilayah</label>
        <input
          id="country-text"
          type="text"
          list="country-suggestions"
          value={text}
          maxLength={MAX_COUNTRY_LENGTH + 10}
          placeholder="Contoh: Empayar Inka"
          onChange={(e) => setText(e.target.value)}
        />
        <datalist id="country-suggestions">
          {names.map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>
      </div>
      {tooLong ? <p className="admin-alert admin-alert-error" role="alert">Paling banyak {MAX_COUNTRY_LENGTH} aksara.</p> : null}
      <p className="admin-form-hint" role="status">
        Pada kad: {preview ? <strong>{preview}</strong> : "tiada negara dipaparkan"}.
      </p>
      <div className="admin-form-actions">
        <button type="button" className="admin-btn admin-btn-primary" disabled={saving || !dirty || tooLong} onClick={save}>
          {saving ? "Menyimpan…" : "Simpan negara latar"}
        </button>
        {dirty ? <span className="admin-form-hint" role="status"> Ada perubahan yang belum disimpan.</span> : null}
      </div>
    </div>
  );
}
