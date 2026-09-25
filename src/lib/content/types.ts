export type WorkType =
  | "cerpen"
  | "novela"
  | "bersiri"
  | "fragmen"
  | "sinopsis";

export type WorkStatus =
  | "draft"
  | "review"
  | "ready"
  | "published"
  | "archived";

export interface ContributorRef {
  slug: string;
  role: string;
  byline?: boolean;
}

export interface GlossaryEntry {
  term: string;
  meaning: string;
  source: string;
}

export interface VisualRef {
  role?: string;
  src: string;
  alt: string;

  provider?: string;
  creationId?: string;

  anchor?: string;
  place?: "before" | "after";
}

export interface SourceWorkRef {
  title: string;
  author?: string;
  language?: string;
  rightsStatus?: string;
}

export interface EditorialRevision {
  version: string;
  type: "initial" | "minor" | "major";
  summary: string;
  date: string;
}

export interface CharacterMeta {
  name: string;
  role: string;
}

export interface ReaderMeta {
  note?: string;
}

/** Internal Novela reading section (structural unit of ONE Work). */
export interface ReadingSection {
  slug: string;
  title?: string;
  body: string;
  position: number;
  readingMinutes?: number;
}

/** Series container metadata (Bersiri). Series is NOT a Work. */
export interface SeriesMeta {
  id: string;
  slug: string;
  title: string;
  dek?: string;
  genre?: string;
  audience?: string;
  mode: "continuous" | "anthology";
  status: "ongoing" | "completed";
}

/** Public series episode entry (only published episodes are exposed). */
export interface SeriesEpisodeRef {
  position: number;
  slug: string;
  title: string;
  dek?: string;
  publishedAt?: string;
  readingMinutes?: number;
}

export interface Work {
  id: string;
  slug: string;
  title: string;

  type: WorkType;
  status: WorkStatus;

  genre?: string;
  audience?: string;
  dek?: string;
  readingMinutes?: number;

  publishedAt?: string;
  updatedAt?: string;

  version: string;
  versionLabel?: string | null;
  revisionCount?: number;
  publishedBy?: string | null;
  firstPublishedAt?: string | null;
  publishedRevisionId?: string | null;
  publishedRevision?: unknown;

  body: string;

  credits: ContributorRef[];

  visuals: VisualRef[];

  glossary: GlossaryEntry[];

  editorialHistory: EditorialRevision[];

  metadata?: {
    characters?: CharacterMeta[];
  };

  reader?: ReaderMeta;

  sourceWork?: SourceWorkRef;

  /** Internal sections for Novela (canonical when non-empty). */
  sections?: ReadingSection[];

  /** Series membership for Bersiri episode Works. */
  series?: SeriesMeta;
}
