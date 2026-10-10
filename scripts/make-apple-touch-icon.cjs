/**
 * Draws public/brand/apple-touch-icon.png (180x180) from the colour emblem: the emblem on the page's paper colour, with a margin,
 * because iOS rounds the corners itself and puts transparency on black. Run again if the emblem changes:
 *   node scripts/make-apple-touch-icon.cjs
 */
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const SIZE = 180;
const EMBLEM = 124;
const root = path.join(__dirname, "..");
const svg = fs.readFileSync(path.join(root, "public/brand/jalin-icon-color.svg"));

(async () => {
  const emblem = await sharp(svg, { density: 384 }).resize(EMBLEM, EMBLEM, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  const out = await sharp({ create: { width: SIZE, height: SIZE, channels: 3, background: "#fbf8f2" } })
    .composite([{ input: emblem, gravity: "center" }])
    .flatten({ background: "#fbf8f2" })
    .removeAlpha().png({ compressionLevel: 9 })
    .toBuffer();
  fs.writeFileSync(path.join(root, "public/brand/apple-touch-icon.png"), out);
  console.log("wrote public/brand/apple-touch-icon.png", out.length, "bytes");
})();
