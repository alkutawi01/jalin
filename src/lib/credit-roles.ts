/**
 * Credit roles offered in the admin dropdown.
 *
 * `value` is what is stored in credits.role_label. The five standard roles use
 * internal keys (the reader maps them to public labels in credit-projection.ts).
 * A role an editor adds is stored as its own display text, starting with a
 * capital letter; that is how the reader tells it apart from an internal key.
 */

export const STANDARD_ROLES: { value: string; label: string }[] = [
  // One "Penulis" only: the reader writes "Penulis bersama" by itself when two or more people hold it (reader/credit-projection.ts).
  { value: "initial_draft", label: "Penulis" },
  { value: "story_editor", label: "Penulis & penyemak" },
  { value: "final_editor", label: "Penyunting" },
  { value: "author", label: "Pengarang asal" }
];

/**
 * Roles always offered besides the standard ones and those editors added earlier, so a common role need not be typed as a
 * "+ Peranan baharu" the first time. Stored as its own text, like any role an editor adds; the reader shows it as written.
 */
export const SUGGESTED_ROLES: string[] = ["Pembantu"];

/**
 * Whether "Nama di bawah tajuk" starts ticked for this role. The people who wrote the text are named under the title; a helper,
 * editor or fact-checker is credited at the end of the work only (AGENTS.md rule 23), so those start unticked. An editor can still
 * change the tick either way; this is only the starting value, and it never overrides a tick the editor has already set.
 */
export function bylineByDefault(role: string | null | undefined): boolean {
  const canonical = canonicalRole(String(role ?? ""));
  return canonical === "initial_draft" || canonical === "story_editor";
}

/** Older credits stored "co_writer" or the text "Penulis bersama"; both now mean plain "Penulis". */
export function canonicalRole(value: string): string {
  const text = (value ?? "").trim();
  return text === "co_writer" || text === "Penulis bersama" ? "initial_draft" : value;
}

export function roleDisplay(value: string): string {
  const canonical = canonicalRole(value);
  return STANDARD_ROLES.find((role) => role.value === canonical)?.label ?? value;
}

/**
 * Sinopsis and fragmen are only ever taken from a real work (a novel) that was already published elsewhere; they are never first
 * published in Jalin. So the name under their title is the original author, shown automatically from the source record (the
 * "Sumber" tab), and "Nama di bawah tajuk" does not apply to any credit of these two types.
 */
export const DERIVATIVE_TYPES = ["sinopsis", "fragmen"] as const;

export function isDerivativeType(type: string | null | undefined): boolean {
  return (DERIVATIVE_TYPES as readonly string[]).includes(String(type ?? ""));
}

/** The credit that names the author of the original work ("Pengarang asal", stored as "author"). */
export function isOriginalAuthorRole(role: string | null | undefined): boolean {
  const text = String(role ?? "").trim();
  return text.toLowerCase() === "author" || text === "Pengarang asal";
}

/**
 * "Idea asal" names who first had the idea of a story. A sinopsis or a fragmen is taken from a work that someone else wrote and published
 * elsewhere, so no one at Jalin holds that role (Izzat, 8 Okt, after five published fragmen showed it). Only this role is refused for now.
 */
export function isOriginalIdeaRole(role: string | null | undefined): boolean {
  return String(role ?? "").trim().replace(/\s+/g, " ").toLowerCase() === "idea asal";
}

/** A Malay message when this role may not be given to a credit of this type of work; null when it may. */
export function roleNotAllowed(type: string | null | undefined, role: string | null | undefined): string | null {
  if (isDerivativeType(type) && isOriginalIdeaRole(role)) {
    return `Peranan "Idea asal" tidak digunakan untuk ${String(type)}: karya ini diambil daripada karya pengarang asal yang sudah diterbitkan di tempat lain. Pilih peranan lain atau buang kredit ini.`;
  }
  return null;
}

/** A custom role always starts with a capital so it is never mistaken for an internal key. */
export function normaliseCustomRole(input: string): string {
  const text = input.trim().replace(/\s+/g, " ");
  if (!text) return "";
  return text.charAt(0).toUpperCase() + text.slice(1);
}
