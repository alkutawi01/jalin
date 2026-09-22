export type WorkType =
  | "cerpen"
  | "novela"
  | "bersiri"
  | "terjemahan"
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
}