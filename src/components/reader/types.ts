export type GlossaryEntry = {
  meaning: string;
  /** The term as the editor wrote it, with *italic* marks; set only when it differs from the plain key. */
  termDisplay?: string;
};

export type GlossaryMap = Record<string, GlossaryEntry>;

export type WorkMetaRow = {
  label: string;
  value: string;
  /** The value is the title of a work (taken from elsewhere), so it is set in italics. */
  italic?: boolean;
};

export type CharacterMeta = {
  name: string;
  role: string;
};

/** A place the story happens in (Latar tempat): a name and, if the editor wrote one, a few words about it. */
export type PlaceMeta = {
  name: string;
  description?: string;
};

/** One role (or set of roles) and everyone who holds it, so a role is written once with all its names under it. */
export type EditorialCredit = {
  role: string;
  names: string[];
};

export type BylineCredit = {
  name: string;
  href?: string;
  maya?: boolean;
};

export type StoryInfoData = {
  work: WorkMetaRow[];
  characters: CharacterMeta[];
  editorial: EditorialCredit[];
  note?: string;
  /** Daftar bab untuk drawer mobile (novela sahaja). */
  bab?: { label: string; href: string }[];
};
