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

// ── front ────────────────────────────────────────────────────────────────────────────────────────────────────────────
const ACCENT = { 1: BEIGE, 6: CLAY, 12: INK };
function front(months) {
  const label = `${months} BULAN`;
  const bleedRect = `x="${-BLEED}" y="${-BLEED}" width="${W + 2 * BLEED}" height="${H + 2 * BLEED}"`;
  let b = `<rect ${bleedRect} fill="${PAPER}"/><rect ${bleedRect} fill="url(#bidai)"/>`;
  b += text(serif, "Kad langganan", { x: 14, y: 21, size: 10.5, fill: INK, wght: 600 });
  b += `<rect x="14" y="26" width="22" height="2.2" rx="1.1" fill="${ACCENT[months]}"/>`;
  b += text(serif, label, { x: 238, y: 26, size: 21, fill: INK, wght: 700, anchor: "end" });
  const right = 238;
  const w2 = measure(serif, "1 pengguna", 7.4, { wght: 400 });
  b += text(serif, "1 pengguna", { x: right, y: 38, size: 7.4, fill: INK, anchor: "end" });
  b += `<rect x="${right - w2 - 6}" y="31.6" width="0.9" height="8" fill="${INK}"/>`;
  b += text(serif, "akses", { x: right - w2 - 10, y: 38, size: 7.4, fill: INK, wght: 700, anchor: "end" });
  // logo (emblem + Jalin + oleh Adjung) on the left, the line about the library on the right
  b += nest("jalin-logo-primary.svg", "470 215 1110 1110", 18, 46, 84, 84, "f");
  b += `<rect x="116" y="60" width="122" height="0.8" fill="${CLAY}"/>`;
  const tag = block(serif, "Cerpen, novela dan cerita bersiri berilustrasi", { x: 116, y: 76, size: 11, lead: 14, maxWidth: 122, fill: INK, wght: 500 });
  b += tag.svg;
  b += text(serif, "jalin.adjung.com", { x: 116, y: 76 + tag.height + 8, size: 8.2, fill: CLAY, wght: 600, ls: 0.8 });
  b += text(serif, "Satu kad, satu pengguna. Tebus di jalin.adjung.com/tebus.", { x: 14, y: 136, size: 5.6, fill: MUTED });
  return wrapSvg(b, bidai("bidai", INK, 0.07));
}

// ── back ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
function back({ batch, year }) {
  const bleedRect = `x="${-BLEED}" y="${-BLEED}" width="${W + 2 * BLEED}" height="${H + 2 * BLEED}"`;
  let b = `<rect ${bleedRect} fill="${INK}"/><rect ${bleedRect} fill="url(#bidai)"/>`;
  const L = 12, LW = 96;
  b += text(serif, "Kaedah penebusan", { x: L, y: 19, size: 8.4, fill: PAPER, wght: 700 });
  let y = 28.5;
  const steps = ["Log masuk ke akaun Jalin.", "Pergi ke jalin.adjung.com/tebus.", "Masukkan kod dan nombor batch.", "Langganan aktif sebaik kod berjaya ditebus."];
  steps.forEach((s, i) => {
    b += text(serif, `${i + 1}.`, { x: L, y, size: 5.5, fill: PAPER });
    const t = block(serif, s, { x: L + 8, y, size: 5.5, lead: 6.7, maxWidth: LW - 8, fill: PAPER });
    b += t.svg; y += t.height + 1;
  });
  y += 2.5;
  b += `<rect x="${L}" y="${y - 3}" width="${LW}" height="0.5" fill="${PAPER}" fill-opacity="0.4"/>`;
  y += 7.5;
  b += text(serif, "Maklumat penting", { x: L, y, size: 7.6, fill: PAPER, wght: 700 });
  y += 8.5;
  ["Kod hanya boleh ditebus sekali.", "Kikis pelekat hanya apabila mahu menebus.", "Simpan kad ini di tempat selamat."].forEach((s) => {
    b += `<circle cx="${L + 2}" cy="${y - 1.8}" r="0.8" fill="${PAPER}"/>`;
    const t = block(serif, s, { x: L + 7, y, size: 5.5, lead: 6.7, maxWidth: LW - 7, fill: PAPER });
    b += t.svg; y += t.height + 1;
  });
  console.log("    belakang: butir terakhir berakhir pada y =", y.toFixed(1), "(had 134)");
  b += `<rect x="114" y="12" width="0.8" height="120" fill="${PAPER}" fill-opacity="0.35"/>`;
  // right column: a help line, then the panel that carries the batch number and the (stickered) code
  const R = 122, RW = 116;
  const help = block(serif, "Masalah langganan atau penebusan? Hubungi editorial@adjung.com.", { x: R, y: 19, size: 5.5, lead: 6.8, maxWidth: RW - 26, fill: PAPER });
  b += help.svg;
  const PX = R, PY = 42, PW = RW, PH = 90;
  b += `<rect x="${PX}" y="${PY}" width="${PW}" height="${PH}" rx="7" fill="#ffffff"/>`;
  b += text(mono, "NO. BATCH:", { x: PX + 7, y: PY + 13, size: 6.2, fill: INK });
  b += text(mono, batch || "B0000-000", { x: PX + PW - 7, y: PY + 13, size: 7.2, fill: INK, anchor: "end" });
  b += `<rect x="${PX + 7}" y="${PY + 18}" width="${PW - 14}" height="0.5" fill="${INK}" fill-opacity="0.25"/>`;
  b += text(mono, "KOD:", { x: PX + 7, y: PY + 29, size: 6.2, fill: INK });
  // the scratch sticker (38 x 16 mm = 108 x 45 pt) sits over the thermal label with the code; drawn as the grey area it will be
  const SW = (38 / 25.4) * 72, SH = (16 / 25.4) * 72;
  const sx = PX + (PW - SW) / 2, sy = PY + 35;
  b += `<rect x="${sx.toFixed(2)}" y="${sy}" width="${SW.toFixed(2)}" height="${SH.toFixed(2)}" rx="5" fill="#8d9a98"/>`;
  b += text(serif, "Kikis untuk lihat kod", { x: sx + SW / 2, y: sy + SH / 2 + 2, size: 6, fill: "#ffffff", anchor: "middle", opacity: 0.9 });
  // vertical copyright, as on the Sains untuk Semua card
  const notice = `© ${year} Adjung Press Platform (202603277981 (PG0594995-P))`;
  b += `<g transform="translate(246.5 ${H - 10}) rotate(-90)">${text(serif, notice, { x: 0, y: 0, size: 4.6, fill: PAPER, opacity: 0.85 })}</g>`;
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
