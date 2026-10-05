"use client";

import { useCallback, useEffect, useState } from "react";

interface Intro {
  type: string;
  saved: string;
  default: string;
}

const LABELS: Record<string, string> = { cerpen: "Cerpen", novela: "Novela", bersiri: "Bersiri", fragmen: "Fragmen", sinopsis: "Sinopsis" };
const MAX = 240;

/** Tetapan: the sentence under the title of each public list page ("Senarai Bersiri"). Empty means the default sentence. */
export default function SiteCopySettings() {
  const [intros, setIntros] = useState<Intro[] | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [note, setNote] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/site-copy");
    if (!res.ok) return setNote("Gagal memuatkan teks halaman senarai.");
    const data = (await res.json()) as { intros: Intro[] };
    setIntros(data.intros);
    setValues(Object.fromEntries(data.intros.map((i) => [i.type, i.saved || i.default])));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function save(intro: Intro) {
    const text = (values[intro.type] ?? "").trim();
    if (text === (intro.saved || intro.default)) return;
    setNote(null);
    const res = await fetch("/api/admin/site-copy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: intro.type, text })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return setNote(data.error || "Gagal menyimpan.");
    setNote(text ? `Ayat pengenalan halaman ${LABELS[intro.type]} disimpan.` : `Halaman ${LABELS[intro.type]} kembali kepada ayat asal.`);
    load();
  }

  if (!intros) return <p className="admin-form-hint">{note ?? "Memuatkan…"}</p>;

  return (
    <>
      <p className="admin-form-hint">
        Ayat di bawah tajuk setiap halaman senarai awam (contoh: &quot;Senarai Bersiri&quot;). Klik di luar kotak untuk menyimpan.
        Kosongkan kotak untuk kembali kepada ayat asal. Perubahan kelihatan pada laman awam dalam beberapa saat.
      </p>
      <table className="admin-table">
        <tbody>
          {intros.map((intro) => (
            <tr key={intro.type}>
              <td style={{ width: "20%" }}>
                <strong>{LABELS[intro.type] ?? intro.type}</strong>
              </td>
              <td>
                <textarea
                  rows={2}
                  maxLength={MAX}
                  aria-label={`Ayat pengenalan halaman ${LABELS[intro.type] ?? intro.type}`}
                  placeholder={intro.default}
                  value={values[intro.type] ?? ""}
                  onChange={(e) => setValues({ ...values, [intro.type]: e.target.value })}
                  onBlur={() => save(intro)}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {note ? <p className="admin-form-hint" role="status">{note}</p> : null}
    </>
  );
}
