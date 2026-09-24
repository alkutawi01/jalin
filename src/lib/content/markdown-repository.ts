import type { Work, WorkType, ReadingSection, SeriesMeta, SeriesEpisodeRef } from "./types";
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

  getReadingSections(_workId: string): ReadingSection[] {
    return [];
  }

  getPublishedSeries(): SeriesMeta[] {
    return [];
  }

  getSeriesBySlug(_slug: string): SeriesMeta | undefined {
    return undefined;
  }

  getPublishedSeriesEpisodes(_seriesId: string): SeriesEpisodeRef[] {
    return [];
  }

  getEpisodeBySeriesAndSlug(_seriesSlug: string, _episodeSlug: string): Work | undefined {
    return undefined;
  }
}
