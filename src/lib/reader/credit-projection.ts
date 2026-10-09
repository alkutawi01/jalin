import type { BylineCredit, EditorialCredit } from "../../components/reader/types";
import { getContributorMeta } from "../content/contributors";
import { isDerivativeType, isOriginalAuthorRole } from "../credit-roles";
import type { ContributorRef } from "../content/types";

/**
 * Public reader credit projection.
 *
 * The reader may only ever display:
 *   1. the original author / source of a work, and
 *   2. Jalin editorial contributors that carry an approved contributor record.
 *
 * Raw role keys, internal enum values and placeholder fallback names must
 * never reach the public reader.
 */

const ROLE_LABELS: Record<string, string> = {
  author: "Pengarang asal",
  initial_draft: "Penulis",
  story_editor: "Penulis & penyemak",
  final_editor: "Penyunting",
  co_writer: "Penulis",
  language_editor: "Penyemak bahasa",
  fact_checker: "Penyemak fakta",
  publication_editor: "Penyunting penerbitan",
  translated_by: "Penterjemah",
  translation_editor: "Penyunting terjemahan"
};

const APPROVED_LABELS = new Set(Object.values(ROLE_LABELS));

type ProjectedPerson = {
  name: string;
  href?: string;
  maya: boolean;
};

/** Credits saved earlier hold the label text itself ("Editor"), not a key: they read as the new wording too. */
const RENAMED_LABELS: Record<string, string> = { Editor: "Penyunting", "Editor penerbitan": "Penyunting penerbitan" };

export function projectRole(role: string): string | undefined {
  if (Object.prototype.hasOwnProperty.call(ROLE_LABELS, role)) {
    return ROLE_LABELS[role];
  }
  if (Object.prototype.hasOwnProperty.call(RENAMED_LABELS, role.trim())) {
    return RENAMED_LABELS[role.trim()];
  }
  if (APPROVED_LABELS.has(role)) {
    return role;
  }
  // A role an editor added in admin is stored as its own display text starting with a capital
  // (see lib/credit-roles.ts). Internal keys are lowercase snake_case and stay hidden.
  if (/^[A-Z][^_]*$/.test(role.trim())) {
    return role.trim();
  }
  return undefined;
}

function projectPerson(credit: ContributorRef): ProjectedPerson | undefined {
  const trimmed = (credit.slug ?? "").trim();
  if (!trimmed) return undefined;
  if (trimmed.startsWith("guest:")) {
    const name = trimmed.slice("guest:".length).trim();
    if (!name) return undefined;
    return { name, maya: false };
  }
  const meta = credit.displayName && credit.kind
    ? { name: credit.displayName, kind: credit.kind }
    : getContributorMeta(trimmed);
  if (!meta) return undefined;
  return { name: meta.name, href: `/penulis/${trimmed}`, maya: meta.kind === "virtual" };
}

/**
 * One entry per role: a role is written once with everyone who holds it listed under it. A person with several roles is
 * shown once, with the roles separated by commas
 * ("Penulis bersama, Penterjemah"), in the order the credits are kept and without repeating a role.
 */
export function projectEditorialCredits(credits: ContributorRef[]): EditorialCredit[] {
  const order: string[] = [];
  const byPerson = new Map<string, { name: string; roles: string[] }>();
  for (const credit of credits ?? []) {
    const projected = projectRole(credit.role ?? "");
    if (!projected) continue;
    // "Penulis bersama" is no longer chosen by hand: it is worked out below from how many writers there are.
    const label = projected === "Penulis bersama" ? "Penulis" : projected;
    const person = projectPerson(credit);
    if (!person) continue;
    const name = person.name;
    const key = name.trim().toLocaleLowerCase("ms");
    const entry = byPerson.get(key);
    if (!entry) {
      byPerson.set(key, { name, roles: [label] });
      order.push(key);
    } else if (!entry.roles.includes(label)) {
      entry.roles.push(label);
    }
  }
  // Two or more writers: each writer's "Penulis" is written "Penulis bersama".
  const writers = order.filter((key) => byPerson.get(key)!.roles.includes("Penulis"));
  if (writers.length >= 2) {
    for (const key of writers) {
      const person = byPerson.get(key)!;
      person.roles = person.roles.map((role) => (role === "Penulis" ? "Penulis bersama" : role));
    }
  }
  // Then everyone with the same roles shares one entry: the role is written once and the names listed under it.
  const byRoles = new Map<string, EditorialCredit>();
  for (const key of order) {
    const person = byPerson.get(key)!;
    const roles = person.roles.join(", ");
    const entry = byRoles.get(roles);
    if (entry) entry.names.push(person.name);
    else byRoles.set(roles, { role: roles, names: [person.name] });
  }
  return [...byRoles.values()];
}

export function projectBylineCredits(credits: ContributorRef[]): BylineCredit[] {
  const projected: BylineCredit[] = [];
  for (const credit of credits ?? []) {
    if (!credit.byline) continue;
    const person = projectPerson(credit);
    if (!person) continue;
    projected.push({ name: person.name, href: person.href, maya: person.maya });
  }
  return projected;
}

/**
 * The name under the title of a story page.
 * Sinopsis and fragmen: only the author of the original work, from the source record, whatever the credits' own flags say
 * (their credits are for the people who made Jalin's text, shown in the editorial block). If the source record has no author,
 * the public credit that names the original author stands in. Every other type: the credits ticked "Nama di bawah tajuk".
 */
export function bylineFor(work: { type: string; credits: ContributorRef[]; sourceWork?: { author?: string } }): BylineCredit[] {
  if (!isDerivativeType(work.type)) return projectBylineCredits(work.credits);
  const author = work.sourceWork?.author?.trim();
  if (author) return [{ name: author, maya: false }];
  return projectBylineCredits((work.credits ?? []).filter((credit) => isOriginalAuthorRole(credit.role)).map((credit) => ({ ...credit, byline: true })));
}

export const VIRTUAL_WRITER_NOTE = "Penulis Maya bekerja di bawah kawal selia editorial manusia.";

/** True when at least one public credit on the work belongs to a virtual (Maya) contributor. */
export function hasVirtualCredit(credits: ContributorRef[]): boolean {
  return (credits ?? []).some((credit) => {
    if (!projectRole(credit.role ?? "")) return false;
    return projectPerson(credit)?.maya === true;
  });
}

/**
 * The note shown in the "Tentang karya" card: only one the editor wrote. The standard Maya sentence is no
 * longer printed on every work; a Maya is still marked beside her name in the byline and on her author page.
 */
export function disclosureNoteFor(work: { credits: ContributorRef[]; reader?: { note?: string } }): string | undefined {
  return work.reader?.note || undefined;
}
