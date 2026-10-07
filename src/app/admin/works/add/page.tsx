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
  /** The kind the editor picked; the next question is how to start it. */
  const [picked, setPicked] = useState<WorkKind | null>(null);
  const [seriesId, setSeriesId] = useState("");
  const [seriesLoaded, setSeriesLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const kind = params.get("jenis");
    const fromSeries = params.get("siri");
    if (kind && (WORK_KINDS as string[]).includes(kind)) setPicked(kind as WorkKind);
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
      router.push(`/admin/works/${data.id}#content`);
    } catch (err) {
      setError(errorText(err, "Draf gagal dibuat."));
      setBusy(false);
    }
  }

  return (
    <div className="admin-form-page">
      <header className="admin-page-header">
        <h1>Tambah karya</h1>
        <p className="admin-page-sub">{picked ? `Bagaimana mahu memulakan ${KIND_LABELS[picked]}?` : "Pilih jenis karya. Jenis yang dipilih dikekalkan sehingga draf siap dan tidak boleh ditukar senyap oleh bot sembang. Draf tidak diterbitkan secara automatik."}</p>
      </header>
      {error && <div className="admin-alert admin-alert-error" role="alert">{error}</div>}
      {!chooseSeries && picked ? <div className="admin-choice-grid">
        <button type="button" className="admin-choice" disabled={busy} onClick={() => void start(picked)}>
          <strong>Tulis sendiri</strong>
          <span>Buka editor kosong. Anda menaip teks, kemudian menambah kredit, gambar dan glosari sendiri. Tiada bot sembang terlibat.</span>
        </button>
        <a className="admin-choice" href={`/admin/works/add/${picked}`}>
          <strong>Guna bot sembang</strong>
          <span>Salin arahan, tampal jawapan bot sembang. Sistem mengisi tajuk, glosari, watak dan permintaan gambar. Hasilnya draf yang sama seperti &quot;Tulis sendiri&quot;, tetapi sudah berisi dan boleh disunting.</span>
        </a>
        <button type="button" className="admin-btn admin-btn-outline" onClick={() => setPicked(null)}>← Tukar jenis</button>
      </div> : null}
      {!chooseSeries && !picked ? <div className="admin-choice-grid">
        {WORK_KINDS.map((kind) => <button key={kind} type="button" className="admin-choice" disabled={busy} onClick={() => setPicked(kind)}>
          <strong>{KIND_LABELS[kind]}</strong><span>{KIND_DESCRIPTIONS[kind]}</span>
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
