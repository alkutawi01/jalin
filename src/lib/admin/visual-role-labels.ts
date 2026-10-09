/** What an image is for, in the editor's words. The list of image requests showed the stored word ("hero"); the detail page already said "Utama". */
export const VISUAL_ROLE_LABELS: Record<string, string> = {
  hero: "Utama",
  inline: "Dalam teks",
  section: "Bahagian",
  decorative: "Hiasan"
};

export function visualRoleLabel(role: string): string {
  return Object.hasOwn(VISUAL_ROLE_LABELS, role) ? VISUAL_ROLE_LABELS[role]! : role;
}
