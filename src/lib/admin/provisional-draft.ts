export interface ProvisionalDraftState {
  title: string;
  body: string | null;
  status: string;
  created_at: string | Date;
  updated_at: string | Date;
  published_at: string | Date | null;
  published_revision_id: number | string | null;
}

/** Only the exact untouched placeholder made by start-draft may be discarded silently. */
export function isUntouchedProvisionalDraft(work: ProvisionalDraftState): boolean {
  return work.status === "draft"
    && work.title === "Draf tanpa tajuk"
    && !work.body
    && !work.published_at
    && !work.published_revision_id
    && new Date(work.created_at).getTime() === new Date(work.updated_at).getTime();
}
