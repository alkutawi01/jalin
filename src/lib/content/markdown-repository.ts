import type { Work, WorkType } from "./types";
import type { ContributorMeta } from "./contributors";
import type { ContentRepository } from "./repository";
import {
  getWorkBySlug,
  getWorksByType,
  getAllWorks,
} from "./workLoader";
import {
  getContributorMeta,
  getContributors,
} from "./contributors";

export class MarkdownContentRepository implements ContentRepository {
  getWork(slug: string): Work | undefined {
    return getWorkBySlug(slug);
  }

  getWorks(): Work[] {
    return getAllWorks();
  }

  getWorksByType(type: WorkType): Work[] {
    return getWorksByType(type);
  }

  getContributor(slug: string): ContributorMeta | undefined {
    return getContributorMeta(slug);
  }

  getContributors(): ContributorMeta[] {
    return getContributors();
  }
}
