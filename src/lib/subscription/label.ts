/**
 * The sticker that carries a card code (study sections 5.8, 5.9, 16.1, 16.2): the code is printed on a label by a label printer, the label
 * is stuck on the card, and a scratch-off sticker goes over the code. Nothing about the sizes is final yet, so every size is a setting
 * and the layout is worked out from them.
 *
 * Pure functions only. The PDF is written by hand: one page per label, the page the size of the label, in Courier (a standard font that
 * every viewer and printer driver has, and whose letters are exactly 0.6 of their height wide, so the width of a line is exact).
 */

export const MM_PER_PT = 25.4 / 72;
const PT_PER_MM = 72 / 25.4;

export type LabelSettings = {
  /** The label, in millimetres, as it comes out of the printer: width across the paper, height along it. */
  widthMm: number;
  heightMm: number;
  /** The scratch-off sticker (or the strip of it that covers the code). */
  scratchWidthMm: number;
  scratchHeightMm: number;
  /** Distance of the scratch area from the top of the label; the area is centred across. */
  scratchTopMm: number;
  /** Clear space kept between the code and the edge of the scratch area, so a sticker put on a little crooked still covers all of it. */
  scratchPaddingMm: number;
  /** How the groups of four are separated in the code. */
  separator: "-" | " " | "";
};

/** The sizes known so far (Izzat, 9 Oct 2026): code sticker 3 x 5 cm, scratch strip 0.8 x 4 cm. Not final. */
export const DEFAULT_LABEL: LabelSettings = {
  widthMm: 50,
  heightMm: 30,
  scratchWidthMm: 40,
  scratchHeightMm: 8,
  scratchTopMm: 11,
  scratchPaddingMm: 2,
  separator: "-",
};

export type LabelProblem = { level: "error" | "warning"; text: string };

export function validateSettings(s: LabelSettings): LabelProblem[] {
  const problems: LabelProblem[] = [];
  const num = (v: number, min: number, max: number) => Number.isFinite(v) && v >= min && v <= max;
  if (!num(s.widthMm, 20, 150) || !num(s.heightMm, 10, 150)) problems.push({ level: "error", text: "Saiz label mesti antara 20 x 10 mm dan 150 x 150 mm." });
  if (!num(s.scratchWidthMm, 5, 150) || !num(s.scratchHeightMm, 3, 100)) problems.push({ level: "error", text: "Saiz pelekat gores tidak munasabah." });
  if (!num(s.scratchTopMm, 0, 150) || !num(s.scratchPaddingMm, 0, 20)) problems.push({ level: "error", text: "Kedudukan atau ruang kosong pelekat gores tidak munasabah." });
  if (problems.length) return problems;
  if (s.scratchWidthMm > s.widthMm) problems.push({ level: "error", text: "Pelekat gores lebih lebar daripada label." });
  if (s.scratchTopMm + s.scratchHeightMm > s.heightMm) problems.push({ level: "error", text: "Pelekat gores terkeluar daripada label." });
  if (s.scratchPaddingMm * 2 >= s.scratchWidthMm || s.scratchPaddingMm * 2 >= s.scratchHeightMm) problems.push({ level: "error", text: "Ruang kosong terlalu besar bagi pelekat gores." });
  return problems;
}

/** The code as printed: groups of four with the check character at the end, e.g. XXXX-XXXX-XXXX-XXXX-X. */
export function codeText(canonical: string, separator: LabelSettings["separator"]): string {
  const groups = canonical.slice(0, 16).match(/.{1,4}/g) ?? [];
  return groups.join(separator) + separator + canonical.slice(16);
}

export type LabelLayout = {
  problems: LabelProblem[];
  /** The text under the scratch area, as one line. */
  code: string;
  /** Largest size (points) at which the line fits inside the scratch area less its padding, in Courier. */
  codeFontPt: number;
  /** Width the line takes at that size, in mm. */
  codeWidthMm: number;
  /** Height of a capital at that size, in mm (what the printer has to draw clearly). */
  codeCapHeightMm: number;
  /** Dots across one letter on a 203 dpi printer. */
  dotsPerLetter203: number;
};

