/**
 * Jalin subscription cards, ready to print.
 *
 *   node scripts/kad/jana-kad.mjs                  the three fronts (1, 6, 12 months) and one sample back
 *   node scripts/kad/jana-kad.mjs B2610-001        also the back for that batch number (printed on every card of the batch)
 *   node scripts/kad/jana-kad.mjs B2610-001 2026   the year in the copyright line (default: this year)
 *
 * Size: 3.5 x 2 in (252 x 144 pt), the same as the Sains untuk Semua card. Each artwork comes as
 *   - SVG   at trim size, text turned into outlines (a printer needs no fonts),
 *   - PNG   600 dpi with 3 mm bleed all round,
 *   - PDF   the same, at exact page size (trim + 3 mm bleed each side), for the printer.
 * The code itself is NOT printed here: it is on the thermal label under the scratch sticker (see docs/KAJIAN_AKAUN_PEMBACA_DAN_KOD_TEBUS.md 16.1).
 * Fonts: Source Serif 4 (the brand's serif) and Consolas (batch number). Override with SERIF_FONT / MONO_FONT.
 */
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const fontkit = require("fontkit");
const sharp = require("sharp");
const { PDFDocument } = require("pdf-lib");

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const outDir = path.join(root, "docs", "kad-langganan");
const SERIF = process.env.SERIF_FONT || path.join(os.homedir(), "AppData/Local/Microsoft/Windows/Fonts/SourceSerif4-VariableFont_opsz,wght.ttf");
const MONO = process.env.MONO_FONT || "C:/Windows/Fonts/consola.ttf";
const serif = fontkit.openSync(SERIF);
const mono = fontkit.openSync(MONO);

const INK = "#18343c", PAPER = "#fbf8f2", CLAY = "#a76450", BEIGE = "#d8b9a6", MUTED = "#52656a";
const W = 252, H = 144; // points: 3.5 x 2 in
const BLEED = (3 / 25.4) * 72; // 3 mm in points

// ── text as outlines ─────────────────────────────────────────────────────────────────────────────────────────────────
function face(font, size, wght) {
  if (font === serif) return font.getVariation({ wght, opsz: Math.max(8, Math.min(60, size)) });
  return font;
}
function measure(font, text, size, { wght = 400, ls = 0 } = {}) {
  const f = face(font, size, wght);
  const run = f.layout(text);
  const s = size / f.unitsPerEm;
  return run.glyphs.reduce((w, _g, i) => w + run.positions[i].xAdvance * s, 0) + ls * Math.max(0, run.glyphs.length - 1);
}
/** x is the left edge, the right edge or the centre, by anchor. Returns an SVG <g> of outlined glyphs. */
function text(font, str, { x, y, size, fill, wght = 400, anchor = "start", ls = 0, opacity = 1 }) {
  const f = face(font, size, wght);
  const run = f.layout(str);
  const s = size / f.unitsPerEm;
  const total = measure(font, str, size, { wght, ls });
  let cx = anchor === "end" ? x - total : anchor === "middle" ? x - total / 2 : x;
  let d = "";
  run.glyphs.forEach((g, i) => {
    const p = run.positions[i];
    const path = g.path.toSVG();
    if (path) d += `<path transform="translate(${(cx + p.xOffset * s).toFixed(2)} ${(y - p.yOffset * s).toFixed(2)}) scale(${s.toFixed(5)} ${(-s).toFixed(5)})" d="${path}"/>`;
    cx += p.xAdvance * s + ls;
  });
  return `<g fill="${fill}"${opacity < 1 ? ` fill-opacity="${opacity}"` : ""}>${d}</g>`;
}
/** Greedy line wrap by measured width. */
function wrap(font, str, size, maxWidth, opts = {}) {
  const lines = [];
  let line = "";
  for (const word of str.split(" ")) {
    const trial = line ? `${line} ${word}` : word;
    if (measure(font, trial, size, opts) <= maxWidth || !line) line = trial;
    else { lines.push(line); line = word; }
  }
  if (line) lines.push(line);
  return lines;
}
function block(font, str, { x, y, size, lead, maxWidth, fill, wght = 400, opacity = 1 }) {
  const lines = wrap(font, str, size, maxWidth, { wght });
  return { svg: lines.map((l, i) => text(font, l, { x, y: y + i * lead, size, fill, wght, opacity })).join(""), height: lines.length * lead, lines: lines.length };
}

