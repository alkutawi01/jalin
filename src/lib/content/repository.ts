import type { Work, WorkType } from "./types";
import type { ContributorMeta } from "./contributors";

export interface ContentRepository {
  getWork(slug: string): Work | undefined;
  getWorks(): Work[];
  getWorksByType(type: WorkType): Work[];
  getContributor(slug: string): ContributorMeta | undefined;
  getContributors(): ContributorMeta[];
}
