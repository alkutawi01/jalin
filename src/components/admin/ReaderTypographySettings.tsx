"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "../../lib/admin/dialogs";

interface Limits {
  min: number;
  max: number;
  step: number;
}
interface Loaded {
  bodyPx: number | null;
  headingEm: number | null;
  limits: { bodyPx: Limits; headingEm: Limits };
}

/** Tetapan > Saiz teks karya: the size of the story text (px) and of its sub-headings (em) on every work. Empty = Jalin's own sizes. */
export default function ReaderTypographySettings() {
  const [data, setData] = useState<Loaded | null>(null);
  const [body, setBody] = useState("");
  const [heading, setHeading] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/reader-typography");
    if (!res.ok) {
      setFailed(true);
      return setNote("Saiz teks karya tidak dapat dimuatkan.");
    }
    const loaded = (await res.json()) as Loaded;
    setData(loaded);
    setBody(loaded.bodyPx === null ? "" : String(loaded.bodyPx));
    setHeading(loaded.headingEm === null ? "" : String(loaded.headingEm));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function save(next: { bodyPx: string; headingEm: string }) {
    if (busy) return;
    setBusy(true);
    setFailed(false);
    setNote("Menyimpan…");
    const res = await fetch("/api/admin/reader-typography", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bodyPx: next.bodyPx.trim() === "" ? null : next.bodyPx, headingEm: next.headingEm.trim() === "" ? null : next.headingEm })
    });
    const result = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setFailed(true);
      const text = result.error || "Saiz teks karya tidak dapat disimpan.";
      setNote(text);
      toast(text, "error");
      return;
    }
    setBody(result.bodyPx === null ? "" : String(result.bodyPx));
    setHeading(result.headingEm === null ? "" : String(result.headingEm));
    setNote("Saiz teks karya disimpan.");
    toast("Saiz teks karya disimpan.", "success");
  }

  if (!data) return <p className="admin-form-hint" role={failed ? "alert" : undefined}>{note ?? "Memuatkan…"}</p>;

  const { bodyPx, headingEm } = data.limits;
  return (
    <>
      <p className="admin-form-hint">
        Saiz teks dan tajuk bahagian di dalam karya, untuk semua karya. Kosongkan satu medan untuk kembali kepada saiz asal Jalin, yang berubah mengikut lebar skrin
        (kira-kira 17.5 hingga 21 px untuk teks). Apabila diisi, saiz itu dipakai pada semua lebar skrin, jadi semak juga pada telefon. Perubahan kelihatan pada laman awam serta-merta.
      </p>
      <form
        className="admin-form"
        onSubmit={(event) => {
          event.preventDefault();
          save({ bodyPx: body, headingEm: heading });
        }}
      >
        <div className="admin-form-group">
          <label htmlFor="saiz-teks-isi">Saiz teks karya (px)</label>
          <input id="saiz-teks-isi" className="admin-input" type="number" inputMode="decimal" min={bodyPx.min} max={bodyPx.max} step={bodyPx.step} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Asal Jalin" />
          <p className="admin-form-hint">Antara {bodyPx.min} dan {bodyPx.max} px.</p>
        </div>
        <div className="admin-form-group">
          <label htmlFor="saiz-teks-tajuk">Saiz tajuk bahagian (em)</label>
          <input id="saiz-teks-tajuk" className="admin-input" type="number" inputMode="decimal" min={headingEm.min} max={headingEm.max} step={headingEm.step} value={heading} onChange={(e) => setHeading(e.target.value)} placeholder="Asal Jalin" />
          <p className="admin-form-hint">Antara {headingEm.min} dan {headingEm.max} em, mengikut saiz teks karya (1.3 em ialah 30% lebih besar daripada teks).</p>
        </div>
        <div className="admin-form-actions">
          <button type="submit" className="admin-btn admin-btn-primary" disabled={busy}>{busy ? "Menyimpan…" : "Simpan"}</button>
          <button type="button" className="admin-btn" disabled={busy} onClick={() => save({ bodyPx: "", headingEm: "" })}>Kembali kepada saiz asal</button>
        </div>
      </form>
      {note ? <p className="admin-form-hint" role={failed ? "alert" : "status"}>{note}</p> : null}
    </>
  );
}
