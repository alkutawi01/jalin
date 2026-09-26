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
  co_writer: "Penulis bersama"
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
  return undefined;
}

function projectPerson(slug: string): ProjectedPerson | undefined {
  const trimmed = slug.trim();
  if (!trimmed) return undefined;
  if (trimmed.startsWith("guest:")) {
    const name = trimmed.slice("guest:".length).trim();
    if (!name) return undefined;
    return { name, maya: false };
  }
  const meta = getContributorMeta(trimmed);
  if (!meta) return undefined;
  return { name: meta.name, href: `/penulis/${trimmed}`, maya: meta.kind === "virtual" };
}

export function projectEditorialCredits(credits: ContributorRef[]): EditorialCredit[] {
  const projected: EditorialCredit[] = [];
  for (const credit of credits ?? []) {
    const label = projectRole(credit.role ?? "");
    if (!label) continue;
    const person = projectPerson(credit.slug ?? "");
    if (!person) continue;
    projected.push({
      role: label,
      name: person.maya ? `${person.name} · Maya` : person.name
    });
  }
  return projected;
}

export function projectBylineCredits(credits: ContributorRef[]): BylineCredit[] {
  const projected: BylineCredit[] = [];
  for (const credit of credits ?? []) {
    if (!credit.byline) continue;
    const person = projectPerson(credit.slug ?? "");
    if (!person) continue;
    projected.push({ name: person.name, href: person.href, maya: person.maya });
  }
  return projected;
}
