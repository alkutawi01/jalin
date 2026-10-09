"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "../../lib/admin/dialogs";
import { DEVICES, DEVICE_IDS, deviceInfo, type DeviceId } from "../../lib/reader/typography-devices";
import ReaderTypographyPreview from "./ReaderTypographyPreview";

interface Limits {
  min: number;
  max: number;
  step: number;
}
interface Sizes {
  bodyPx: number | null;
  headingEm: number | null;
}
interface Loaded {
  bodyPx: number | null;
  headingEm: number | null;
  devices?: Partial<Record<DeviceId, Sizes>>;
  limits: { bodyPx: Limits; headingEm: Limits };
}
type Boxes = Record<DeviceId, { body: string; heading: string }>;

const text = (value: number | null | undefined) => (value === null || value === undefined ? "" : String(value));
const emptyBoxes = (): Boxes => Object.fromEntries(DEVICE_IDS.map((id) => [id, { body: "", heading: "" }])) as Boxes;

/** A number typed in a box, or null when the box is empty or is not a number inside the limits (the mock-up then shows Jalin's own size). */
function usable(value: string, limits: Limits): number | null {
  const number = Number(value.trim().replace(",", "."));
  return value.trim() !== "" && Number.isFinite(number) && number >= limits.min && number <= limits.max ? number : null;
}

/**
 * Tetapan > Saiz teks karya: the size of the story text (px) and of its sub-headings (em) for every work, for each kind of screen on its own.
 * An empty box means Jalin's own size, which the box shows. A mock-up of the chosen screen, one at a time, shows the result as it is typed.
 */
