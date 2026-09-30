/**
 * Credit roles offered in the admin dropdown.
 *
 * `value` is what is stored in credits.role_label. The five standard roles use
 * internal keys (the reader maps them to public labels in credit-projection.ts).
 * A role an editor adds is stored as its own display text, starting with a
 * capital letter; that is how the reader tells it apart from an internal key.
 */

export const STANDARD_ROLES: { value: string; label: string }[] = [
  { value: "initial_draft", label: "Penulis" },
  { value: "co_writer", label: "Penulis bersama" },
  { value: "story_editor", label: "Penulis & penyemak" },
  { value: "final_editor", label: "Editor" },
  { value: "author", label: "Pengarang asal" }
];

export function roleDisplay(value: string): string {
  return STANDARD_ROLES.find((role) => role.value === value)?.label ?? value;
}

/** A custom role always starts with a capital so it is never mistaken for an internal key. */
export function normaliseCustomRole(input: string): string {
  const text = input.trim().replace(/\s+/g, " ");
  if (!text) return "";
  return text.charAt(0).toUpperCase() + text.slice(1);
}
