"use client";

import { useCallback, useEffect, useState } from "react";
import { errorText } from "../../lib/admin/error-text";

interface Place {
  name: string;
  description?: string;
}

const NAME_MAX = 80;
const DESCRIPTION_MAX = 160;
const SETTINGS = {
  places: {
    path: "places",
    max: 12,
    title: "Latar Tempat",
    noun: "latar tempat",
    nameLabel: "Nama tempat",
    add: "+ Tambah tempat",
    save: "Simpan latar tempat",
    hint: "Di mana cerita ini berlaku: nama tempat dan beberapa patah kata (pilihan). Dipaparkan kepada pembaca di lajur kanan, di bawah Watak.",
    namePlaceholder: "Contoh: Beranda rumah Pak Long",
    descriptionPlaceholder: "Contoh: Tempat keluarga berkumpul"
  },
  times: {
    path: "times",
    max: 6,
    title: "Latar Masa",
    noun: "latar masa",
    nameLabel: "Tahun atau era",
    add: "+ Tambah masa",
    save: "Simpan latar masa",
    hint: "Bila cerita ini berlaku: tahun, tempoh atau era (contoh: 1969, Era Darurat 1948–1960), BUKAN pagi, siang atau malam. Dipaparkan kepada pembaca di lajur kanan, di bawah Latar tempat.",
    namePlaceholder: "Contoh: Mei 1969",
    descriptionPlaceholder: "Contoh: Selepas rusuhan, waktu perintah berkurung"
  }
} as const;

/**
 * Latar tempat and Latar masa: where and when the story happens. A name and a few words each; shown to the reader in the right column
 * beside the characters. Each is saved on its own (like the characters) into works.metadata.places / works.metadata.times.
 */
export default function PlacesEditor({ workId, kind = "places" }: { workId: string; kind?: "places" | "times" }) {
  const cfg = SETTINGS[kind];
  const PLACES_MAX = cfg.max;
  const [places, setPlaces] = useState<Place[] | null>(null);
  const [baseline, setBaseline] = useState("[]");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/works/${workId}/${cfg.path}`);
    if (!res.ok) return setError(`Senarai ${cfg.noun} tidak dapat dimuatkan.`);
    const data = (await res.json()) as Place[];
    setPlaces(data);
    setBaseline(JSON.stringify(data));
  }, [workId, cfg.path, cfg.noun]);

  useEffect(() => {
    load();
  }, [load]);

  if (!places) return <p className="admin-form-hint">{error ?? `Memuatkan ${cfg.noun}…`}</p>;

  const dirty = JSON.stringify(places) !== baseline;

  async function save() {
    setError(null);
    setSuccess(null);
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/works/${workId}/${cfg.path}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [cfg.path]: places })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Senarai ${cfg.noun} tidak dapat disimpan.`);
      setPlaces(data);
      setBaseline(JSON.stringify(data));
      setSuccess(`${cfg.title.replace("Latar", "Latar")} disimpan.`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="admin-places">
      <div className="admin-credits-header">
        <h3>{cfg.title}</h3>
        <button
          type="button"
          className="admin-btn admin-btn-sm admin-btn-primary"
          disabled={places.length >= PLACES_MAX}
          onClick={() => setPlaces([...places, { name: "", description: "" }])}
        >
          {cfg.add}
        </button>
      </div>
      <p className="admin-form-hint">
        {cfg.hint} Paling banyak {PLACES_MAX}.
      </p>
      {error ? <div className="admin-alert admin-alert-error" role="alert">{error}</div> : null}
      {success ? <div className="admin-alert admin-alert-success" role="status">{success}</div> : null}
      {places.length === 0 ? (
        <p className="admin-table-empty">Tiada {cfg.noun} direkodkan untuk karya ini.</p>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>{cfg.nameLabel}</th>
                <th>Keterangan ringkas</th>
                <th>Tindakan</th>
              </tr>
            </thead>
            <tbody>
              {places.map((place, index) => (
                <tr key={index}>
                  <td>
                    <input
                      type="text"
                      value={place.name}
                      maxLength={NAME_MAX}
                      aria-label={`${cfg.nameLabel} ${index + 1}`}
                      placeholder={cfg.namePlaceholder}
                      onChange={(e) => setPlaces(places.map((p, i) => (i === index ? { ...p, name: e.target.value } : p)))}
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      value={place.description ?? ""}
                      maxLength={DESCRIPTION_MAX}
                      aria-label={`Keterangan ${cfg.noun} ${index + 1}`}
                      placeholder={cfg.descriptionPlaceholder}
                      onChange={(e) => setPlaces(places.map((p, i) => (i === index ? { ...p, description: e.target.value } : p)))}
                    />
                  </td>
                  <td>
                    <button type="button" className="admin-btn admin-btn-sm admin-btn-danger" onClick={() => setPlaces(places.filter((_, i) => i !== index))}>
                      Padam
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="admin-form-actions">
        <button type="button" className="admin-btn admin-btn-primary" disabled={saving || !dirty} onClick={save}>
          {saving ? "Menyimpan…" : cfg.save}
        </button>
        {dirty ? <span className="admin-form-hint" role="status"> Ada perubahan yang belum disimpan.</span> : null}
      </div>
    </div>
  );
}
