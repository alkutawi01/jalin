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

  const load = useCallback(async () => {
    try {
      const data = await api<{ works: Work[] }>("/api/admin/langganan/contoh", "GET");
      setWorks(data.works);
    } catch (e) {
      setError(errorText(e, "Senarai tidak dapat dimuatkan."));
    }
  }, []);
  useEffect(() => { void load(); }, [load]);

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
      <p className="admin-form-hint">{count} cerita contoh. Cadangan: 5. Cerita contoh boleh dibaca oleh sesiapa tanpa log masuk dan dipaparkan pada halaman <a href="/mula">/mula</a>.</p>
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
