"use client";

import { useState } from "react";
import { toast } from "../../lib/admin/dialogs";

interface PickWork {
  id: string;
  title: string;
  type: string;
  slug: string;
  rank: number | null;
  reason: string;
}

const LIMIT = 3;
const TYPE_LABELS: Record<string, string> = { cerpen: "Cerpen", novela: "Novela", bersiri: "Bersiri", fragmen: "Fragmen", sinopsis: "Sinopsis" };

export default function EditorPicksManager({ initial }: { initial: { picks: PickWork[]; others: PickWork[] } }) {
  const [picks, setPicks] = useState<PickWork[]>(initial.picks);
  const [others, setOthers] = useState<PickWork[]>(initial.others);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const full = picks.length >= LIMIT;

  function add(work: PickWork) {
    if (full) return;
    setPicks((prev) => [...prev, work]);
    setOthers((prev) => prev.filter((w) => w.id !== work.id));
    setDirty(true);
  }
  function remove(work: PickWork) {
    setPicks((prev) => prev.filter((w) => w.id !== work.id));
    setOthers((prev) => [{ ...work, reason: "" }, ...prev]);
    setDirty(true);
  }
  function move(index: number, delta: -1 | 1) {
    const target = index + delta;
    if (target < 0 || target >= picks.length) return;
    setPicks((prev) => {
      const next = [...prev];
      [next[index], next[target]] = [next[target]!, next[index]!];
      return next;
    });
    setDirty(true);
  }
  function setReason(id: string, reason: string) {
    setPicks((prev) => prev.map((w) => (w.id === id ? { ...w, reason } : w)));
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
        <h2 id="picks-now" className="admin-form-section-title">Dipaparkan di laman utama ({picks.length}/{LIMIT})</h2>
        {picks.length === 0 ? (
          <p className="admin-table-empty">Belum ada pilihan. Pilih karya daripada senarai di bawah.</p>
        ) : (
          <ol className="a-picks">
            {picks.map((work, index) => (
              <li key={work.id} className="a-pick">
                <div className="a-pick-head">
                  <strong>{index + 1}. {work.title}</strong>
                  <span className="admin-form-hint">{TYPE_LABELS[work.type] ?? work.type}</span>
                </div>
                <label className="admin-form-hint" htmlFor={`reason-${work.id}`}>Sebab dipilih (catatan dalaman, tidak dipaparkan kepada pembaca)</label>
                <input
                  id={`reason-${work.id}`}
                  type="text"
                  maxLength={300}
                  value={work.reason}
                  onChange={(e) => setReason(work.id, e.target.value)}
                />
                <div className="admin-form-actions">
                  <button type="button" className="admin-btn admin-btn-sm admin-btn-outline" onClick={() => move(index, -1)} disabled={index === 0} aria-label={`Naikkan ${work.title}`}>↑ Naik</button>
                  <button type="button" className="admin-btn admin-btn-sm admin-btn-outline" onClick={() => move(index, 1)} disabled={index === picks.length - 1} aria-label={`Turunkan ${work.title}`}>↓ Turun</button>
                  <button type="button" className="admin-btn admin-btn-sm admin-btn-danger" onClick={() => remove(work)}>Buang</button>
                </div>
              </li>
            ))}
          </ol>
        )}
        <div className="admin-form-actions">
          <button type="button" className="admin-btn admin-btn-primary" onClick={() => void save()} disabled={!dirty || saving}>
            {saving ? "Menyimpan…" : "Simpan pilihan"}
          </button>
          <span className="admin-form-hint" role="status">{dirty ? "Ada perubahan belum disimpan" : "Semua perubahan disimpan"}</span>
        </div>
      </section>

      <section className="admin-section" aria-labelledby="picks-others">
        <h2 id="picks-others" className="admin-form-section-title">Karya terbit lain</h2>
        {full ? <p className="admin-form-hint">Sudah {LIMIT} pilihan. Buang satu dahulu untuk memilih karya lain.</p> : null}
        {others.length === 0 ? (
          <p className="admin-table-empty">Tiada karya terbit lain.</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr><th>Tajuk</th><th>Jenis</th><th>Aksi</th></tr>
              </thead>
              <tbody>
                {others.map((work) => (
                  <tr key={work.id}>
                    <td className="admin-table-title">{work.title}</td>
                    <td>{TYPE_LABELS[work.type] ?? work.type}</td>
                    <td>
                      <button type="button" className="admin-btn admin-btn-sm" disabled={full} onClick={() => add(work)}>
                        Jadikan pilihan
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
