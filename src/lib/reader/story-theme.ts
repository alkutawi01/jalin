/**
 * A colour for one work. The editor picks one base colour (or lets it be read from the hero picture); this turns it into a full palette for
 * each of the reader's three site themes, so a reader who chose Gelap still gets a dark page, just tinted with this work's colour.
 *
 * Readability is guaranteed here, not hoped for: every text colour is nudged in lightness until it reaches its contrast target against
 * the page colour it sits on (WCAG ratios: 7:1 for body text, 4.5:1 for secondary text and for accent text).
 */
export type StoryThemeName = "cerah" | "sepia" | "gelap";
export type StoryThemeSetting = { mode: "auto" | "manual"; color: string };

export interface StoryPalette {
  bg: string;
  surface: string;
  ink: string;
  inkSoft: string;
  line: string;
  accent: string;
  accentText: string;
}

const HEX = /^#[0-9a-f]{6}$/i;

export function normaliseHex(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const v = value.trim().toLowerCase();
  const short = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/.exec(v);
  if (short) return `#${short[1]}${short[1]}${short[2]}${short[2]}${short[3]}${short[3]}`;
  return HEX.test(v) ? v : null;
}

/** What is saved on the work (works.metadata.theme). Anything that is not a valid setting reads as "no colour". */
export function parseThemeSetting(value: unknown): StoryThemeSetting | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as { mode?: unknown; color?: unknown };
  const color = normaliseHex(raw.color);
  if (!color) return null;
  if (raw.mode !== "auto" && raw.mode !== "manual") return null;
  return { mode: raw.mode, color };
}

export function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbToHex(r: number, g: number, b: number): string {
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}

/** h in degrees 0-360, s and l in 0-1. */
export function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return [0, 0, l];
  const s = d / (1 - Math.abs(2 * l - 1));
  let h: number;
  if (max === rn) h = ((gn - bn) / d) % 6;
  else if (max === gn) h = (bn - rn) / d + 2;
  else h = (rn - gn) / d + 4;
  return [(h * 60 + 360) % 360, s, l];
}

export function hslToHex(h: number, s: number, l: number): string {
  const hh = ((h % 360) + 360) % 360;
  const ss = Math.max(0, Math.min(1, s));
  const ll = Math.max(0, Math.min(1, l));
  const c = (1 - Math.abs(2 * ll - 1)) * ss;
  const x = c * (1 - Math.abs(((hh / 60) % 2) - 1));
  const m = ll - c / 2;
  const [r, g, b] = hh < 60 ? [c, x, 0] : hh < 120 ? [x, c, 0] : hh < 180 ? [0, c, x] : hh < 240 ? [0, x, c] : hh < 300 ? [x, 0, c] : [c, 0, x];
  return rgbToHex((r + m) * 255, (g + m) * 255, (b + m) * 255);
}

export function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string): number {
  const la = luminance(a), lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** Move lightness away from the background (darker on a light page, lighter on a dark one) until the ratio is reached. */
function readableOn(bg: string, h: number, s: number, startL: number, target: number): string {
  const lightPage = luminance(bg) > 0.4;
  let l = startL;
  let hex = hslToHex(h, s, l);
  for (let i = 0; i < 100 && contrastRatio(hex, bg) < target; i++) {
    l = lightPage ? l - 0.01 : l + 0.01;
    hex = hslToHex(h, s, Math.max(0, Math.min(1, l)));
  }
  if (contrastRatio(hex, bg) < target) hex = lightPage ? "#000000" : "#ffffff";
  return hex;
}

/** The site's Sepia paper: every work's Sepia page starts from this and only leans toward the work's colour. */
const SEPIA_PAPER = "#f0e3ca";

function mixHex(a: string, b: string, amountOfB: number): string {
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);
  return rgbToHex(ar + (br - ar) * amountOfB, ag + (bg - ag) * amountOfB, ab + (bb - ab) * amountOfB);
}

export function derivePalettes(baseHex: string): Record<StoryThemeName, StoryPalette> {
  const base = normaliseHex(baseHex) ?? "#a76450";
  const [r, g, b] = hexToRgb(base);
  const [h, sRaw] = rgbToHsl(r, g, b);
  // A page tinted this strongly would tire the eyes; keep a calm chroma while the hue stays recognisably the work's.
  const s = Math.max(0.18, Math.min(0.7, sRaw));

  // Cerah: a pale tint of the colour.
  const cBg = hslToHex(h, Math.min(0.75, s * 0.85), 0.925);
  const cerah: StoryPalette = {
    bg: cBg,
    surface: hslToHex(h, s * 0.6, 0.972),
    ink: readableOn(cBg, h, Math.min(0.45, s * 0.6), 0.16, 9),
    inkSoft: readableOn(cBg, h, Math.min(0.3, s * 0.4), 0.34, 5),
    line: hslToHex(h, s * 0.45, 0.8),
    accent: readableOn(cBg, h, s, 0.38, 3.2),
    accentText: readableOn(cBg, h, s, 0.34, 5)
  };

  // Sepia: always warm paper (the site's own Sepia), with only a breath of the work's colour mixed in. Mixing the colours (not the hues) keeps a
  // blue work from turning the page green on the way to brown.
  const sBg = mixHex(SEPIA_PAPER, hslToHex(h, s * 0.6, 0.84), 0.3);
  const sepia: StoryPalette = {
    bg: sBg,
    surface: mixHex("#f6eddc", hslToHex(h, s * 0.5, 0.92), 0.25),
    ink: readableOn(sBg, h, 0.25, 0.17, 9),
    inkSoft: readableOn(sBg, h, 0.2, 0.32, 5),
    line: mixHex("#d6c3a0", hslToHex(h, s * 0.4, 0.7), 0.3),
    accent: readableOn(sBg, h, s, 0.36, 3.2),
    accentText: readableOn(sBg, h, s, 0.32, 5)
  };

  // Gelap: a deep tint of the colour, light text.
  const gBg = hslToHex(h, Math.min(0.4, s * 0.55), 0.115);
  const gelap: StoryPalette = {
    bg: gBg,
    surface: hslToHex(h, Math.min(0.38, s * 0.5), 0.16),
    ink: readableOn(gBg, h, Math.min(0.25, s * 0.3), 0.94, 10),
    inkSoft: readableOn(gBg, h, Math.min(0.2, s * 0.3), 0.78, 6),
    line: hslToHex(h, Math.min(0.3, s * 0.4), 0.28),
    accent: readableOn(gBg, h, s, 0.68, 4.5),
    accentText: readableOn(gBg, h, s, 0.74, 6)
  };

  return { cerah, sepia, gelap };
}

const VAR_KEYS: [keyof StoryPalette, string][] = [
  ["bg", "bg"], ["surface", "surface"], ["ink", "ink"], ["inkSoft", "ink-soft"], ["line", "line"], ["accent", "accent"], ["accentText", "accent-text"]
];

/** Inline custom properties for the page wrapper: all three themes at once, the stylesheet picks the reader's. */
export function storyThemeVars(setting: StoryThemeSetting | null): Record<string, string> | null {
  if (!setting) return null;
  const palettes = derivePalettes(setting.color);
  const vars: Record<string, string> = {};
  for (const name of ["cerah", "sepia", "gelap"] as const) {
    for (const [key, css] of VAR_KEYS) vars[`--st-${name}-${css}`] = palettes[name][key];
  }
  return vars;
}
