import type { Work, WorkType, ReadingSection, SeriesMeta, SeriesEpisodeRef } from "./types";
import type { ContributorMeta } from "./contributors";

export interface ContentRepository {
  getWork(slug: string): Work | undefined;
  getWorks(): Work[];
  getWorksByType(type: WorkType): Work[];
  getContributor(slug: string): ContributorMeta | undefined;
  getContributors(): ContributorMeta[];

  /** Reading sections for a Work (Novela). Empty for non-section Works. */
  getReadingSections(workId: string): ReadingSection[];

  /** All publicly eligible published Series. */
  getPublishedSeries(): SeriesMeta[];

  /** Series by slug (public serializer: only if publicly eligible). */
  getSeriesBySlug(slug: string): SeriesMeta | undefined;

  /** Publicly eligible published episodes for a Series, ordered by position. */
  getPublishedSeriesEpisodes(seriesId: string): SeriesEpisodeRef[];

  /** Episode Work by Series slug + episode slug (public only). */
  getEpisodeBySeriesAndSlug(seriesSlug: string, episodeSlug: string): Work | undefined;
}
