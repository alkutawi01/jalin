/**
 * The words and the picture of the public Editorial page, which an editor changes in Tetapan > Halaman Editorial.
 * The storage is page-copy.ts (scope "editorial_page"); the picture is two more rows there: "hero.src" (the stored address) and "hero.alt".
 */

import { pageCopyStore } from "./page-copy";
import { detectImageType, MAX_MANUAL_UPLOAD_BYTES } from "./admin/visual-generation/manual-upload";
import { storeVisualAssetBytes } from "./admin/visual-generation/asset-storage";
import { MAX_UPLOAD_LABEL } from "./admin/upload-limit";

const HERO_STORAGE_ID = 7_000_001;

export const DEFAULT_EDITORIAL_COPY = {
  dek: "Di sebalik setiap cerita yang diterbitkan di Jalin, terdapat proses pemilihan, penyuntingan dan penelitian. Kenali mereka yang menyumbang serta cara kami mengendalikan setiap penerbitan.",
  definition: "Cerpen, novela dan bersiri ialah karya Jalin, manakala fragmen dan sinopsis memperkenalkan cerita daripada karya pengarang lain melalui petikan dan ringkasan.",
  disclosure: "Jalin menerbitkan cerita melalui sumbangan manusia serta penggunaan kecerdasan buatan. Sebahagian identiti penulis di Jalin ialah penulis maya, iaitu persona kepengarangan yang dibangunkan dengan bantuan teknologi ini dan diselia oleh editor manusia. Identiti itu dinyatakan pada profil masing-masing, manakala setiap penerbitan dikreditkan mengikut sumbangan sebenar.",
  "heading.editors": "Penyuntingan dan penerbitan",
  "heading.writers": "Penulis dan penyumbang",
  "heading.ways": "Cara kami bekerja",
  "way.1.title": "Penerbitan",
  "way.1.text": "Setiap cerita disemak dan diluluskan oleh editor manusia sebelum diterbitkan. Tiada apa-apa diterbitkan secara automatik.",
  "way.2.title": "Kredit dan ketelusan",
  "way.2.text": "Setiap sumbangan dikreditkan mengikut peranan sebenar, termasuk pendedahan identiti penulis maya.",
  "way.3.title": "Ilustrasi",
  "way.3.text": "Setiap ilustrasi dipilih dan diluluskan oleh editor. Wajah manusia dalam adegan fiksyen lazimnya tidak diperlihatkan dengan jelas.",
  "way.4.title": "Versi dan semakan",
  "way.4.text": "Cerita boleh diperbaik melalui versi baharu, dan sejarah semakannya dikekalkan."
} as const;

export const editorialPage = pageCopyStore("editorial_page", DEFAULT_EDITORIAL_COPY as Record<keyof typeof DEFAULT_EDITORIAL_COPY, string>);

export type EditorialField = keyof typeof DEFAULT_EDITORIAL_COPY;
export type EditorialCopy = Record<EditorialField, string> & { heroSrc: string; heroAlt: string };

/** Never throws: a database problem shows the defaults and no picture. */
export async function loadEditorialCopy(): Promise<EditorialCopy> {
  const { raw, ...copy } = await editorialPage.load();
  return { ...(copy as Record<EditorialField, string>), heroSrc: raw["hero.src"] ?? "", heroAlt: raw["hero.alt"] ?? "" };
}

export type EditorialHeroResult = { ok: true; src: string } | { ok: false; status: number; error: string };

export async function setEditorialHero(bytes: Buffer, alt: string): Promise<EditorialHeroResult> {
  if (bytes.length === 0) return { ok: false, status: 400, error: "Fail imej diperlukan." };
  if (bytes.length > MAX_MANUAL_UPLOAD_BYTES) return { ok: false, status: 413, error: `Imej melebihi ${MAX_UPLOAD_LABEL}.` };
  const type = detectImageType(bytes);
  if (!type) return { ok: false, status: 400, error: "Hanya imej PNG, JPEG atau WebP diterima." };
  const stored = await storeVisualAssetBytes(bytes, HERO_STORAGE_ID, type.mime);
  if (!stored.finalized || !stored.stableAssetPath) {
    return { ok: false, status: 503, error: "Imej tidak dapat disimpan secara kekal. Semak tetapan storan imej." };
  }
  await editorialPage.saveRaw("hero.src", stored.stableAssetPath, null);
  await editorialPage.saveRaw("hero.alt", alt.trim(), null);
  return { ok: true, src: stored.stableAssetPath };
}

export async function setEditorialHeroAlt(alt: string): Promise<void> {
  await editorialPage.saveRaw("hero.alt", alt.trim(), null);
}

export async function clearEditorialHero(): Promise<void> {
  await editorialPage.saveRaw("hero.src", "", null);
  await editorialPage.saveRaw("hero.alt", "", null);
}
