"use client";

import { useCallback, useEffect, useState } from "react";

interface Place {
  name: string;
  description?: string;
}

const NAME_MAX = 80;
const DESCRIPTION_MAX = 160;
const PLACES_MAX = 12;

/**
 * Latar tempat: where the story happens. A name and a few words each; shown to the reader in the right column beside the
 * characters. Saved on its own (like the characters) into works.metadata.places.
 */
export default function PlacesEditor({ workId }: { workId: string }) {
  const [places, setPlaces] = useState<Place[] | null>(null);
  const [baseline, setBaseline] = useState("[]");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/works/${workId}/places`);
    if (!res.ok) return setError("Gagal memuatkan latar tempat.");
    const data = (await res.json()) as Place[];
    setPlaces(data);
    setBaseline(JSON.stringify(data));
  }, [workId]);

  useEffect(() => {
    load();
  }, [load]);

  if (!places) return <p className="admin-form-hint">{error ?? "Memuatkan latar tempat…"}</p>;

  const dirty = JSON.stringify(places) !== baseline;

  async function save() {
    setError(null);
    setSuccess(null);
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/works/${workId}/places`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ places })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan latar tempat.");
      setPlaces(data);
      setBaseline(JSON.stringify(data));
      setSuccess("Latar tempat disimpan.");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ralat tidak diketahui.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="admin-places">
      <div className="admin-credits-header">
        <h3>Latar Tempat</h3>
        <button
          type="button"
          className="admin-btn admin-btn-sm admin-btn-primary"
          disabled={places.length >= PLACES_MAX}
          onClick={() => setPlaces([...places, { name: "", description: "" }])}
        >
          + Tambah Tempat
        </button>
      </div>
      <p className="admin-form-hint">
        Di mana cerita ini berlaku: nama tempat dan beberapa patah kata (pilihan). Dipaparkan kepada pembaca di lajur kanan, di bawah
        Watak. Paling banyak {PLACES_MAX} tempat.
      </p>
      {error ? <div className="admin-alert admin-alert-error" role="alert">{error}</div> : null}
      {success ? <div className="admin-alert admin-alert-success" role="status">{success}</div> : null}
      {places.length === 0 ? (
        <p className="admin-table-empty">Tiada latar tempat direkodkan untuk karya ini.</p>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Nama</th>
                <th>Keterangan ringkas</th>
                <th>Aksi</th>
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
                      aria-label={`Nama tempat ${index + 1}`}
                      placeholder="Contoh: Beranda rumah Pak Long"
                      onChange={(e) => setPlaces(places.map((p, i) => (i === index ? { ...p, name: e.target.value } : p)))}
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      value={place.description ?? ""}
                      maxLength={DESCRIPTION_MAX}
                      aria-label={`Keterangan tempat ${index + 1}`}
                      placeholder="Contoh: Kampung, tahun 1990-an"
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
          {saving ? "Menyimpan..." : "Simpan Latar Tempat"}
        </button>
        {dirty ? <span className="admin-form-hint" role="status"> Ada perubahan yang belum disimpan.</span> : null}
      </div>
    </div>
  );
}
