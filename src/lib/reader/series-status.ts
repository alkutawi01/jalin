/** How a series' status is worded for readers; one place, so a list, a series page and an episode say the same thing. */
export const SERIES_STATUS_LABELS = {
  ongoing: "Masih diteruskan",
  completed: "Tamat"
} as const;

export type SeriesStatus = keyof typeof SERIES_STATUS_LABELS;

/** Anything that is not "completed" reads as still going on (the same rule the database layer uses). */
export function seriesStatusLabel(status: string | undefined): string {
  return status === "completed" ? SERIES_STATUS_LABELS.completed : SERIES_STATUS_LABELS.ongoing;
}
