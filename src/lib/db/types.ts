import type { ColumnType, Generated } from "kysely";

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

export type ContributorKind = "human" | "virtual" | "organization";

export type VisualRole = "hero" | "inline" | "section";

export type VisualPlace = "before" | "after";

export interface Works {
  id: string;
  slug: string;
  title: string;
  type: WorkType;
  status: WorkStatus;
  genre: string | null;
  audience: string | null;
  dek: string | null;
  body: string | null;
  reading_minutes: number | null;
  version: string;
  editorial_history: ColumnType<Record<string, unknown>, string | Record<string, unknown>, string | Record<string, unknown>>;
  published_at: ColumnType<Date | null, string | Date | null, string | Date | null>;
  updated_at: ColumnType<Date, string | Date, string | Date>;
  created_at: ColumnType<Date, string | Date, string | Date>;
}

export interface Contributors {
  slug: string;
  display_name: string;
  kind: ContributorKind;
  bio: string | null;
  disclosure: string | null;
  is_visible: boolean;
  created_at: ColumnType<Date, string | Date, string | Date>;
  updated_at: ColumnType<Date, string | Date, string | Date>;
}

export interface Credits {
  id: Generated<number>;
  work_id: string;
  contributor_slug: string | null;
  guest_name: string | null;
  role_label: string;
  byline: boolean;
  is_public: boolean;
  sort_order: number;
  created_at: ColumnType<Date, string | Date, string | Date>;
}

export interface Visuals {
  id: Generated<number>;
  work_id: string;
  role: VisualRole;
  src: string;
  alt: string | null;
  provider: string | null;
  creation_id: string | null;
  anchor: string | null;
  place: VisualPlace;
  sort_order: number;
  created_at: ColumnType<Date, string | Date, string | Date>;
}

export interface GlossaryTerms {
  id: Generated<number>;
  work_id: string;
  term: string;
  meaning: string;
  source: string;
  sort_order: number;
  created_at: ColumnType<Date, string | Date, string | Date>;
}

export interface Database {
  works: Works;
  contributors: Contributors;
  credits: Credits;
  visuals: Visuals;
  glossary_terms: GlossaryTerms;
}
