export type GlossaryEntry = {
  meaning: string;
  source: string;
};

export type GlossaryMap = Record<string, GlossaryEntry>;

export type WorkMetaRow = {
  label: string;
  value: string;
};

export type CharacterMeta = {
  name: string;
  role: string;
};

export type EditorialCredit = {
  role: string;
  name: string;
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
};
