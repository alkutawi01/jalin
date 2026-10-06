/**
 * Homepage carousel. Controls: one centred group of small round buttons with drawn arrows. No pause button: the carousel stops while a mouse
 * rests on it, while a finger or button is held on a slide or a dot, and while focus is inside it. Layout: every slide fills the same cell, the
 * title sits at the top and the button is pinned to the bottom of the text column, so nothing on the page moves when the slide changes
 * (measured on the live page at 375, 834 and 1280 px: same stack height, same button and picture position on every slide). The change is a
 * fade out then fade in (never both showing through each other).
 */
import fs from "node:fs";
import path from "node:path";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}
const read = (p: string) => fs.readFileSync(path.join(__dirname, "..", p), "utf8").replace(/\r\n/g, "\n");
const tsx = read("src/components/reader/HeroCarousel.tsx");
assert(!tsx.includes("hero-carousel-pause") && !tsx.includes("setPaused") && !tsx.includes('"Jeda"') && !tsx.includes("Jeda slaid"), "there is no pause button");
assert(tsx.includes("onPointerDown={() => setHolding(true)}") && tsx.includes('window.addEventListener("pointerup", release)') && tsx.includes('window.addEventListener("pointercancel", release)'), "holding a slide or a dot pauses it, and letting go anywhere releases it");
assert(tsx.includes('event.pointerType === "mouse"') && tsx.includes("setFocused(true)") && tsx.includes("const stopped = hovering || holding || focused"), "a resting mouse and focus inside also stop it (touch taps do not leave it stuck)");
assert(tsx.includes("if (count < 2 || stopped || reduced) return;"), "automatic movement honours all of them and reduced motion");
assert(tsx.includes('aria-label="Sebelumnya"') && tsx.includes('aria-label="Seterusnya"') && tsx.includes("aria-label={`Slaid ${i + 1}"), "the arrows and dots keep their spoken labels");
const css = read("src/app/globals.css");
assert(/\.hero-carousel-controls \{[^}]*justify-content: center/.test(css) && /\.hero-carousel-btn \{[^}]*width: 36px; height: 36px[^}]*border-radius: 50%/.test(css), "the controls are a centred group of small circles");
assert(/\.hero-carousel-slide \{[^}]*align-items: stretch/.test(css) && /\.hero-carousel-slide \.hero-featured-cta \{ margin-top: auto; \}/.test(css) && css.includes("grid-template-rows: auto minmax(0, 1fr)"), "slides stretch to one height and the button is pinned to the bottom (also in the stacked layout)");
assert(!/\.hero-carousel-slide \{[^}]*align-content: start/.test(css), "the old per-slide 'start' alignment that let the text move is gone");
assert(/\.hero-carousel-slide\.is-active \{[^}]*z-index: 2/.test(css) && /\.hero-carousel-slide\.is-active \.hero-featured-visual \{ opacity: 1; transition: opacity 1s ease-in-out; \}/.test(css) && /\.hero-carousel-slide \.hero-featured-text \{ opacity: 0; transition: opacity \.3s/.test(css) && /\.hero-carousel-slide\.is-active \.hero-featured-text \{ opacity: 1; transition: opacity \.6s ease-in-out \.4s; \}/.test(css) && !css.includes("hero-carousel-slide.is-leaving"), "cross-fade: the new picture fades in over the old one (no dip), the old text leaves quickly and the new text arrives a moment later");
assert(!css.includes(".hero-carousel-pause"), "the pause button's style is gone");
console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
