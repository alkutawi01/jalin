/**
 * Izzat, 9 Okt 2026, on Tetapan > Saiz teks karya: "Asal Jalin? Berapa? No preview? No difference between phone, tablet, laptop, wide screen?"
 * Each kind of screen now has its own two boxes showing Jalin's own size, and a mock-up of that one screen (one at a time) shows the result.
 * This file checks that the table of Jalin's own sizes is what the stylesheet really does, and that the sizes reach the reader per screen.
 */
import fs from "node:fs";
import path from "node:path";
import { DEVICES, DEVICE_IDS, deviceInfo } from "../src/lib/reader/typography-devices";
import { BODY_PX, HEADING_EM, NO_TYPOGRAPHY, TypographyInputError, cleanDeviceSizes, deviceRowName, typographyCss } from "../src/lib/reader/reader-typography";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}
const read = (p: string) => fs.readFileSync(path.join(__dirname, "..", p), "utf8").replace(/\r\n/g, "\n");
const css = read("src/app/globals.css");
const refuses = (fn: () => unknown) => { try { fn(); return false; } catch (e) { return e instanceof TypographyInputError; } };

// The table is the stylesheet
assert(DEVICE_IDS.join() === "phone,tabPortrait,tabLandscape,laptop,wide" && DEVICES.map((d) => d.id).join() === DEVICE_IDS.join(), "five kinds of screen, from the smallest to the largest");
assert(css.includes(".story-body {\n  min-width: 0;\n  font-size: 21px;\n  line-height: 1.84;") && css.includes(".story-body p { margin: 0 0 1.55em; }"), "the base text is 21px, line 1.84, paragraphs 1.55em apart (a wide screen and a tablet on its side)");
assert(css.includes("@media (max-width: 820px) {") && css.includes("  .story-body { font-size: 17.5px; line-height: 1.78; }"), "up to 820px (phone and tablet upright) the text is 17.5px, line 1.78");
assert(css.includes("@media (min-width: 1051px) and (max-width: 1600px) {") && css.includes("  .story-body { font-size: 19px; line-height: 1.75; }") && css.includes("  .story-body p { margin-bottom: 1.25em; }") && css.includes("  .story-body h2 { font-size: 1.32em; line-height: 1.3; margin: 1.9em 0 .6em; }"), "on a laptop the text is 19px, line 1.75, paragraphs 1.25em apart, sub-headings 1.32em");
assert(css.includes("@media (max-width: 1050px) { .story-body h2 { font-size: 1.2em; line-height: 1.3; margin: 1.7em 0 .5em; } }") && css.includes("@media (min-width: 601px) and (max-width: 820px) { .story-body h2 { font-size: 1.3em; } }"), "up to 1050px the sub-headings are 1.2em, and 1.3em on a tablet upright");
assert(css.includes(".reading-grid {\n  display: grid;\n  grid-template-columns: 180px minmax(0, 720px) 180px;") && css.includes(".reading-grid { grid-template-columns: 180px minmax(0, 690px) 180px; }") && css.includes(".reading-grid { grid-template-columns: minmax(0, 700px) 190px; justify-content: center; }") && css.includes(".site-shell { width: min(100% - 40px, 700px); }"), "the story column is 720px on a wide screen, 690px on a laptop, 700px with a 190px rail on a tablet on its side, 700px at most below that");
const t = (id: Parameters<typeof deviceInfo>[0]) => deviceInfo(id).defaults;
assert(t("phone").bodyPx === 17.5 && t("phone").lineHeight === 1.78 && t("phone").headingEm === 1.2 && t("tabPortrait").bodyPx === 17.5 && t("tabPortrait").headingEm === 1.3, "phone and tablet upright: 17.5px; sub-headings 1.2em and 1.3em");
assert(t("tabLandscape").bodyPx === 21 && t("tabLandscape").lineHeight === 1.84 && t("tabLandscape").headingEm === 1.2, "tablet on its side: 21px, line 1.84, sub-headings 1.2em");
assert(t("laptop").bodyPx === 19 && t("laptop").lineHeight === 1.75 && t("laptop").paragraphGapEm === 1.25 && t("laptop").headingEm === 1.32 && t("laptop").headingMarginEm.join() === "1.9,0.6", "laptop: 19px, line 1.75, gap 1.25em, sub-headings 1.32em");
assert(t("wide").bodyPx === 21 && t("wide").lineHeight === 1.84 && t("wide").paragraphGapEm === 1.55 && t("wide").headingEm === 1.5, "wide screen: 21px, line 1.84, gap 1.55em, sub-headings 1.5em");
assert(deviceInfo("laptop").layout.column === 690 && deviceInfo("wide").layout.column === 720 && deviceInfo("tabLandscape").layout.column === 700 && deviceInfo("phone").layout.column === 335 && deviceInfo("phone").layout.shell === 335, "the column widths of the mock-up are the stylesheet's");
for (const device of DEVICES) {
  assert(css.includes(`@media ${device.media}`) || device.media === "(max-width: 600px)" || device.media === "(min-width: 1601px)" || css.includes(device.media.replace("@media ", "")), `${device.label}: its media query is one the stylesheet uses or is a clean edge`);
}
assert(DEVICES.every((d, i) => i === 0 || d.screen.w > DEVICES[i - 1]!.screen.w || d.id === "tabLandscape"), "the sample screens grow from phone to wide monitor");
assert(deviceInfo("phone").screen.w <= 600 && deviceInfo("tabPortrait").screen.w > 600 && deviceInfo("tabPortrait").screen.w <= 820 && deviceInfo("tabLandscape").screen.w > 820 && deviceInfo("tabLandscape").screen.w <= 1050 && deviceInfo("laptop").screen.w > 1050 && deviceInfo("laptop").screen.w <= 1600 && deviceInfo("wide").screen.w > 1600, "each sample screen falls inside its own range");