const COURIER_WIDTH = 0.6;
const COURIER_CAP = 0.57;
/** Below this size the code is hard to read on a thermal label under scratch coating. */
export const MIN_READABLE_PT = 8;

export function computeLayout(settings: LabelSettings, sampleCanonical = "0".repeat(17)): LabelLayout {
  const problems = validateSettings(settings);
  const code = codeText(sampleCanonical, settings.separator);
  if (problems.some((p) => p.level === "error")) return { problems, code, codeFontPt: 0, codeWidthMm: 0, codeCapHeightMm: 0, dotsPerLetter203: 0 };
  const usableW = settings.scratchWidthMm - settings.scratchPaddingMm * 2;
  const usableH = settings.scratchHeightMm - settings.scratchPaddingMm * 2;
  const byWidthMm = usableW / (code.length * COURIER_WIDTH);
  const byHeightMm = usableH / 1.0;
  const fontMm = Math.min(byWidthMm, byHeightMm);
  const fontPt = Math.floor(fontMm * PT_PER_MM * 10) / 10;
  const realMm = fontPt * MM_PER_PT;
  const letterMm = realMm * COURIER_WIDTH;
  if (fontPt < MIN_READABLE_PT) {
    problems.push({
      level: "warning",
      text: `Kod hanya muat pada ${fontPt.toFixed(1)} pt (${code.length} aksara dalam ruang ${usableW.toFixed(0)} x ${usableH.toFixed(0)} mm). Di bawah ${MIN_READABLE_PT} pt kod sukar dibaca pada label haba. Lebarkan pelekat gores, kurangkan ruang kosong, atau buang sengkang.`,
    });
  }
  return { problems, code, codeFontPt: fontPt, codeWidthMm: code.length * letterMm, codeCapHeightMm: realMm * COURIER_CAP, dotsPerLetter203: Math.round((letterMm / 25.4) * 203) };
}

// ------------------------------------------------------------------ the PDF

export type LabelContent = {
  /** The code, canonical (17 characters). */
  canonical: string;
  /** Printed outside the scratch area, so a card can be found without scratching it. */
  batchNumber: string;
  serial: string;
  /** "6 bulan" and so on. */
  planText: string;
};

export type PdfOptions = {
  /** A thin outline of the label and the scratch area, for lining a test print up with the sticker. Never used on real labels. */
  guides?: boolean;
};

const esc = (s: string) => s.replace(/[\\()]/g, (m) => `\\${m}`);
const f = (n: number) => (Math.round(n * 1000) / 1000).toString();

function ascii(text: string): string {
  // The labels use only plain letters, digits and hyphens; anything else would print as a wrong glyph, so refuse it here.
  if (/[^\x20-\x7e]/.test(text)) throw new Error("Label text may only use plain ASCII characters.");
  return text;
}

