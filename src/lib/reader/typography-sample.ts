import { initContentRepository } from "../content";
import { getAllWorks } from "../content/workLoader";
import type { Work } from "../content/types";
import { TYPE_LABELS } from "./story-collection";

/** One block of a real story, as the typography mock-up draws it. */
export type SampleBlock = { kind: "p" | "h2" | "break"; text: string };

export interface TypographySample {
  slug: string;
  /** The public address of the story: the mock-up opens the real page. */
  href: string;
  eyebrow: string;
  title: string;
  dek: string;
  blocks: SampleBlock[];
}

export interface TypographySampleOption {
  slug: string;
  title: string;
  hasHeading: boolean;
}

const MAX_BLOCKS = 9;

/** Plain text of a line of the manuscript: footnote marks and the markdown signs are dropped (the mock-up shows size, not notes). */
function plain(line: string): string {
  return line
    .replace(/\[\^[^\]]+\]/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[*_]{1,3}([^*_]+)[*_]{1,3}/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

/** The first blocks of a manuscript, up to and including its first sub-heading when it has one within reach. */
export function sampleBlocks(body: string): SampleBlock[] {
  const blocks: SampleBlock[] = [];
  const parts = body.replace(/\r/g, "").split(/\n{2,}/);
  for (const raw of parts) {
    const part = raw.trim();
    if (!part || /^\[\^[^\]]+\]:/.test(part) || /^#\s/.test(part) || /^:::/.test(part) || /^\[\[/.test(part)) continue;
    if (/^(\*\s*){3,}$|^-{3,}$/.test(part)) {
      blocks.push({ kind: "break", text: "" });
    } else if (/^##+\s/.test(part)) {
      blocks.push({ kind: "h2", text: plain(part.replace(/^#+\s*/, "")) });
    } else {
      const text = plain(part);
      if (text) blocks.push({ kind: "p", text });
    }
    if (blocks.length >= MAX_BLOCKS) break;
  }
  return blocks;
}

const hasHeading = (work: Work) => /^##\s/m.test(work.body);

/** Published stories that can serve as the sample, newest first; the ones with a sub-heading come first because the heading size is what is being set. */
export async function typographySampleOptions(): Promise<Work[]> {
  const repo = await initContentRepository();
  const all = repo.source === "database" ? await repo.getWorks() : getAllWorks();
  return all
    .filter((work) => work.status === "published" && (work.type === "cerpen" || work.type === "novela") && work.body.trim().length > 400)
    .sort((a, b) => Number(hasHeading(b)) - Number(hasHeading(a)) || (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""));
}

export async function getTypographySample(slug?: string): Promise<{ sample: TypographySample | null; options: TypographySampleOption[] }> {
  const works = await typographySampleOptions();
  const work = works.find((w) => w.slug === slug) ?? works[0];
  const options = works.slice(0, 12).map((w) => ({ slug: w.slug, title: w.title, hasHeading: hasHeading(w) }));
  if (!work) return { sample: null, options };
  return {
    sample: { slug: work.slug, href: `/kategori/${work.type}/${work.slug}`, eyebrow: TYPE_LABELS[work.type] ?? work.type, title: work.title, dek: work.dek ?? "", blocks: sampleBlocks(work.body) },
    options
  };
}
