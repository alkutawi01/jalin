"use client";

import { useCallback, useEffect, useState } from "react";
import type { AudienceBand } from "../../lib/audience";
import { toast } from "../../lib/admin/dialogs";

interface Row {
  code: string;
  label: string;
  min: string;
  max: string;
}

const toRow = (b: AudienceBand): Row => ({ code: b.code, label: b.label, min: String(b.min), max: b.max === null ? "" : String(b.max) });

/** Tetapan: the audience bands an editor ticks on a work (name and age range). A band keeps its code when renamed. */
export default function AudienceBandsSettings() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [defaults, setDefaults] = useState<AudienceBand[]>([]);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/audience-bands");
    if (!res.ok) return setError("Peringkat audiens tidak dapat dimuatkan.");
    const data = (await res.json()) as { bands: AudienceBand[]; defaults: AudienceBand[] };
    setRows(data.bands.map(toRow));
    setDefaults(data.defaults);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function patch(index: number, change: Partial<Row>) {
    setRows((current) => (current ? current.map((row, i) => (i === index ? { ...row, ...change } : row)) : current));
  }

  async function save(next: Row[]) {
    setSaving(true);
    setNote(null);
    setError(null);
    const bands = next.map((r) => ({ code: r.code, label: r.label, min: r.min.trim() === "" ? NaN : Number(r.min), max: r.max.trim() === "" ? null : Number(r.max) }));
    const res = await fetch("/api/admin/audience-bands", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ bands }) });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      const text = data.error || "Peringkat audiens tidak dapat disimpan.";
      setError(text);
      toast(text, "error");
      return;
    }
    setRows((data.bands as AudienceBand[]).map(toRow));
    setNote("Peringkat audiens disimpan.");
    toast("Peringkat audiens disimpan.", "success");
  }

  if (!rows) return <p className="admin-form-hint">{error ?? "Memuatkan…"}</p>;

  return (
    <>
      <p className="admin-form-hint">
        Senarai yang ditanda pada setiap karya dan siri (satu karya boleh untuk lebih daripada satu peringkat). Umur dalam tahun; kosongkan
        &quot;hingga&quot; bagi &quot;dan ke atas&quot;. Menukar nama tidak menjejaskan karya yang sudah ditanda.
      </p>
      {error ? <div className="admin-alert admin-alert-error" role="alert">{error}</div> : null}
      {note ? <div className="admin-alert admin-alert-success" role="status">{note}</div> : null}
      <div className="admin-table-wrap">
      <table className="admin-table a-bands-table">
        <thead>
          <tr><th>Nama</th><th>Dari (tahun)</th><th>Hingga (tahun)</th><th /></tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.code + index}>
              <td className="admin-table-title"><input aria-label={`Nama peringkat ${index + 1}`} value={row.label} maxLength={30} onChange={(e) => patch(index, { label: e.target.value })} /></td>
              <td><input aria-label={`Dari umur, ${row.label}`} inputMode="numeric" value={row.min} onChange={(e) => patch(index, { min: e.target.value })} /></td>
              <td><input aria-label={`Hingga umur, ${row.label}`} inputMode="numeric" placeholder="ke atas" value={row.max} onChange={(e) => patch(index, { max: e.target.value })} /></td>
              <td>
                <button type="button" className="admin-btn admin-btn-sm admin-btn-danger" disabled={rows.length < 2 || saving} onClick={() => setRows(rows.filter((_, i) => i !== index))}>Buang</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
      <div className="admin-form-actions">
        <button type="button" className="admin-btn admin-btn-outline" disabled={rows.length >= 8 || saving} onClick={() => setRows([...rows, { code: "", label: "", min: "", max: "" }])}>+ Peringkat</button>
        <button type="button" className="admin-btn admin-btn-outline" disabled={saving} onClick={() => setRows(defaults.map(toRow))}>Pulihkan senarai asal</button>
        <button type="button" className="admin-btn admin-btn-primary" disabled={saving} onClick={() => save(rows)}>{saving ? "Menyimpan…" : "Simpan peringkat"}</button>
      </div>
    </>
  );
}
