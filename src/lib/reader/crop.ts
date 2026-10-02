import type { CSSProperties } from "react";
import type { ImageCrop } from "../content/types";

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

const pick = (...values: unknown[]): number | undefined => {
  for (const value of values) {
    if (value === null || value === undefined || value === "") continue;
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
};

/** Builds a crop from the database columns, or undefined when nothing was set (the image stays centred). */
export function cropFromRow(row: { focus_x?: unknown; focus_y?: unknown; zoom?: unknown; focusX?: unknown; focusY?: unknown }): ImageCrop | undefined {
  const x = pick(row.focus_x, row.focusX);
  const y = pick(row.focus_y, row.focusY);
  const zoom = pick(row.zoom);
  if (x === undefined && y === undefined && zoom === undefined) return undefined;
  return { x: clamp(x ?? 50, 0, 100), y: clamp(y ?? 50, 0, 100), zoom: clamp(zoom ?? 100, 100, 300) };
}

/**
 * Style for an <img> that fills a frame (object-fit: cover): the point of interest stays in view and the
 * zoom enlarges around that same point. The same style serves every frame shape, so one crop per image is enough.
 */
export function cropStyle(crop?: ImageCrop): CSSProperties | undefined {
  if (!crop) return undefined;
  const style: CSSProperties = { objectPosition: `${crop.x}% ${crop.y}%` };
  if (crop.zoom > 100) {
    style.transform = `scale(${crop.zoom / 100})`;
    style.transformOrigin = `${crop.x}% ${crop.y}%`;
  }
  return style;
}
