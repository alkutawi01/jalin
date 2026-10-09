/** The card-code sticker: layout arithmetic from the sizes, and the PDF written for the label printer. */
import { buildLabelPdf, codeText, computeLayout, DEFAULT_LABEL, MIN_READABLE_PT, validateSettings, type LabelContent, type LabelSettings } from "../src/lib/subscription/label";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string, detail?: unknown) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`, detail ?? ""); }
}
const throws = (fn: () => unknown) => { try { fn(); return false; } catch { return true; } };
const canonical = "7H3K9QM2XD5NPB84A";
const content = (n: number): LabelContent => ({ canonical: canonical.slice(0, 16) + "AB"[n % 2], batchNumber: "T-001", serial: `JLN-26-${String(n).padStart(6, "0")}`, planText: "6 bulan" });

// The code text.
assert(codeText(canonical, "-") === "7H3K-9QM2-XD5N-PB84-A", "groups of four with the check character at the end");
assert(codeText(canonical, " ") === "7H3K 9QM2 XD5N PB84 A" && codeText(canonical, "") === canonical, "other separators");

// Settings.
assert(validateSettings(DEFAULT_LABEL).length === 0, "the sizes known so far are valid");
assert(validateSettings({ ...DEFAULT_LABEL, scratchWidthMm: 60 }).some((p) => p.level === "error"), "a scratch area wider than the label is refused");
assert(validateSettings({ ...DEFAULT_LABEL, scratchTopMm: 25 }).some((p) => p.level === "error"), "a scratch area that runs off the bottom is refused");
assert(validateSettings({ ...DEFAULT_LABEL, scratchPaddingMm: 5 }).some((p) => p.level === "error"), "padding that leaves nothing is refused");
assert(validateSettings({ ...DEFAULT_LABEL, widthMm: NaN }).some((p) => p.level === "error") && validateSettings({ ...DEFAULT_LABEL, heightMm: 5 }).some((p) => p.level === "error"), "nonsense sizes are refused");

// Layout.
const layout = computeLayout(DEFAULT_LABEL, canonical);
assert(layout.code.length === 21 && layout.codeFontPt >= MIN_READABLE_PT && layout.codeFontPt < 8.5 && layout.problems.length === 0, "40 x 8 mm strip with 2 mm padding: the code fits at about 8 pt, just readable", layout);
assert(layout.codeWidthMm <= DEFAULT_LABEL.scratchWidthMm - DEFAULT_LABEL.scratchPaddingMm * 2 + 0.01, "the line never runs wider than the space it has", layout.codeWidthMm);
assert(layout.dotsPerLetter203 >= 12 && layout.dotsPerLetter203 <= 15, "about 13 dots across a letter on a 203 dpi printer", layout.dotsPerLetter203);
const narrow = computeLayout({ ...DEFAULT_LABEL, scratchWidthMm: 30 }, canonical);
assert(narrow.codeFontPt < MIN_READABLE_PT && narrow.problems.some((p) => p.level === "warning" && /sengkang/.test(p.text)), "a narrower strip warns that the code gets too small and suggests removing the hyphens");
const noHyphen = computeLayout({ ...DEFAULT_LABEL, scratchWidthMm: 30, separator: "" }, canonical);
assert(noHyphen.code.length === 17 && noHyphen.codeFontPt > narrow.codeFontPt, "without hyphens the same strip gives a larger code");
const wide = computeLayout({ ...DEFAULT_LABEL, scratchWidthMm: 46, scratchHeightMm: 12 }, canonical);
assert(wide.codeFontPt > layout.codeFontPt && wide.problems.length === 0, "a bigger strip gives a bigger code");
const tall = computeLayout({ ...DEFAULT_LABEL, scratchWidthMm: 80, widthMm: 100, scratchHeightMm: 5, scratchPaddingMm: 1 }, canonical);
assert(tall.codeFontPt <= (5 - 2) * (72 / 25.4) + 0.1, "a strip that is short limits the size by its height too", tall.codeFontPt);

// The PDF.
const labels = [content(1), content(2), content(3)];
const { pdf, pages } = buildLabelPdf(DEFAULT_LABEL, labels);
assert(pages === 3 && pdf.startsWith("%PDF-1.4\n") && pdf.endsWith("%%EOF\n"), "a PDF with one page for each label");
assert((pdf.match(/\/Type \/Page /g) ?? []).length === 3 && /\/Count 3/.test(pdf), "three pages are counted three times over");
const mb = /\/MediaBox \[0 0 ([\d.]+) ([\d.]+)\]/.exec(pdf)!;
assert(Math.abs(parseFloat(mb[1]) - 50 / 25.4 * 72) < 0.01 && Math.abs(parseFloat(mb[2]) - 30 / 25.4 * 72) < 0.01, "each page is exactly 50 x 30 mm", mb.slice(1));
// The cross-reference table must point at the objects: a viewer that cannot find them refuses the file.
{
  const startxref = parseInt(/startxref\n(\d+)\n/.exec(pdf)![1], 10);
  assert(pdf.slice(startxref, startxref + 4) === "xref", "startxref points at the table");
  const lines = pdf.slice(startxref).split("\n");
  const count = parseInt(lines[1].split(" ")[1], 10);
  let ok = true;
  for (let id = 1; id < count; id++) {
    const offset = parseInt(lines[2 + id].slice(0, 10), 10);
    if (!pdf.slice(offset).startsWith(`${id} 0 obj`)) ok = false;
  }
  assert(ok && count === 4 + 6 + 1, "every entry of the table points at its object", count);
  const lengths = [...pdf.matchAll(/<< \/Length (\d+) >>\nstream\n([\s\S]*?)\nendstream/g)];
  assert(lengths.length === 3 && lengths.every((m) => parseInt(m[1], 10) === m[2].length), "every stream is exactly as long as it says");
}
assert(labels.every((l) => pdf.includes(`(${codeText(l.canonical, "-")})`)) && pdf.includes("(Batch T-001 JLN-26-000002)") && pdf.includes("(Kod langganan 6 bulan)"), "each page carries its own code, batch and serial");
assert(!pdf.includes("/Courier-Bold >>\n") || pdf.includes("/BaseFont /Courier-Bold"), "uses the standard Courier fonts, nothing to embed");
// Nothing is drawn outside the label.
{
  const [W, H] = [parseFloat(mb[1]), parseFloat(mb[2])];
  let inside = true;
  for (const m of pdf.matchAll(/\/F(\d) ([\d.]+) Tf ([\d.-]+) ([\d.-]+) Td \((.*?)\) Tj/g)) {
    const size = parseFloat(m[2]); const x = parseFloat(m[3]); const y = parseFloat(m[4]);
    const width = m[5].length * size * 0.6;
    if (x < 0.5 || x + width > W - 0.5 || y < 0 || y + size > H + 0.01) inside = false;
  }
  assert(inside, "every line of text lies inside the label");
}
const test = buildLabelPdf(DEFAULT_LABEL, [content(1)], { guides: true });
assert(test.pdf.includes("re S") && !pdf.includes("re S"), "the outline guides appear only when asked for (a test print), never on real labels");
assert(throws(() => buildLabelPdf(DEFAULT_LABEL, [])) && throws(() => buildLabelPdf({ ...DEFAULT_LABEL, scratchWidthMm: 99 }, labels)) && throws(() => buildLabelPdf(DEFAULT_LABEL, [{ ...content(1), batchNumber: "Bät-1" }])), "no labels, impossible sizes and non-ASCII text are refused");
assert(buildLabelPdf({ ...DEFAULT_LABEL, widthMm: 40, heightMm: 30, scratchWidthMm: 38, scratchHeightMm: 16, scratchTopMm: 7 }, labels).pages === 3, "the 40 x 30 mm label with the 38 x 16 mm sticker also works");
{
  const s: LabelSettings = { ...DEFAULT_LABEL, widthMm: 30, heightMm: 50, scratchWidthMm: 26, scratchHeightMm: 8, scratchTopMm: 20 };
  assert(buildLabelPdf(s, labels).pages === 3, "a portrait label works as well");
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
