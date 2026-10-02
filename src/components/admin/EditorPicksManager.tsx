"use client";

import { useMemo, useState } from "react";
import { toast } from "../../lib/admin/dialogs";

interface PickWork {
  id: string;
  title: string;
  type: string;
  slug: string;
  rank: number | null;
  reason: string;
}

const LIMIT = 5;
const SHOWN = 8;
const TYPE_LABELS: Record<string, string> = { cerpen: "Cerpen", novela: "Novela", bersiri: "Bersiri", fragmen: "Fragmen", sinopsis: "Sinopsis" };

const fold = (text: string) => text.normalize("NFKD").replace(/\p{Diacritic}/gu, "").toLocaleLowerCase("ms");

export default function EditorPicksManager({ initial }: { initial: { picks: PickWork[]; others: PickWork[] } }) {
  const [picks, setPicks] = useState<PickWork[]>(initial.picks);
  const [others, setOthers] = useState<PickWork[]>(initial.others);
  const [query, setQuery] = useState("");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const full = picks.length >= LIMIT;
  const matches = useMemo(() => {
    const q = fold(query.trim());
    const found = q ? others.filter((work) => fold(work.title).includes(q) || fold(TYPE_LABELS[work.type] ?? work.type).includes(q) || fold(work.slug).includes(q)) : others;
    return found;
  }, [others, query]);

  function add(work: PickWork) {
    if (full) return;
    setPicks((prev) => [...prev, work]);
    setOthers((prev) => prev.filter((w) => w.id !== work.id));
    setQuery("");
    setDirty(true);
  }
  function remove(work: PickWork) {
    setPicks((prev) => prev.filter((w) => w.id !== work.id));
    setOthers((prev) => [{ ...work, reason: "" }, ...prev]);
    setDirty(true);
  }

  async function save() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/admin/editor-picks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ picks: picks.map((w) => ({ id: w.id, reason: w.reason })) })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan pilihan.");
      setPicks(data.picks);
      setOthers(data.others);
      setDirty(false);
      toast("Pilihan Editor disimpan. Laman utama dikemas kini serta-merta.", "success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ralat tidak diketahui.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      {error ? <div className="admin-alert admin-alert-error" role="alert">{error}</div> : null}

      <section className="admin-section" aria-labelledby="picks-now">
        <h2 id="picks-now" className="admin-form-section-title">Dalam karusel laman utama ({picks.length}/{LIMIT})</h2>
        {picks.length === 0 ? (
          <p className="admin-table-empty">Belum ada pilihan. Laman utama tidak memaparkan bahagian Pilihan Editor.</p>
        ) : (
          <ul className="a-pick-chips">
            {picks.map((work) => (
              <li key={work.id} className="a-pick-chip">
                <span><strong>{work.title}</strong> <span className="admin-form-hint">{TYPE_LABELS[work.type] ?? work.type}</span></span>
                <button type="button" className="admin-btn admin-btn-sm admin-btn-danger" onClick={() => remove(work)} aria-label={`Buang ${work.title} daripada pilihan`}>Buang</button>
              </li>
            ))}
          </ul>
        )}

        <div className="admin-form-group a-pick-search">
          <label htmlFor="pick-search">Tambah karya</label>
          <input
            id="pick-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={full ? `Sudah ${LIMIT} pilihan. Buang satu dahulu.` : "Taip tajuk atau jenis karya…"}
            disabled={full}
            autoComplete="off"
          />
          {!full ? (
            <ul className="a-pick-results" aria-label="Karya terbit">
              {matches.slice(0, SHOWN).map((work) => (
                <li key={work.id}>
                  <button type="button" onClick={() => add(work)}>
                    <span>{work.title}</span>
                    <span className="admin-form-hint">{TYPE_LABELS[work.type] ?? work.type}</span>
                  </button>
                </li>
              ))}
              {matches.length === 0 ? <li className="admin-form-hint a-pick-none">Tiada karya sepadan.</li> : null}
              {matches.length > SHOWN ? <li className="admin-form-hint a-pick-none">{matches.length - SHOWN} lagi. Taip untuk menyempitkan carian.</li> : null}
            </ul>
          ) : null}
        </div>

        <div className="admin-form-actions">
          <button type="button" className="admin-btn admin-btn-primary" onClick={() => void save()} disabled={!dirty || saving}>
            {saving ? "Menyimpan…" : "Simpan pilihan"}
          </button>
          <span className="admin-form-hint" role="status">{dirty ? "Ada perubahan belum disimpan" : "Semua perubahan disimpan"}</span>
        </div>
      </section>
    </div>
  );
}
