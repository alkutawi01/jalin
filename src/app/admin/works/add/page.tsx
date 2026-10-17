"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { KIND_DESCRIPTIONS, KIND_LABELS, WORK_KINDS, type WorkKind } from "../../../../lib/admin/authoring/recipes";
import { errorText } from "../../../../lib/admin/error-text";

interface SeriesChoice { id: string; title: string; mode: string }

export default function AddWorkPage() {
  const router = useRouter();
  const [series, setSeries] = useState<SeriesChoice[]>([]);
  const [chooseSeries, setChooseSeries] = useState(false);
  const [seriesId, setSeriesId] = useState("");
  const [seriesLoaded, setSeriesLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const kind = params.get("jenis");
    const fromSeries = params.get("siri");
    // Coming from a series page: go straight to the step that asks about the series, with that series chosen.
    if (kind === "bersiri" && fromSeries) {
      setChooseSeries(true);
      setSeriesId(fromSeries);
    }
  }, []);

  useEffect(() => {
    fetch("/api/admin/series").then((res) => res.ok ? res.json() : []).then(setSeries).catch(() => setSeries([])).finally(() => setSeriesLoaded(true));
  }, []);

  async function start(type: WorkKind) {
    if (type === "bersiri" && !chooseSeries) {
      setChooseSeries(true);
      return;
    }
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/admin/works/start-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, seriesId: type === "bersiri" ? seriesId || undefined : undefined }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Draf gagal dibuat.");
      // A new draft always opens on its text. Nothing is inherited automatically; the editor is offered the series' details there.
      router.push(`/admin/works/${data.id}?baharu=1#content`);
    } catch (err) {
      setError(errorText(err, "Draf gagal dibuat."));
      setBusy(false);
    }
  }

  return (
    <div className="admin-form-page">
      <header className="admin-page-header">
        <h1>Tambah karya</h1>
        <p className="admin-page-sub">Memilih jenis karya terus mencipta draf kosong yang tersimpan; isi kandungannya dalam editor sebelum dihantar untuk semakan, dan ia tidak terbit secara automatik.</p>
      </header>
      {error && <div className="admin-alert admin-alert-error" role="alert">{error}</div>}
      {!chooseSeries ? <div className="admin-choice-grid">
        {WORK_KINDS.map((kind) => <button key={kind} type="button" className="admin-choice" disabled={busy} onClick={() => void start(kind)}>
          <strong>Cipta draf {KIND_LABELS[kind]}</strong><span>{KIND_DESCRIPTIONS[kind]}</span>
        </button>)}
      </div> : null}
      {chooseSeries ? <div className="admin-form">
        <h2 className="admin-form-section-title">Episod ini bagi siri yang mana?</h2>
        <p className="admin-form-hint">Setiap episod ialah karya sendiri yang dipautkan kepada sebuah siri. Siri dicipta di tab Siri.</p>
        {seriesLoaded && series.length === 0 ? (
          <div className="a-empty-state">
            <strong>Belum ada siri.</strong>
            <p>Cipta siri dahulu, kemudian tambah episod pertamanya dari halaman siri itu.</p>
            <a className="admin-btn admin-btn-primary" href="/admin/series/new">Cipta siri baharu</a>
          </div>
        ) : (
          <div className="admin-form-group">
            <label htmlFor="series-choice">Siri</label>
            <select id="series-choice" value={seriesId} onChange={(event) => setSeriesId(event.target.value)}>
              <option value="">— Pilih siri —</option>
              {series.map((item) => <option key={item.id} value={item.id}>{item.title} ({item.mode === "anthology" ? "antologi" : "bersambung"})</option>)}
            </select>
          </div>
        )}
        <div className="admin-form-actions">
          <button type="button" className="admin-btn admin-btn-outline" disabled={busy} onClick={() => setChooseSeries(false)}>Kembali</button>
          <button type="button" className="admin-btn admin-btn-primary" disabled={busy || !seriesId} onClick={() => void start("bersiri")}>{busy ? "Membuka draf…" : "Buka editor episod"}</button>
        </div>
      </div> : null}
    </div>
  );
}
