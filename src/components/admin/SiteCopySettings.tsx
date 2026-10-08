"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "../../lib/admin/dialogs";

interface Intro {
  type: string;
  saved: string;
  default: string;
}

const LABELS: Record<string, string> = { cerpen: "Cerpen", novela: "Novela", bersiri: "Bersiri", fragmen: "Fragmen", sinopsis: "Sinopsis" };
const MAX = 240;

/** Tetapan: the sentence under the title of each public list page ("Senarai Bersiri"). Empty means the default sentence. Saved with the Simpan button. */
export default function SiteCopySettings() {
  const [intros, setIntros] = useState<Intro[] | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<{ text: string; failed: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/site-copy");
    if (!res.ok) return setStatus({ text: "Teks halaman senarai tidak dapat dimuatkan.", failed: true });
    const data = (await res.json()) as { intros: Intro[] };
    setIntros(data.intros);
    setValues(Object.fromEntries(data.intros.map((i) => [i.type, i.saved || i.default])));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (!intros) return <p className="admin-form-hint" role={status?.failed ? "alert" : undefined}>{status?.text ?? "Memuatkan…"}</p>;

  const changed = intros.filter((intro) => (values[intro.type] ?? "").trim() !== (intro.saved || intro.default));

  async function save() {
    if (busy || changed.length === 0 || !intros) return;
    setBusy(true);
    setStatus({ text: "Menyimpan…", failed: false });
    const done: string[] = [];
    let problem: string | null = null;
    for (const intro of changed) {
      const res = await fetch("/api/admin/site-copy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: intro.type, text: (values[intro.type] ?? "").trim() })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        problem = `${LABELS[intro.type] ?? intro.type}: ${data.error || "tidak dapat disimpan"}`;
        break;
      }
      done.push(LABELS[intro.type] ?? intro.type);
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

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        save();
      }}
    >
      <p className="admin-form-hint">
        Ayat di bawah tajuk setiap halaman senarai awam (contoh: &quot;Senarai Bersiri&quot;). Tekan Simpan selepas menyunting.
        Kosongkan kotak untuk kembali kepada ayat asal. Perubahan kelihatan pada laman awam dalam beberapa saat.
      </p>
      <table className="admin-table">
        <tbody>
          {intros.map((intro) => {
            const isChanged = (values[intro.type] ?? "").trim() !== (intro.saved || intro.default);
            return (
              <tr key={intro.type}>
                <td style={{ width: "20%" }}>
                  <strong>{LABELS[intro.type] ?? intro.type}</strong>
                  {isChanged ? <span className="admin-form-hint">Belum disimpan</span> : null}
                </td>
                <td>
                  <textarea
                    rows={2}
                    maxLength={MAX}
                    aria-label={`Ayat pengenalan halaman ${LABELS[intro.type] ?? intro.type}`}
                    placeholder={intro.default}
                    value={values[intro.type] ?? ""}
                    onChange={(e) => setValues({ ...values, [intro.type]: e.target.value })}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="admin-form-actions">
        <button type="submit" className="admin-btn admin-btn-primary" disabled={busy || changed.length === 0}>{busy ? "Menyimpan…" : "Simpan"}</button>
        <span className="admin-form-hint" role={status?.failed ? "alert" : "status"}>
          {status ? status.text : changed.length > 0 ? `${changed.length} perubahan belum disimpan.` : "Tiada perubahan."}
        </span>
      </div>
    </form>
  );
}
