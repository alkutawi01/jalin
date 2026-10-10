"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "../../../../lib/admin/dialogs";
import { errorText } from "../../../../lib/admin/error-text";
import { api, Notice } from "../../../../components/admin/langganan-ui";

type Work = { slug: string; title: string; type: string; sample: boolean };
const TYPE: Record<string, string> = { cerpen: "Cerpen", novela: "Novela", bersiri: "Bersiri", fragmen: "Fragmen", sinopsis: "Sinopsis" };

/** Choose which published works anyone may read in full, as examples. Everything else needs a trial or a subscription once the paywall is on. */
export default function SampleManager() {
  const [works, setWorks] = useState<Work[] | null>(null);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("");
  const [busy, setBusy] = useState("");
  const [wall, setWall] = useState<{ url: string; month: string } | null | undefined>(undefined);
  const [making, setMaking] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api<{ works: Work[] }>("/api/admin/langganan/contoh", "GET");
      setWorks(data.works);
    } catch (e) {
      setError(errorText(e, "Senarai tidak dapat dimuatkan."));
    }
  }, []);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    api<{ wall: { url: string; month: string } | null }>("/api/admin/langganan/dinding-gambar", "GET").then((d) => setWall(d.wall)).catch(() => setWall(null));
  }, []);

  async function makeWall() {
    setMaking(true); setError("");
    try {
      const data = await api<{ wall: { url: string; month: string }; bytes: number; pictures: number }>("/api/admin/langganan/dinding-gambar", "POST", {});
      setWall(data.wall);
      toast("Gambar latar dijana (" + data.pictures + " gambar, " + Math.round(data.bytes / 1024) + " KB).", "success");
    } catch (e) {
      setError(errorText(e, "Gambar latar tidak dapat dijana."));
    } finally {
      setMaking(false);
    }
  }

  const shown = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return (works ?? []).filter((w) => !q || w.title.toLowerCase().includes(q) || (TYPE[w.type] ?? w.type).toLowerCase().includes(q));
  }, [works, filter]);
  const count = (works ?? []).filter((w) => w.sample).length;

  async function toggle(work: Work) {
    setBusy(work.slug); setError("");
    try {
      await api("/api/admin/langganan/contoh", "POST", { slug: work.slug, sample: !work.sample });
      setWorks((list) => (list ?? []).map((w) => (w.slug === work.slug ? { ...w, sample: !w.sample } : w)));
      toast(work.sample ? "Cerita ditutup semula." : "Cerita dibuka sebagai contoh.", "success");
    } catch (e) {
      setError(errorText(e, "Tidak berjaya."));
    } finally {
      setBusy("");
    }
  }

  if (!works && !error) return <p className="admin-form-hint">Memuatkan…</p>;
  return (
    <div>
      {error ? <Notice kind="error">{error}</Notice> : null}
      <section className="admin-form-group" aria-labelledby="wall-title">
        <h2 id="wall-title">Gambar latar halaman /mula</h2>
        <p className="admin-form-hint">
          Satu gambar gabungan daripada gambar karya, dijana sendiri pada 1 haribulan setiap bulan dan dikekalkan sehingga bulan berikutnya.
          {wall === undefined ? " Memeriksa…" : wall ? " Dijana untuk bulan " + wall.month + "." : " Belum dijana."}
        </p>
        <button type="button" className="admin-btn admin-btn-primary" onClick={makeWall} disabled={making}>{making ? "Menjana…" : "Jana sekarang"}</button>
      </section>
      <p className="admin-form-hint">{count} cerita contoh. Cadangan: 6 (atau 3, 8, 12). Halaman <a href="/mula">/mula</a> menyusun contoh dalam baris 3 atau 4, jadi bilangan lain dibundarkan ke bawah supaya tiada kad tunggal. Cerita contoh boleh dibaca oleh sesiapa tanpa log masuk.</p>
      <div className="admin-form-group">
        <label htmlFor="sample-filter">Cari cerita</label>
        <input id="sample-filter" type="search" value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Tajuk atau jenis" />
      </div>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead><tr><th scope="col">Cerita</th><th scope="col">Jenis</th><th scope="col">Contoh</th></tr></thead>
          <tbody>
            {shown.map((w) => (
              <tr key={w.slug}>
                <td>{w.title}</td>
                <td>{TYPE[w.type] ?? w.type}</td>
                <td>
                  <label className="admin-checkbox-label">
                    <input type="checkbox" checked={w.sample} disabled={busy === w.slug} onChange={() => void toggle(w)} aria-label={`Jadikan "${w.title}" cerita contoh`} />
                    {w.sample ? "Terbuka kepada semua" : "Dikunci"}
                  </label>
                </td>
              </tr>
            ))}
            {shown.length === 0 ? <tr><td colSpan={3}>Tiada cerita ditemui.</td></tr> : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
