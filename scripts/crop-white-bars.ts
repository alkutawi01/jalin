import sharp from "sharp";
import path from "node:path";

const WHITE_THRESHOLD = 245;

async function findCrop(filePath: string) {
  const img = sharp(filePath);
  const meta = await img.metadata();
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;

  function rowIsWhite(y: number): boolean {
    let whiteCount = 0;
    const sampleStep = 4;
    let samples = 0;
    for (let x = 0; x < width; x += sampleStep) {
      const idx = (y * width + x) * channels;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      samples++;
      if (r >= WHITE_THRESHOLD && g >= WHITE_THRESHOLD && b >= WHITE_THRESHOLD) whiteCount++;
    }
    return whiteCount / samples > 0.98;
  }

  let top = 0;
  while (top < height / 2 && rowIsWhite(top)) top++;
  let bottom = height - 1;
  while (bottom > height / 2 && rowIsWhite(bottom)) bottom--;

  return { width, height: height as number, top, bottom, cropHeight: bottom - top + 1 };
}

async function main() {
  const files = [
    "public/visuals/di-hadapan-singgahsana/hero.png",
    "public/visuals/gatsby-agung/hero.png",
  ];

  for (const rel of files) {
    const filePath = path.join(process.cwd(), rel);
    const crop = await findCrop(filePath);
    console.log(rel, JSON.stringify(crop));

    if (crop.top === 0 && crop.bottom === crop.height - 1) {
      console.log("  -> no white bars detected, skipping");
      continue;
    }

    const outBuffer = await sharp(filePath)
      .extract({ left: 0, top: crop.top, width: crop.width, height: crop.cropHeight })
      .png()
      .toBuffer();

    await sharp(outBuffer).toFile(filePath.replace(".png", ".cropped.png"));
    console.log("  -> wrote", rel.replace(".png", ".cropped.png"));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
