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
}

export interface GlossaryEntry {
  term: string;
  definition: string;
}

export interface VisualRef {
  src: string;
  alt: string;

  provider?: string;
  creationId?: string;
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

export interface Work {
  id: string;
  slug: string;
  title: string;

  type: WorkType;
  status: WorkStatus;

  genre?: string;

  publishedAt?: string;
  updatedAt?: string;

  version: string;

  body: string;

  credits: ContributorRef[];

  visuals: VisualRef[];

  glossary: GlossaryEntry[];

  editorialHistory: EditorialRevision[];

  sourceWork?: SourceWorkRef;
}