/**
 * Draws the share picture of the pages that have no picture of their own (homepage, lists, author pages, About, Privacy, Terms):
 * the theme's deep teal, the reversed Jalin logo and the slogan, 1200 x 630.
 *
 *   node scripts/make-og-default.mjs
 *
 * It is drawn once and kept as a file (public/brand/og-default.png), not drawn on every request. To use a picture of your own
 * instead, replace that file with any 1200 x 630 PNG; nothing else needs to change.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const WIDTH = 1200;
const HEIGHT = 630;
const TEAL = "#18343c";
const CREAM = "#f3e9df";
const SLOGAN = "Selami dunia melalui cerita";

// The logo file has empty space around the mark; it is cut away so the slogan can sit close under "oleh Adjung".
const LOGO_HEIGHT = 330;
const logo = await sharp(path.join(root, "public/brand/jalin-logo-reversed.svg"), { density: 300 }).trim().resize({ height: LOGO_HEIGHT }).png().toBuffer();
const logoMeta = await sharp(logo).metadata();

// The slogan is upright (Izzat: no italics) and there is no rule between it and the logo.
const TEXT_HEIGHT = 70;
const GAP = 44;
const text = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${TEXT_HEIGHT}">
  <text x="${WIDTH / 2}" y="50" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="46" fill="${CREAM}">${SLOGAN}</text>
</svg>`);

// Logo and slogan are centred together on the card.
const top = Math.round((HEIGHT - (logoMeta.height + GAP + TEXT_HEIGHT)) / 2);
const out = path.join(root, "public/brand/og-default.png");
await sharp({ create: { width: WIDTH, height: HEIGHT, channels: 3, background: TEAL } })
  .composite([
    { input: logo, top, left: Math.round((WIDTH - logoMeta.width) / 2) },
    { input: text, top: top + logoMeta.height + GAP, left: 0 }
  ])
  .png({ compressionLevel: 9, palette: true, quality: 90 })
  .toFile(out);
console.log(`${path.relative(root, out)}: ${(fs.statSync(out).size / 1024).toFixed(0)} KB, ${WIDTH}x${HEIGHT}, logo ${logoMeta.width}x${logoMeta.height}`);
