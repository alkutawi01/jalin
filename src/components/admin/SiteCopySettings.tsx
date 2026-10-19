"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "../../lib/admin/dialogs";

interface Copy {
  type: string;
  saved: string;
  default: string;
}
type Kind = "intro" | "tile";

const LABELS: Record<string, string> = { cerpen: "Cerpen", novela: "Novela", bersiri: "Bersiri", fragmen: "Fragmen", sinopsis: "Sinopsis" };
const KIND_LABELS: Record<Kind, string> = { intro: "halaman senarai", tile: "kad laman utama" };
const MAX = 240;
const key = (kind: Kind, type: string) => `${kind}:${type}`;

/** Tetapan: the sentence under the title of each public list page ("Senarai Bersiri") and the line under each category card on the home page. Empty means the default. Saved with the Simpan button. */
export default function SiteCopySettings() {
  const [rows, setRows] = useState<Record<string, Copy> | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<{ text: string; failed: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/site-copy");
    if (!res.ok) return setStatus({ text: "Teks halaman awam tidak dapat dimuatkan.", failed: true });
    const data = (await res.json()) as { intros: Copy[]; tiles: Copy[] };
    const all: Record<string, Copy> = {};
    for (const item of data.intros) all[key("intro", item.type)] = item;
    for (const item of data.tiles) all[key("tile", item.type)] = item;
    setRows(all);
    setValues(Object.fromEntries(Object.entries(all).map(([k, v]) => [k, v.saved || v.default])));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (!rows) return <p className="admin-form-hint" role={status?.failed ? "alert" : undefined}>{status?.text ?? "Memuatkan…"}</p>;

  const types = Array.from(new Set(Object.values(rows).map((r) => r.type)));
  const changed = Object.keys(rows).filter((k) => (values[k] ?? "").trim() !== (rows[k].saved || rows[k].default));

  async function save() {
    if (busy || changed.length === 0 || !rows) return;
    setBusy(true);
    setStatus({ text: "Menyimpan…", failed: false });
    const done: string[] = [];
    let problem: string | null = null;
    for (const k of changed) {
      const [kind, type] = k.split(":") as [Kind, string];
      const name = `${LABELS[type] ?? type} (${KIND_LABELS[kind]})`;
      const res = await fetch("/api/admin/site-copy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, kind, text: (values[k] ?? "").trim() })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        problem = `${name}: ${data.error || "tidak dapat disimpan"}`;
        break;
      }
      done.push(name);
    }
    setBusy(false);
    if (done.length > 0) await load();
    if (problem) {
      const text = `Teks halaman awam tidak dapat disimpan sepenuhnya. ${done.length > 0 ? `Disimpan: ${done.join(", ")}. ` : ""}${problem}.`;
      setStatus({ text, failed: true });
      toast(text, "error");
      return;
    }
    const text = `Teks halaman awam disimpan: ${done.join(", ")}.`;
    setStatus({ text, failed: false });
    toast(text, "success");
  }

  function field(kind: Kind, type: string) {
    const k = key(kind, type);
    const row = rows![k];
    return (
      <input
        type="text"
        maxLength={MAX}
        aria-label={`Teks ${KIND_LABELS[kind]} ${LABELS[type] ?? type}`}
        placeholder={row.default}
        value={values[k] ?? ""}
        onChange={(e) => setValues({ ...values, [k]: e.target.value })}
      />
    );
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        save();
      }}
    >
      <p className="admin-form-hint">
        Dua teks bagi setiap kategori: ayat di bawah tajuk halaman senarai (contoh: &quot;Senarai Bersiri&quot;) dan baris di bawah nama kategori pada kad
        &quot;Terokai kategori&quot; di laman utama. Tekan Simpan selepas menyunting. Kosongkan medan untuk kembali kepada ayat asal.
        Perubahan kelihatan pada laman awam dalam beberapa saat.
      </p>
      <div className="admin-table-wrap">
      <table className="admin-table a-form-list">
        <thead>
          <tr>
            <th scope="col">Kategori</th>
            <th scope="col">Halaman senarai</th>
            <th scope="col">Kad laman utama</th>
          </tr>
        </thead>
        <tbody>
          {types.map((type) => {
            const isChanged = (["intro", "tile"] as Kind[]).some((kind) => changed.includes(key(kind, type)));
            return (
              <tr key={type}>
                <td>
                  <strong>{LABELS[type] ?? type}</strong>
                  {isChanged ? <span className="admin-form-hint">Belum disimpan</span> : null}
                </td>
                <td>{field("intro", type)}</td>
                <td>{field("tile", type)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>
      <div className="admin-form-actions">
        <button type="submit" className="admin-btn admin-btn-primary" disabled={busy || changed.length === 0}>{busy ? "Menyimpan…" : "Simpan"}</button>
        <span className="admin-form-hint" role={status?.failed ? "alert" : "status"}>
          {status ? status.text : changed.length > 0 ? `${changed.length} perubahan belum disimpan.` : "Tiada perubahan."}
        </span>
      </div>
    </form>
  );
}