// ── brand assets (inlined, so the file stands alone) ─────────────────────────────────────────────────────────────────
const inner = (file) => fs.readFileSync(path.join(root, "public", "brand", file), "utf8").replace(/^[\s\S]*?<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");
const nest = (file, viewBox, x, y, w, h, uid) =>
  `<svg x="${x}" y="${y}" width="${w}" height="${h}" viewBox="${viewBox}" preserveAspectRatio="xMidYMid meet">${inner(file).replace(/id="(Gradient\d+)"/g, `id="$1-${uid}"`).replace(/url\(#(Gradient\d+)\)/g, `url(#$1-${uid})`)}</svg>`;

/** The bidai (woven blind) motif of the brand, tiled over the whole artwork including the bleed. */
const bidai = (id, stroke, opacity) =>
  `<pattern id="${id}" width="48" height="24" patternUnits="userSpaceOnUse" patternTransform="scale(0.9)"><g fill="none" stroke="${stroke}" stroke-opacity="${opacity}" stroke-width="1.5" stroke-linecap="round">` +
  `<path d="M-48 6H-8"/><path d="M-4 1V11"/><path d="M0 6H40"/><path d="M44 1V11"/><path d="M48 6H88"/><path d="M92 1V11"/><path d="M-36 18H4"/><path d="M8 13V23"/><path d="M12 18H52"/><path d="M56 13V23"/><path d="M60 18H100"/><path d="M104 13V23"/></g></pattern>`;

const wrapSvg = (body, defs = "") =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="3.5in" height="2in" viewBox="0 0 ${W} ${H}">` + (defs ? `<defs>${defs}</defs>` : "") + body + `</svg>`;

// ── layout numbers ────────────────────────────────────────────────────────────────────────────────────────────────────
// Measured from the Sains untuk Semua card (Kad kod langganan.zip), in points on the same 252 x 144 card, so Jalin keeps its sizes and margins:
//   front: title 7 pt at x 14.6, length 14.6 pt bold at the right margin (238), logo block centred, rule at y 88, tagline 6.5 pt, address 7 pt at y 128
//   back : left column x 15.6 to 86 (text 4.8 pt), divider x 89.5, help text x 105 to 224 (5 pt), white panel x 96.5 to 238 and y 44.6 to 129 (radius 6.3)
// Only the type is Jalin's own (Source Serif 4 where SUS uses a sans); the sizes are SUS's.

// ── front ────────────────────────────────────────────────────────────────────────────────────────────────────────────
const ACCENT = { 1: BEIGE, 6: CLAY, 12: INK };
function front(months) {
  const label = `${months} BULAN`;
  const bleedRect = `x="${-BLEED}" y="${-BLEED}" width="${W + 2 * BLEED}" height="${H + 2 * BLEED}"`;
  let b = `<rect ${bleedRect} fill="${PAPER}"/><rect ${bleedRect} fill="url(#bidai)"/>`;
  b += text(serif, "Kad langganan", { x: 14.6, y: 20.8, size: 7.2, fill: INK, wght: 700 });
  b += `<rect x="14.6" y="24.4" width="16" height="1.6" rx="0.8" fill="${ACCENT[months]}"/>`;
  b += text(serif, label, { x: 238, y: 25.7, size: 15.5, fill: INK, wght: 700, anchor: "end" });
  const w2 = measure(serif, "1 pengguna", 5.8, { wght: 400 });
  b += text(serif, "1 pengguna", { x: 238, y: 36, size: 5.8, fill: INK, anchor: "end" });
  b += `<rect x="${238 - w2 - 4.2}" y="31.4" width="0.7" height="6" fill="${INK}"/>`;
  b += text(serif, "akses", { x: 238 - w2 - 6.4, y: 36, size: 5.8, fill: INK, wght: 700, anchor: "end" });
  // logo block centred as on the SUS card (emblem, Jalin, oleh Adjung): the Jalin mark is upright, so it is tall where SUS's is wide
  b += nest("jalin-logo-primary.svg", "470 215 1110 1110", 128 - 30, 36.5, 60, 60, "f");
  b += `<rect x="73" y="97.6" width="106" height="0.6" fill="${MUTED}"/>`;
  b += text(serif, "Cerpen, novela dan cerita bersiri berilustrasi", { x: 126, y: 106.2, size: 6.2, fill: INK, anchor: "middle" });
  b += text(serif, "jalin.adjung.com", { x: 126, y: 129.4, size: 7, fill: CLAY, wght: 600, anchor: "middle", ls: 0.9 });
  return wrapSvg(b, bidai("bidai", INK, 0.07));
}

// ── back ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
function back({ batch, year }) {
  const bleedRect = `x="${-BLEED}" y="${-BLEED}" width="${W + 2 * BLEED}" height="${H + 2 * BLEED}"`;
  let b = `<rect ${bleedRect} fill="${INK}"/><rect ${bleedRect} fill="url(#bidai)"/>`;
  const L = 15.6, LW = 70.5;
  b += text(serif, "Kaedah penebusan", { x: L, y: 17, size: 6.8, fill: PAPER, wght: 700 });
  let y = 25.8;
  const steps = ["Log masuk ke akaun Jalin.", "Pergi ke jalin.adjung.com/tebus.", "Masukkan kod dan nombor batch.", "Langganan aktif sebaik kod berjaya ditebus."];
  steps.forEach((s, i) => {
    b += text(serif, `${i + 1}.`, { x: L - 1, y, size: 4.8, fill: PAPER });
    const t = block(serif, s, { x: L + 4.6, y, size: 4.8, lead: 5.9, maxWidth: LW - 4.6, fill: PAPER });
    b += t.svg; y += t.height + 1;
  });
  y += 3;
  b += `<rect x="${L}" y="${y}" width="${LW}" height="0.5" fill="${PAPER}" fill-opacity="0.45"/>`;
  y += 10;
  b += text(serif, "Maklumat penting", { x: L, y, size: 6.8, fill: PAPER, wght: 700 });
  y += 8.4;
  ["Kod hanya boleh ditebus sekali.", "Kikis pelekat hanya apabila mahu menebus.", "Simpan kad ini di tempat selamat."].forEach((s) => {
    b += `<circle cx="${L + 1.4}" cy="${y - 1.5}" r="0.7" fill="${PAPER}"/>`;
    const t = block(serif, s, { x: L + 4.4, y, size: 4.8, lead: 5.9, maxWidth: LW - 4.4, fill: PAPER });
    b += t.svg; y += t.height + 1;
  });
  console.log("    belakang: butir terakhir berakhir pada y =", y.toFixed(1), "(had 134)");
  b += `<rect x="89.5" y="7.6" width="0.8" height="128.4" fill="${PAPER}" fill-opacity="0.4"/>`;
  // help text, then the panel
  b += block(serif, "Jika terdapat sebarang masalah berkaitan langganan dan penebusan, sila hubungi editorial@adjung.com.", { x: 105, y: 20.4, size: 5, lead: 6.5, maxWidth: 119, fill: PAPER }).svg;
  const PX = 96.5, PY = 44.6, PW = 141.5, PH = 84.4;
  b += `<rect x="${PX}" y="${PY}" width="${PW}" height="${PH}" rx="6.3" fill="#ffffff"/>`;
  b += text(mono, "NO. BATCH:", { x: 105.8, y: 57, size: 6, fill: INK });
  b += text(mono, batch || "B0000-000", { x: 230, y: 57, size: 6.4, fill: INK, anchor: "end" });
  b += text(mono, "KOD:", { x: 105.8, y: 74.4, size: 6, fill: INK });
  // the scratch sticker (38 x 16 mm = 108 x 45.4 pt) goes over the thermal label with the code; drawn as the grey area it will be
  const SW = (38 / 25.4) * 72, SH = (16 / 25.4) * 72;
  const sx = PX + (PW - SW) / 2, sy = 78.2;
  b += `<rect x="${sx.toFixed(2)}" y="${sy}" width="${SW.toFixed(2)}" height="${SH.toFixed(2)}" rx="4.5" fill="#8d9a98"/>`;
  b += text(serif, "Kikis untuk lihat kod", { x: sx + SW / 2, y: sy + SH / 2 + 1.8, size: 5.4, fill: "#ffffff", anchor: "middle", opacity: 0.9 });
  // vertical copyright, as on the Sains untuk Semua card
  const notice = `© ${year} Adjung Press Platform (202603277981 (PG0594995-P))`;
  b += `<g transform="translate(247 136) rotate(-90)">${text(serif, notice, { x: 0, y: 0, size: 4, fill: PAPER, opacity: 0.85 })}</g>`;
  return wrapSvg(b, bidai("bidai", "#f3e9df", 0.1));
}

// ── output ───────────────────────────────────────────────────────────────────────────────────────────────────────────
async function emit(name, svg) {
  fs.mkdirSync(outDir, { recursive: true });
  // The SVG file is the trim size (a designer opens it); the bleed version for the printer is rendered from a wider viewBox.
  fs.writeFileSync(path.join(outDir, `${name}.svg`), svg);
  const bleedSvg = svg
    .replace(/width="3.5in" height="2in" viewBox="0 0 252 144"/, `width="${W + 2 * BLEED}pt" height="${H + 2 * BLEED}pt" viewBox="${-BLEED} ${-BLEED} ${W + 2 * BLEED} ${H + 2 * BLEED}"`);
  const pxW = Math.round(((W + 2 * BLEED) / 72) * 600), pxH = Math.round(((H + 2 * BLEED) / 72) * 600);
  const png = await sharp(Buffer.from(bleedSvg), { density: 600 * 72 / 72 }).resize(pxW, pxH).png({ compressionLevel: 9 }).withMetadata({ density: 600 }).toBuffer();
  fs.writeFileSync(path.join(outDir, `${name}-cetak-600dpi.png`), png);
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([W + 2 * BLEED, H + 2 * BLEED]);
  const img = await pdf.embedPng(png);
  page.drawImage(img, { x: 0, y: 0, width: W + 2 * BLEED, height: H + 2 * BLEED });
  pdf.setTitle(name);
  pdf.setAuthor("Adjung Press Platform");
  fs.writeFileSync(path.join(outDir, `${name}-cetak.pdf`), await pdf.save());
  console.log(`  ${name}: ${pxW}x${pxH}px, svg ${(svg.length / 1024).toFixed(0)} KB`);
}

const batch = process.argv[2];
const year = process.argv[3] || String(new Date().getFullYear());
console.log("Menjana kad Jalin ke docs/kad-langganan ...");
for (const months of [1, 6, 12]) await emit(`jalin-kad-hadapan-${months}-bulan`, front(months));
await emit(batch ? `jalin-kad-belakang-${batch}` : "jalin-kad-belakang-contoh", back({ batch: batch || "B2610-001", year }));
