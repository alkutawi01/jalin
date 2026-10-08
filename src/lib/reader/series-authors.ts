import type { ContributorRef } from "../content/types";
import { projectBylineCredits } from "./credit-projection";

/**
 * The names under a series' title: everyone with a name under the title on any published episode, in the order the episodes are read
 * and the credits are kept, each once. The series page and the homepage's Bersiri block show the same line.
 */
export function seriesAuthorNames(episodesCredits: Array<ContributorRef[] | undefined>): string[] {
  const names: string[] = [];
  for (const credits of episodesCredits) {
    for (const person of projectBylineCredits(credits ?? [])) {
      if (!names.includes(person.name)) names.push(person.name);
    }
  }
  return names;
}
