export { default } from "../page";

// Works are published after the build, so unknown slugs must render on demand (and refresh every minute).
export const dynamicParams = true;
export const revalidate = 60;

import { initContentRepository } from "../../../../../lib/content";
import { getWorksByType } from "../../../../../lib/content/workLoader";

export async function generateStaticParams() {
  const params: { type: string; slug: string; sectionSlug: string }[] = [];

  const repo = await initContentRepository();
  const useRepo = repo.source === "database";
  const works = useRepo ? repo.getWorksByType("novela") : getWorksByType("novela");

  for (const work of works) {
    for (const section of work.sections ?? []) {
      params.push({ type: "novela", slug: work.slug, sectionSlug: section.slug });
    }
  }
  return params;
}