// The CSS the reader gets
assert(typographyCss(NO_TYPOGRAPHY) === "" && typographyCss({ bodyPx: 20, headingEm: null }) === "body .story-body{font-size:20px}", "sizes for every screen are written as before");
assert(typographyCss({ bodyPx: null, headingEm: null, devices: { phone: { bodyPx: 18, headingEm: 1.3 } } }) === "@media (max-width: 600px){body .story-body{font-size:18px}body .story-body h2{font-size:1.3em}}", "a size for one screen sits in that screen's own media query");
assert(typographyCss({ bodyPx: 20, headingEm: null, devices: { laptop: { bodyPx: 22, headingEm: null }, phone: { bodyPx: null, headingEm: null } } }) === "body .story-body{font-size:20px}@media (min-width: 1051px) and (max-width: 1600px){body .story-body{font-size:22px}}", "the sizes for every screen come first so a screen's own wins; a screen with nothing set writes nothing");
assert(typographyCss({ bodyPx: null, headingEm: null, devices: { wide: { bodyPx: 24, headingEm: 1.6 }, phone: { bodyPx: 16, headingEm: null } } }).indexOf("(max-width: 600px)") < typographyCss({ bodyPx: null, headingEm: null, devices: { wide: { bodyPx: 24, headingEm: 1.6 }, phone: { bodyPx: 16, headingEm: null } } }).indexOf("(min-width: 1601px)"), "the screens are written in a fixed order");

