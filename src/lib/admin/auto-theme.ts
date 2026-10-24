import { getWork, updateWorkTheme, workHeroSrc } from "./work-service";
import { dominantColorFromHero } from "./hero-color";
import { parseThemeSetting } from "../reader/story-theme";
import { SITE_URL } from "../seo";

/**
 * When a work's colour is "automatic" and its hero picture changes, read the colour again. Best effort and silent: a failure here must never
 * break the picture upload that triggered it (the editor can press "Baca warna daripada gambar utama" by hand).
 */
export async function refreshAutoTheme(workId: string): Promise<void> {
  try {
    const work = await getWork(workId);
    const theme = parseThemeSetting(work?.metadata?.theme);
    if (!theme || theme.mode !== "auto") return;
    const src = await workHeroSrc(workId);
    if (!src) return;
    const color = await dominantColorFromHero(src, SITE_URL);
    if (color && color !== theme.color) await updateWorkTheme(workId, { mode: "auto", color });
  } catch {
    /* keep the colour the work already has */
  }
}