export default function ReaderTypographySettings() {
  const [data, setData] = useState<Loaded | null>(null);
  const [boxes, setBoxes] = useState<Boxes>(emptyBoxes);
  const [all, setAll] = useState({ body: "", heading: "" });
  const [active, setActive] = useState<DeviceId>("phone");
  const [note, setNote] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);

  const apply = useCallback((loaded: Pick<Loaded, "bodyPx" | "headingEm" | "devices">) => {
    // A size kept for every screen (how sizes used to be saved) fills the screens that have none of their own, so the boxes show what applies.
    setBoxes(Object.fromEntries(DEVICE_IDS.map((id) => [id, { body: text(loaded.devices?.[id]?.bodyPx ?? loaded.bodyPx), heading: text(loaded.devices?.[id]?.headingEm ?? loaded.headingEm) }])) as Boxes);
  }, []);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/reader-typography");
    if (!res.ok) {
      setFailed(true);
      return setNote("Saiz teks karya tidak dapat dimuatkan.");
    }
    const loaded = (await res.json()) as Loaded;
    setData(loaded);
    apply(loaded);
  }, [apply]);

  useEffect(() => {
    load();
  }, [load]);

  async function save(next: Boxes) {
    if (busy) return;
    setBusy(true);
    setFailed(false);
    setNote("Menyimpan…");
    const devices = Object.fromEntries(
      DEVICE_IDS.map((id) => [id, { bodyPx: next[id].body.trim() === "" ? null : next[id].body, headingEm: next[id].heading.trim() === "" ? null : next[id].heading }])
    );
    const res = await fetch("/api/admin/reader-typography", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ devices })
    });
    const result = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setFailed(true);
      const message = result.error || "Saiz teks karya tidak dapat disimpan.";
      setNote(message);
      toast(message, "error");
      return;
    }
    apply({ bodyPx: null, headingEm: null, devices: result.devices });
    setNote("Saiz teks karya disimpan.");
    toast("Saiz teks karya disimpan.", "success");
  }

  if (!data) return <p className="admin-form-hint" role={failed ? "alert" : undefined}>{note ?? "Memuatkan…"}</p>;

  const { bodyPx, headingEm } = data.limits;
  const set = (id: DeviceId, field: "body" | "heading", value: string) => setBoxes((current) => ({ ...current, [id]: { ...current[id], [field]: value } }));
  const shown = boxes[active];

  return (
    <>
      <p className="admin-form-hint">
        Saiz teks dan tajuk bahagian di dalam karya, untuk semua karya, bagi setiap jenis skrin. Kotak yang dikosongkan mengikut saiz asal Jalin, yang dipaparkan sebagai
        contoh dalam kotak itu. Perubahan kelihatan pada laman awam serta-merta selepas disimpan.
      </p>
      <form
        className="admin-form"
        onSubmit={(event) => {
          event.preventDefault();
          save(boxes);
        }}
      >
        <div className="admin-form-row">
          <div className="admin-form-group">
            <label htmlFor="saiz-semua-isi">Semua skrin: teks karya (px)</label>
            <input id="saiz-semua-isi" className="admin-input" type="number" inputMode="decimal" min={bodyPx.min} max={bodyPx.max} step={bodyPx.step} value={all.body} onChange={(e) => setAll({ ...all, body: e.target.value })} />
          </div>
          <div className="admin-form-group">
            <label htmlFor="saiz-semua-tajuk">Semua skrin: tajuk bahagian (em)</label>
            <input id="saiz-semua-tajuk" className="admin-input" type="number" inputMode="decimal" min={headingEm.min} max={headingEm.max} step={headingEm.step} value={all.heading} onChange={(e) => setAll({ ...all, heading: e.target.value })} />
          </div>
          <button
            type="button"
            className="admin-btn admin-btn-outline"
            disabled={all.body.trim() === "" && all.heading.trim() === ""}
            onClick={() => setBoxes((current) => Object.fromEntries(DEVICE_IDS.map((id) => [id, { body: all.body.trim() === "" ? current[id].body : all.body, heading: all.heading.trim() === "" ? current[id].heading : all.heading }])) as Boxes)}
          >
            Samakan semua
          </button>
        </div>
        <p className="admin-form-hint">Samakan semua mengisi nilai di atas ke setiap skrin di bawah (kotak yang kosong di atas tidak mengubah apa-apa). Belum disimpan sehingga anda tekan Simpan.</p>

        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr><th>Skrin</th><th>Teks karya (px)</th><th>Tajuk bahagian (em)</th></tr>
            </thead>
            <tbody>
              {DEVICES.map((device) => (
                <tr key={device.id} className={device.id === active ? "is-active-row" : undefined}>
                  <td>
                    <strong>{device.label}</strong>
                    <span className="a-meta-line">{device.range}</span>
                  </td>
                  <td>
                    <input aria-label={`Teks karya (px), ${device.label}`} className="admin-input" type="number" inputMode="decimal" min={bodyPx.min} max={bodyPx.max} step={bodyPx.step} value={boxes[device.id].body} placeholder={`${device.defaults.bodyPx} (asal)`} onFocus={() => setActive(device.id)} onChange={(e) => set(device.id, "body", e.target.value)} />
                  </td>
                  <td>
                    <input aria-label={`Tajuk bahagian (em), ${device.label}`} className="admin-input" type="number" inputMode="decimal" min={headingEm.min} max={headingEm.max} step={headingEm.step} value={boxes[device.id].heading} placeholder={`${device.defaults.headingEm} (asal)`} onFocus={() => setActive(device.id)} onChange={(e) => set(device.id, "heading", e.target.value)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="admin-form-hint">Teks antara {bodyPx.min} dan {bodyPx.max} px. Tajuk bahagian antara {headingEm.min} dan {headingEm.max} em, mengikut saiz teks karya (1.3 em ialah 30% lebih besar daripada teks).</p>

        <div className="admin-form-actions">
          <button type="submit" className="admin-btn admin-btn-primary" disabled={busy}>{busy ? "Menyimpan…" : "Simpan"}</button>
          <button
            type="button"
            className="admin-btn"
            disabled={busy}
            onClick={() => {
              const cleared = emptyBoxes();
              setBoxes(cleared);
              save(cleared);
            }}
          >
            Kembali kepada saiz asal
          </button>
        </div>
      </form>
      {note ? <p className="admin-form-hint" role={failed ? "alert" : "status"}>{note}</p> : null}

      <section className="a-rt-section" aria-label="Pratonton skrin">
        <h3>Pratonton</h3>
        <p className="admin-form-hint">Satu skrin pada satu masa. Pilih skrin, atau klik kotak pada baris skrin itu. Pratonton mengikut apa yang ditaip, sebelum disimpan.</p>
        <div className="a-rt-devices" role="group" aria-label="Pilih skrin untuk pratonton">
          {DEVICES.map((device) => (
            <button key={device.id} type="button" className={`admin-filter-btn${device.id === active ? " active" : ""}`} aria-pressed={device.id === active} onClick={() => setActive(device.id)}>
              {device.label}
            </button>
          ))}
        </div>
        <ReaderTypographyPreview device={active} bodyPx={usable(shown.body, bodyPx)} headingEm={usable(shown.heading, headingEm)} />
        <p className="admin-form-hint">{deviceInfo(active).label}: {deviceInfo(active).range}. Skrin sebenar berbeza-beza; ini contoh {deviceInfo(active).screen.w} × {deviceInfo(active).screen.h} px.</p>
      </section>
    </>
  );
}
