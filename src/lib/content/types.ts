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
  /** Live public contributor identity; populated by the database repository. */
  displayName?: string;
  kind?: "human" | "virtual";
}

export interface GlossaryEntry {
  term: string;
  meaning: string;
  /** Legacy only — not part of the output contract; never shown to readers. */
  source?: string;
}

export interface VisualRef {
  role?: string;
  src: string;
  alt: string;

  provider?: string;
  creationId?: string;

  anchor?: string;
  place?: "before" | "after";

  /** Which part of the image to show; absent means centred. */
  crop?: ImageCrop;
  /** Novela chapter this image belongs to. */
  sectionSlug?: string;
}

/** The point of interest (percent from left/top) and the zoom (percent, 100 = whole image). */
export interface ImageCrop {
  x: number;
  y: number;
  zoom: number;
}

export interface SourceWorkRef {
  title: string;
  author?: string;
  language?: string;
  rightsStatus?: string;
  /** Which edition the work was taken from: shown to readers as the "Tentang karya" table. */
  firstPublished?: number;
  publisher?: string;
  editionYear?: number;
  printing?: string;
  editor?: string;
  translator?: string;
  isbn?: string;
  locator?: string;
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
  /** Slug of the chapter where the character first appears (novela). Used to avoid spoilers. */
  firstAppearanceSection?: string | null;
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
  /** Illustration made for the series (not a scene from an episode). Absent until one is uploaded. */
  hero?: { src: string; alt: string };
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
    /** Where the story happens (Latar tempat): shown in the reader's right column beside the characters. */
    places?: Array<{ name: string; description?: string }>;
    fragmenTextLanguage?: string;
    /** Free-form note from the editor, shown at the end of the work (origin, what is interesting, ...). */
    editorNote?: string;
  };

  reader?: ReaderMeta;

  sourceWork?: SourceWorkRef;

  /** Internal sections for Novela (canonical when non-empty). */
  sections?: ReadingSection[];

  /** Series membership for Bersiri episode Works. */
  series?: SeriesMeta;
}
