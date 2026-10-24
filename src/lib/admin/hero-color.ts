import sharp from "sharp";
import { hslToHex, rgbToHex, rgbToHsl } from "../reader/story-theme";
import { getObject, objectStoreConfig } from "../storage/object-store";

/**
 * The colour of a hero picture, for the work's theme. Not the plain average (a dark photo averages to mud): pixels vote for a hue
 * in proportion to how colourful and how mid-toned they are, the winning hue's pixels are averaged, and the result is softened by
 * story-theme.ts into a calm page colour. A picture with almost no colour (greyscale) gives a neutral tint of its average.
 */
export async function dominantColorFromBuffer(buffer: Buffer): Promise<string> {
  const { data, info } = await sharp(buffer).rotate().resize(64, 64, { fit: "inside" }).removeAlpha().toColourspace("srgb").raw().toBuffer({ resolveWithObject: true });
  const BUCKETS = 24;
  const weight = new Array(BUCKETS).fill(0);
  const sums = Array.from({ length: BUCKETS }, () => [0, 0, 0, 0]);
  let avgR = 0, avgG = 0, avgB = 0, n = 0, totalWeight = 0;
  for (let i = 0; i + 2 < data.length; i += info.channels) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    avgR += r; avgG += g; avgB += b; n++;
    const [h, s, l] = rgbToHsl(r, g, b);
    const w = s * (1 - Math.abs(2 * l - 1)) ** 1.5;
    if (w < 0.02) continue;
    const bucket = Math.min(BUCKETS - 1, Math.floor((h / 360) * BUCKETS));
    weight[bucket] += w;
    totalWeight += w;
    sums[bucket][0] += r * w; sums[bucket][1] += g * w; sums[bucket][2] += b * w; sums[bucket][3] += w;
  }
  if (n === 0) return "#a76450";
  // Almost no colour in the picture: a neutral tint of its average.
  if (totalWeight / n < 0.04) return rgbToHex(avgR / n, avgG / n, avgB / n);
  // Neighbouring buckets share a hue family, so vote over a window of three to avoid splitting one colour across a boundary.
  let best = 0, bestScore = -1;
  for (let i = 0; i < BUCKETS; i++) {
    const score = weight[i] + 0.6 * weight[(i + 1) % BUCKETS] + 0.6 * weight[(i + BUCKETS - 1) % BUCKETS];
    if (score > bestScore) { bestScore = score; best = i; }
  }
  const group = [best, (best + 1) % BUCKETS, (best + BUCKETS - 1) % BUCKETS];
  let r = 0, g = 0, b = 0, w = 0;
  for (const idx of group) { r += sums[idx][0]; g += sums[idx][1]; b += sums[idx][2]; w += sums[idx][3]; }
  const [h, s, l] = rgbToHsl(r / w, g / w, b / w);
  return hslToHex(h, Math.max(0.25, Math.min(0.8, s)), Math.max(0.3, Math.min(0.62, l)));
}

/** The bytes of a hero picture: from the private bucket when it is one of ours (/media/...), otherwise over the network. */
export async function loadHeroBytes(src: string, siteOrigin: string): Promise<Buffer | null> {
  try {
    let key: string | null = null;
    if (src.startsWith("/media/")) key = decodeURIComponent(src.slice("/media/".length).split("?")[0]);
    else if (src.startsWith(`${siteOrigin}/media/`)) key = decodeURIComponent(src.slice(`${siteOrigin}/media/`.length).split("?")[0]);
    const cfg = objectStoreConfig();
    if (key && cfg) {
      const res = await getObject(cfg, key);
      return res ? Buffer.from(await res.arrayBuffer()) : null;
    }
    const url = src.startsWith("/") ? `${siteOrigin}${src}` : src;
    if (!/^https:\/\//.test(url)) return null;
    const res = await fetch(url, { signal: AbortSignal.timeout(20_000) });
    return res.ok ? Buffer.from(await res.arrayBuffer()) : null;
  } catch {
    return null;
  }
}

export async function dominantColorFromHero(src: string, siteOrigin: string): Promise<string | null> {
  const bytes = await loadHeroBytes(src, siteOrigin);
  if (!bytes) return null;
  try {
    return await dominantColorFromBuffer(bytes);
  } catch {
    return null;
  }
}
