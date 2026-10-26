import assert from "node:assert/strict";
import { contrastRatio, derivePalettes, storyPageCss, hexToRgb, rgbToHsl, normaliseHex, parseThemeSetting, storyThemeVars } from "../src/lib/reader/story-theme";

assert.equal(normaliseHex("#ABC"), "#aabbcc", "short hex expands");
assert.equal(normaliseHex("red"), null, "names are refused");
assert.equal(normaliseHex("#12345"), null, "wrong length is refused");
assert.deepEqual(parseThemeSetting({ mode: "auto", color: "#A76450" }), { mode: "auto", color: "#a76450" });
assert.equal(parseThemeSetting({ mode: "other", color: "#a76450" }), null, "unknown mode is no colour");
assert.equal(parseThemeSetting({ mode: "manual", color: "javascript:1" }), null, "a bad colour is no colour");
assert.equal(parseThemeSetting(null), null);

// Every kind of colour, including the awkward ones: pure primaries, yellow, near-white, near-black, grey.
const bases = ["#ff0000", "#00ff00", "#0000ff", "#ffff00", "#00ffff", "#ff00ff", "#ffffff", "#000000", "#808080", "#a76450", "#1c4a57", "#f5e6c8", "#2b0a3d", "#ffd400", "#7fff00"];
for (let h = 0; h < 360; h += 15) for (const s of [20, 60, 100]) for (const l of [20, 50, 80]) {
  const c = hsl(h, s / 100, l / 100); bases.push(c);
}
function hsl(h: number, s: number, l: number): string {
  const k = (n: number) => (n + h / 30) % 12; const a = s * Math.min(l, 1 - l);
  const f = (n: number) => Math.round(255 * (l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))));
  return "#" + [f(0), f(8), f(4)].map((v) => v.toString(16).padStart(2, "0")).join("");
}
let checked = 0;
for (const base of bases) {
  const p = derivePalettes(base);
  for (const name of ["cerah", "sepia", "gelap"] as const) {
    const t = p[name];
    assert.ok(contrastRatio(t.ink, t.bg) >= 7, `${base} ${name}: body text on page needs 7:1, got ${contrastRatio(t.ink, t.bg).toFixed(2)}`);
    assert.ok(contrastRatio(t.ink, t.surface) >= 7, `${base} ${name}: body text on cards needs 7:1, got ${contrastRatio(t.ink, t.surface).toFixed(2)}`);
    assert.ok(contrastRatio(t.inkSoft, t.bg) >= 4.5, `${base} ${name}: secondary text needs 4.5:1, got ${contrastRatio(t.inkSoft, t.bg).toFixed(2)}`);
    assert.ok(contrastRatio(t.accentText, t.bg) >= 4.5, `${base} ${name}: accent text needs 4.5:1, got ${contrastRatio(t.accentText, t.bg).toFixed(2)}`);
    assert.ok(contrastRatio(t.accent, t.bg) >= 3, `${base} ${name}: accent shapes need 3:1, got ${contrastRatio(t.accent, t.bg).toFixed(2)}`);
    checked++;
  }
  const sepiaHue = rgbToHsl(...hexToRgb(p.sepia.bg))[0];
  assert.ok(sepiaHue > 10 && sepiaHue < 70, `${base}: Sepia stays warm paper (hue ${sepiaHue.toFixed(0)}), whatever the work's colour`);
  const p2 = derivePalettes(base);
  assert.ok(contrastRatio(p2.gelap.bg, "#ffffff") > contrastRatio(p2.cerah.bg, "#ffffff"), `${base}: gelap is darker than cerah`);
}
const vars = storyThemeVars({ mode: "manual", color: "#a76450" })!;
assert.equal(Object.keys(vars).length, 21, "three themes of seven values");
assert.equal(storyThemeVars(null), null);
const css = storyPageCss({ mode: "manual", color: "#a76450" })!;
assert.ok(css.includes('html[data-theme="gelap"]') && css.includes('html[data-theme="sepia"]') && css.includes("::-webkit-scrollbar-thumb"), "the page and its scrollbar are painted for all three themes");
const bare = css.replace(/\[data-theme="[a-z]+"\]/g, "");
assert.ok(!/[<>"'`\\]/.test(bare), "the page css holds nothing but selectors and hex colours (the only quotes are in the data-theme selectors)");
assert.equal(storyPageCss(null), null);
console.log(`story-theme: ok (${checked} palettes checked)`);