/** One page's drawing commands. Coordinates are in mm from the top left; PDF wants points from the bottom left. */
function pageContent(settings: LabelSettings, layout: LabelLayout, content: LabelContent, options: PdfOptions): string {
  const W = settings.widthMm;
  const H = settings.heightMm;
  const pt = (mm: number) => mm * PT_PER_MM;
  const y = (topMm: number) => pt(H - topMm);
  const ops: string[] = [];
  const text = (font: "F1" | "F2", size: number, centreMm: number, baselineTopMm: number, value: string) => {
    const width = value.length * size * COURIER_WIDTH;
    ops.push(`BT /${font} ${f(size)} Tf ${f(pt(centreMm) - width / 2)} ${f(y(baselineTopMm))} Td (${esc(ascii(value))}) Tj ET`);
  };

  if (options.guides) {
    ops.push("0.4 w 0.6 G");
    ops.push(`${f(pt(0.2))} ${f(pt(0.2))} ${f(pt(W - 0.4))} ${f(pt(H - 0.4))} re S`);
    const sx = (W - settings.scratchWidthMm) / 2;
    ops.push("[2 2] 0 d 0.3 w 0 G");
    ops.push(`${f(pt(sx))} ${f(y(settings.scratchTopMm + settings.scratchHeightMm))} ${f(pt(settings.scratchWidthMm))} ${f(pt(settings.scratchHeightMm))} re S`);
    ops.push("[] 0 d");
  }

  // The small print is as large as the longest of its lines allows, within 5 to 9 pt, so nothing runs off the label.
  const fit = (lines: string[]) => Math.max(5, Math.min(9, Math.floor((((W - 4) / (Math.max(...lines.map((l) => l.length)) * COURIER_WIDTH)) * PT_PER_MM) * 10) / 10));
  const lineMm = (size: number) => size * MM_PER_PT * 1.25;
  ops.push("0 g");

  // Above the scratch area: what the card gives, and the batch and serial, so a card is found without scratching it.
  const topLines = [`Kod langganan ${content.planText}`, `Batch ${content.batchNumber} ${content.serial}`];
  const topSize = fit(topLines);
  if (settings.scratchTopMm >= lineMm(topSize) * 2 + 3) {
    topLines.forEach((line, i) => text("F2", topSize, W / 2, 2.2 + lineMm(topSize) * (i + 1) - topSize * MM_PER_PT * 0.25, line));
  } else if (settings.scratchTopMm >= lineMm(topSize) + 2) {
    const one = `${content.batchNumber} ${content.serial}`;
    text("F2", fit([one]), W / 2, 1.5 + lineMm(fit([one])), one);
  }

  // The code, one line, centred in the scratch area.
  if (layout.codeFontPt > 0) {
    const centreY = settings.scratchTopMm + settings.scratchHeightMm / 2;
    text("F1", layout.codeFontPt, W / 2, centreY + layout.codeCapHeightMm / 2, codeText(content.canonical, settings.separator));
  }

  // Below the scratch area: how to use it.
  const below = settings.scratchTopMm + settings.scratchHeightMm;
  const botLines = ["Kikis, lalu tebus di", "jalin.adjung.com/tebus"];
  const botSize = fit(botLines);
  if (H - below >= lineMm(botSize) * 2 + 2) {
    botLines.forEach((line, i) => text("F2", botSize, W / 2, below + 1.5 + lineMm(botSize) * (i + 1) - botSize * MM_PER_PT * 0.25, line));
  } else if (H - below >= lineMm(botSize) + 1.5) {
    text("F2", botSize, W / 2, H - 1.2, botLines[1]);
  }

  return ops.join("\n");
}

/** A PDF with one page per label, each page exactly the size of the label. */
export function buildLabelPdf(settings: LabelSettings, labels: LabelContent[], options: PdfOptions = {}): { pdf: string; layout: LabelLayout; pages: number } {
  if (labels.length === 0) throw new Error("Nothing to print.");
  const layout = computeLayout(settings, labels[0].canonical);
  if (layout.problems.some((p) => p.level === "error")) throw new Error(layout.problems.filter((p) => p.level === "error").map((p) => p.text).join(" "));
  for (const l of labels) { ascii(l.canonical); ascii(l.batchNumber); ascii(l.serial); ascii(l.planText); }

  const objects: string[] = [];
  // 1 catalog, 2 pages, 3 and 4 fonts, then (page, content) pairs.
  const pageObjIds = labels.map((_, i) => 5 + i * 2);
  objects[1] = `<< /Type /Catalog /Pages 2 0 R >>`;
  objects[2] = `<< /Type /Pages /Kids [${pageObjIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${labels.length} >>`;
  objects[3] = `<< /Type /Font /Subtype /Type1 /BaseFont /Courier-Bold >>`;
  objects[4] = `<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>`;
  const wPt = f(settings.widthMm * PT_PER_MM);
  const hPt = f(settings.heightMm * PT_PER_MM);
  labels.forEach((label, i) => {
    const pageId = 5 + i * 2;
    const stream = pageContent(settings, layout, label, options);
    objects[pageId] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${wPt} ${hPt}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${pageId + 1} 0 R >>`;
    objects[pageId + 1] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
  });

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  for (let id = 1; id < objects.length; id++) {
    offsets[id] = pdf.length;
    pdf += `${id} 0 obj\n${objects[id]}\nendobj\n`;
  }
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
  for (let id = 1; id < objects.length; id++) pdf += `${String(offsets[id]).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return { pdf, layout, pages: labels.length };
}
