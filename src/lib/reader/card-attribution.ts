import type { Work } from "../content/types";
import { projectBylineCredits } from "./credit-projection";
import { isDerivativeType } from "../credit-roles";

export interface CardAttribution {
  primary: string;
  secondary?: string;
}

const WRITING_ROLES = new Set([
  "author", "initial_draft", "co_writer", "Penulis", "Penulis bersama",
]);

function creditedWriters(work: Work): string[] {
  // Sinopsis and fragmen name the original work and its author (below); the name under their title is never a Jalin writer.
  if (isDerivativeType(work.type)) return [];
  const writers = (work.credits ?? []).filter(
    (credit) => credit.byline && WRITING_ROLES.has(credit.role)
  );
  return [...new Set(projectBylineCredits(writers).map((person) => person.name))];
}

/** Reader-safe, role-aware card copy. Never expose raw credit or rights metadata. */
export function projectCardAttribution(work: Work): CardAttribution | undefined {
  const sourceTitle = work.sourceWork?.title?.trim();
  const sourceAuthor = work.sourceWork?.author?.trim();
  const writers = creditedWriters(work);

  if (work.type === "fragmen") {
    if (sourceTitle && sourceAuthor) return { primary: `Petikan daripada ${sourceTitle} · ${sourceAuthor}` };
    if (sourceTitle) return { primary: `Petikan daripada ${sourceTitle}` };
    if (sourceAuthor) return { primary: `Petikan karya ${sourceAuthor}` };
    return writers.length ? { primary: `Petikan karya ${writers.join(", ")}` } : undefined;
  }

  if (work.type === "sinopsis") {
    const secondary = sourceTitle
      ? `Berdasarkan ${sourceTitle}${sourceAuthor ? ` karya ${sourceAuthor}` : ""}`
      : sourceAuthor ? `Berdasarkan karya ${sourceAuthor}` : undefined;
    if (writers.length) return { primary: `Sinopsis oleh ${writers.join(", ")}`, ...(secondary ? { secondary } : {}) };
    return secondary ? { primary: secondary } : undefined;
  }

  return writers.length ? { primary: `Oleh ${writers.join(", ")}` } : undefined;
}
