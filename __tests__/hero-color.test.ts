import assert from "node:assert/strict";
import sharp from "sharp";
import { dominantColorFromBuffer } from "../src/lib/admin/hero-color";
import { hexToRgb, rgbToHsl } from "../src/lib/reader/story-theme";

const solid = (r: number, g: number, b: number) => sharp({ create: { width: 80, height: 80, channels: 3, background: { r, g, b } } }).png().toBuffer();
const hueOf = (hex: string) => rgbToHsl(...hexToRgb(hex))[0];

async function main() {
  const blue = await dominantColorFromBuffer(await solid(30, 80, 200));
  assert.ok(Math.abs(hueOf(blue) - 220) < 15, `a blue picture gives a blue (${blue})`);
  const red = await dominantColorFromBuffer(await solid(200, 30, 30));
  const dh = Math.min(hueOf(red), 360 - hueOf(red));
  assert.ok(dh < 15, `a red picture gives a red (${red})`);

  // Mostly grey with a small orange patch: the colour wins over the grey.
  const grey = await sharp({ create: { width: 100, height: 100, channels: 3, background: { r: 120, g: 120, b: 120 } } })
    .composite([{ input: await sharp({ create: { width: 30, height: 30, channels: 3, background: { r: 230, g: 120, b: 20 } } }).png().toBuffer(), left: 10, top: 10 }])
    .png().toBuffer();
  const orange = await dominantColorFromBuffer(grey);
  assert.ok(hueOf(orange) > 15 && hueOf(orange) < 45, `a small colourful patch beats grey (${orange})`);

  // A pure grey picture: no hue to speak of.
  const g = await dominantColorFromBuffer(await solid(110, 110, 110));
  assert.ok(rgbToHsl(...hexToRgb(g))[1] < 0.05, `grey stays neutral (${g})`);

  // A dark photo with a small bright blue: not averaged into mud.
  const dark = await sharp({ create: { width: 100, height: 100, channels: 3, background: { r: 8, g: 8, b: 10 } } })
    .composite([{ input: await sharp({ create: { width: 25, height: 25, channels: 3, background: { r: 40, g: 120, b: 220 } } }).png().toBuffer(), left: 40, top: 40 }])
    .png().toBuffer();
  const blueish = await dominantColorFromBuffer(dark);
  assert.ok(hueOf(blueish) > 190 && hueOf(blueish) < 235, `a dark picture with a blue spot gives blue (${blueish})`);
  console.log("hero-color: ok");
}
void main();
