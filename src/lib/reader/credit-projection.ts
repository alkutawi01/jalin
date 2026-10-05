import type { BylineCredit, EditorialCredit } from "../../components/reader/types";
import { getContributorMeta } from "../content/contributors";
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
  final_editor: "Editor",
  co_writer: "Penulis bersama",
  language_editor: "Penyemak bahasa",
  fact_checker: "Penyemak fakta",
  publication_editor: "Editor penerbitan",
  translated_by: "Penterjemah",
  translation_editor: "Penyunting terjemahan"
};

const APPROVED_LABELS = new Set(Object.values(ROLE_LABELS));

type ProjectedPerson = {
  name: string;
  href?: string;
  maya: boolean;
};

function projectRole(role: string): string | undefined {
  if (Object.prototype.hasOwnProperty.call(ROLE_LABELS, role)) {
    return ROLE_LABELS[role];
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
 * One line per person. A person with several roles on the same work is shown once, with the roles separated by commas
 * ("Penulis bersama, Penterjemah"), in the order the credits are kept and without repeating a role.
 */
export function projectEditorialCredits(credits: ContributorRef[]): EditorialCredit[] {
  const order: string[] = [];
  const byPerson = new Map<string, { name: string; roles: string[] }>();
  for (const credit of credits ?? []) {
    const label = projectRole(credit.role ?? "");
    if (!label) continue;
    const person = projectPerson(credit);
    if (!person) continue;
    const name = person.maya ? `${person.name} · Maya` : person.name;
    const key = name.trim().toLocaleLowerCase("ms");
    const entry = byPerson.get(key);
    if (!entry) {
      byPerson.set(key, { name, roles: [label] });
      order.push(key);
    } else if (!entry.roles.includes(label)) {
      entry.roles.push(label);
    }
  }
  return order.map((key) => ({ role: byPerson.get(key)!.roles.join(", "), name: byPerson.get(key)!.name }));
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
