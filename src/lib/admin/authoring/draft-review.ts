/** Admin-only saved answers. Never expose these through a content repository. */
export const DRAFT_REVIEW_KEY = "assistantDraftReview";
export interface DraftReview { text: string; issues: string[]; previous?: DraftReview[] }
export function draftReviews(metadata: Record<string, any> | null | undefined): Record<string, DraftReview> {
  const value = metadata?.[DRAFT_REVIEW_KEY];
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}
export function hasUnresolvedReview(review: DraftReview): boolean {
  return review.issues.length > 0 || (review.previous ?? []).some(hasUnresolvedReview);
}
export function withoutDraftReviews<T extends Record<string, any>>(metadata: T | undefined | null): T | undefined {
  if (!metadata) return undefined;
  if (typeof metadata !== "object" || Array.isArray(metadata)) return metadata;
  const { [DRAFT_REVIEW_KEY]: _private, ...publicMetadata } = metadata;
  return publicMetadata as T;
}
/** Only deliberate editorial validation failures are deferred; infrastructure errors still fail honestly. */
export class DraftImportProblem extends Error {}
