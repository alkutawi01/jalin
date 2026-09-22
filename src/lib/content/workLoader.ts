import type { Work, WorkType } from "./types";

const works: Work[] = [];

export function getWorkBySlug(
  slug: string
): Work | undefined {
  return works.find(
    (work) => work.slug === slug
  );
}

export function getWorksByType(
  type: WorkType
): Work[] {
  return works.filter(
    (work) => work.type === type
  );
}