// Saving
assert(deviceRowName(BODY_PX.name, "phone") === "story.body_px.phone" && deviceRowName(HEADING_EM.name, "wide") === "story.heading_em.wide", "a size for one screen is kept under the old name with the screen added (no migration)");
const cleaned = cleanDeviceSizes({ phone: { bodyPx: "18,5", headingEm: "" }, laptop: { bodyPx: 20, headingEm: 1.4 } });
assert(cleaned.phone.bodyPx === 18.5 && cleaned.phone.headingEm === null && cleaned.laptop.bodyPx === 20 && cleaned.laptop.headingEm === 1.4 && cleaned.wide.bodyPx === null && Object.keys(cleaned).length === 5, "every screen is read; a missing or empty one is Jalin's own size");
let message = "";
try { cleanDeviceSizes({ tabPortrait: { bodyPx: 99 } }); } catch (e) { message = (e as Error).message; }
assert(message === "Tab menegak: Saiz teks karya mesti antara 14 dan 28 px.", "a size outside the limits is refused in Malay, naming the screen");
assert(refuses(() => cleanDeviceSizes(null)) && refuses(() => cleanDeviceSizes([])) && refuses(() => cleanDeviceSizes("x")) && refuses(() => cleanDeviceSizes({ wide: { headingEm: 9 } })), "anything that is not a set of sizes, or has one too large, is refused (nothing is saved)");
assert(cleanDeviceSizes({ __proto__: { phone: { bodyPx: 99 } }, phone: { bodyPx: 16 } }).phone.bodyPx === 16 && cleanDeviceSizes({ constructor: { bodyPx: 99 } }).phone.bodyPx === null, "names like __proto__ and constructor change nothing");

// The screens
const settings = read("src/components/admin/ReaderTypographySettings.tsx");
assert(settings.includes("DEVICES.map((device) =>") && settings.includes("placeholder={`${device.defaults.bodyPx} (asal)`}") && settings.includes("placeholder={`${device.defaults.headingEm} (asal)`}"), "every screen has its own row, and the box shows Jalin's own size, not 'Asal Jalin'");
assert(!settings.includes('placeholder="Asal Jalin"') && settings.includes("Samakan semua") && settings.includes("JSON.stringify({ devices })"), "there is a button to make every screen the same, and the sizes are saved per screen");
assert((settings.match(/<ReaderTypographyPreview /g) ?? []).length === 1 && settings.includes("device={active}") && settings.includes("onFocus={() => setActive(device.id)}") && settings.includes("aria-pressed={device.id === active}"), "one mock-up is on the page at any time, for the screen chosen by the buttons or by the row being edited");
assert(settings.includes("Kembali kepada saiz asal") && settings.includes("Saiz teks karya disimpan.") && settings.includes("tidak dapat disimpan"), "it can still go back to Jalin's sizes and says what happened");
assert(settings.includes("function usable(") && settings.includes("number >= limits.min && number <= limits.max"), "a number outside the limits is not drawn in the mock-up (Jalin's own size is)");
const preview = read("src/components/admin/ReaderTypographyPreview.tsx");
assert(preview.includes("const body = bodyPx ?? info.defaults.bodyPx") && preview.includes("const heading = headingEm ?? info.defaults.headingEm"), "the mock-up uses the typed size, or Jalin's own for that screen");
assert(preview.includes("info.screen.w * scale") && preview.includes("transform = `scale(${scale})`") && preview.includes("Saiz sebenar") && preview.includes("MAX_HEIGHT"), "the page is drawn at the real size of the screen and scaled to fit, or shown at its real size on request");
assert(preview.includes("FRAME = {") && ["phone", "tablet", "laptop", "monitor"].every((f) => preview.includes(`${f}: {`)) && preview.includes('aria-hidden="true"') && preview.includes("role=\"img\""), "each kind of screen is drawn as a device (phone, tablet, laptop, monitor) and described once for a screen reader");
assert(!preview.includes("style={{") && preview.includes("ReaderTypographyPreview.module.css"), "the mock-up sets its sizes through CSS variables (no inline style objects) and keeps its styles in its own file");
const api = read("src/app/api/admin/reader-typography/route.ts");
assert(api.includes("devices: body.devices"), "the API takes the sizes per screen");
const store = read("src/lib/reader/reader-typography.ts");
assert(store.includes("if (input.devices !== undefined && input.devices !== null) return saveDeviceTypography(input.devices)") && store.includes("if ((current.devices?.[id]?.bodyPx ?? null) !== devices[id].bodyPx)") && store.includes("if (current.bodyPx !== null) await saveOne(BODY_PX.name, null)"), "saving per screen writes only what changed, and clears the old size for every screen once the boxes show it");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
