"use client";

import { useRef } from "react";
import { cropStyle } from "../../lib/reader/crop";

/** The frame shapes Jalin shows an image in. One crop (focus + zoom) serves every one of them. */
const FRAMES: Array<{ label: string; ratio: string }> = [
  { label: "Kepala karya 16:9", ratio: "16 / 9" },
  { label: "Kad 16:10", ratio: "16 / 10" },
  { label: "Gambar dalam teks 4:3", ratio: "4 / 3" },
  { label: "Laman utama 4:3.4", ratio: "4 / 3.4" },
  { label: "Siri 3:2", ratio: "3 / 2" }
];

export interface FocusValue {
  x: number;
  y: number;
  zoom: number;
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/**
 * Choose the part of an image that matters. Click or drag on the image, or use the sliders (keyboard friendly).
 * The original file is never changed; this only decides how it is shown, and every frame shape is previewed.
 */
export default function ImageFocusPicker({
  src,
  value,
  onChange
}: {
  src: string;
  value: FocusValue;
  onChange: (next: FocusValue) => void;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  function setFromPointer(event: { clientX: number; clientY: number }) {
    const box = boxRef.current?.getBoundingClientRect();
    if (!box || box.width === 0 || box.height === 0) return;
    onChange({
      ...value,
      x: Math.round(clamp(((event.clientX - box.left) / box.width) * 100, 0, 100)),
      y: Math.round(clamp(((event.clientY - box.top) / box.height) * 100, 0, 100))
    });
  }

  return (
    <div className="a-focus">
      <p className="admin-form-hint">
        Klik atau seret pada gambar untuk memilih bahagian yang paling penting. Gambar asal tidak diubah; pilihan ini hanya menentukan bahagian yang dipaparkan dalam setiap bingkai.
      </p>
      <div
        ref={boxRef}
        className="a-focus-box"
        onPointerDown={(event) => { dragging.current = true; (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId); setFromPointer(event); }}
        onPointerMove={(event) => { if (dragging.current) setFromPointer(event); }}
        onPointerUp={() => { dragging.current = false; }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="" draggable={false} />
        <span className="a-focus-dot" style={{ left: `${value.x}%`, top: `${value.y}%` }} aria-hidden="true" />
      </div>

      <div className="a-focus-controls">
        <label>Mendatar ({value.x}%)<input type="range" min={0} max={100} value={value.x} onChange={(e) => onChange({ ...value, x: Number(e.target.value) })} /></label>
        <label>Menegak ({value.y}%)<input type="range" min={0} max={100} value={value.y} onChange={(e) => onChange({ ...value, y: Number(e.target.value) })} /></label>
        <label>Zum ({(value.zoom / 100).toFixed(1)}×)<input type="range" min={100} max={300} step={5} value={value.zoom} onChange={(e) => onChange({ ...value, zoom: Number(e.target.value) })} /></label>
        <button type="button" className="admin-btn admin-btn-sm admin-btn-outline" onClick={() => onChange({ x: 50, y: 50, zoom: 100 })}>Tetapkan semula (tengah)</button>
      </div>

      <div className="a-focus-frames" aria-label="Pratonton bingkai">
        {FRAMES.map((frame) => (
          <figure key={frame.label}>
            <div className="a-focus-frame" style={{ aspectRatio: frame.ratio }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" style={cropStyle(value)} />
            </div>
            <figcaption>{frame.label}</figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}
