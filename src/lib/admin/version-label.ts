/**
 * The version label of a published work, set by the date of the change (Malaysia time):
 *
 *   first publication                      v1.0
 *   changed again on the same day          patch    v1.0 -> v1.0.1 -> v1.0.2
 *   changed again on a later day           minor    v1.0.2 -> v1.1
 *   changed again in a later month         major    v1.1 -> v2.0
 *
 * "Same day" and "later month" are measured from the previous publication of that work. A label from before this rule
 * ("v3", "v0.2", "revert-v4") is read as far as it can be, and anything unreadable starts again from v1.0.
 */

export const FIRST_VERSION_LABEL = "v1.0";

/** Malaysia has no daylight saving: the calendar date is simply UTC + 8 hours. */
const MALAYSIA_OFFSET_MS = 8 * 60 * 60 * 1000;

function malaysiaDate(value: Date | string | number): { year: number; month: number; day: number } | null {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const local = new Date(date.getTime() + MALAYSIA_OFFSET_MS);
  return { year: local.getUTCFullYear(), month: local.getUTCMonth() + 1, day: local.getUTCDate() };
}

export function parseVersionLabel(label: string | null | undefined): { major: number; minor: number; patch: number } | null {
  const match = /^v?(\d+)(?:\.(\d+))?(?:\.(\d+))?$/.exec((label ?? "").trim());
  if (!match) return null;
  const major = Number(match[1]);
  // v0.x was the working label of a draft before publication, not a published version.
  if (major === 0) return null;
  return { major, minor: Number(match[2] ?? 0), patch: Number(match[3] ?? 0) };
}

export function formatVersionLabel(version: { major: number; minor: number; patch: number }): string {
  return version.patch > 0 ? `v${version.major}.${version.minor}.${version.patch}` : `v${version.major}.${version.minor}`;
}

/** The label for a work published now, given its label and publication time from the last time it was published. */
export function nextVersionLabel(previousLabel: string | null | undefined, previousPublishedAt: Date | string | null | undefined, now: Date = new Date()): string {
  const previous = parseVersionLabel(previousLabel);
  const before = previousPublishedAt ? malaysiaDate(previousPublishedAt) : null;
  const today = malaysiaDate(now);
  if (!previous || !before || !today) return FIRST_VERSION_LABEL;
  if (today.year !== before.year || today.month !== before.month) {
    return formatVersionLabel({ major: previous.major + 1, minor: 0, patch: 0 });
  }
  if (today.day !== before.day) {
    return formatVersionLabel({ major: previous.major, minor: previous.minor + 1, patch: 0 });
  }
  return formatVersionLabel({ major: previous.major, minor: previous.minor, patch: previous.patch + 1 });
}

/** What to show for a stored version: the old working label of a draft ("v0.1") reads as the first version, v1.0. */
export function displayVersion(label: string | null | undefined): string {
  const text = (label ?? "").trim();
  if (!text || /^v?0(\.|$)/i.test(text)) return FIRST_VERSION_LABEL;
  return text;
}
