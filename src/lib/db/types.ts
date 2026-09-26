import type { ColumnType, Generated } from "kysely";

export type WorkType =
  | "cerpen"
  | "novela"
  | "bersiri"
  | "terjemahan"
  | "fragmen"
  | "sinopsis";

export type WorkStatus =
  | "draft"
  | "review"
  | "ready"
  | "published"
  | "archived";

export type RightsStatus =
  | "unknown"
  | "needs_review"
  | "public_domain"
  | "licensed"
  | "permission_obtained"
  | "restricted"
  | "rejected";

export type ContributorKind = "human" | "virtual" | "organization";

export type VisualRole = "hero" | "inline" | "section" | "decorative";

export type VisualPlace = "before" | "after";

export interface Works {
  id: string;
  slug: string;
  title: string;
  type: WorkType;
  status: WorkStatus;
  genre: string | null;
  audience: string | null;
  dek: string | null;
  body: string | null;
  reading_minutes: number | null;
  version: string;
  version_label: string | null;
  revision_count: number;
  editorial_history: ColumnType<Record<string, unknown>, string | Record<string, unknown>, string | Record<string, unknown>>;
  metadata: ColumnType<Record<string, unknown> | null, string | null | Record<string, unknown>, string | null | Record<string, unknown>>;
  reader: ColumnType<Record<string, unknown> | null, string | null | Record<string, unknown>, string | null | Record<string, unknown>>;
  published_at: ColumnType<Date | null, string | Date | null, string | Date | null>;
  published_by: string | null;
  first_published_at: ColumnType<Date | null, string | Date | null, string | Date | null>;
  published_revision_id: string | null;
  updated_at: ColumnType<Date, string | Date, string | Date>;
  created_at: ColumnType<Date, string | Date, string | Date>;
}

export interface Contributors {
  slug: string;
  display_name: string;
  kind: ContributorKind;
  bio: string | null;
  disclosure: string | null;
  is_visible: boolean;
  created_at: ColumnType<Date, string | Date, string | Date>;
  updated_at: ColumnType<Date, string | Date, string | Date>;
}

export interface Credits {
  id: Generated<number>;
  work_id: string;
  contributor_slug: string | null;
  guest_name: string | null;
  role_label: string;
  byline: boolean;
  is_public: boolean;
  sort_order: number;
  created_at: ColumnType<Date, string | Date, string | Date>;
}

export interface Visuals {
  id: Generated<number>;
  work_id: string;
  role: VisualRole;
  src: string;
  alt: string | null;
  provider: string | null;
  creation_id: string | null;
  anchor: string | null;
  place: VisualPlace;
  sort_order: number;
  is_asset_finalized: boolean;
  created_at: ColumnType<Date, string | Date, string | Date>;
}

export interface GlossaryTerms {
  id: Generated<number>;
  work_id: string;
  term: string;
  meaning: string;
  source: string;
  sort_order: number;
  created_at: ColumnType<Date, string | Date, string | Date>;
}

export type SubmissionStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "changes_requested"
  | "approved"
  | "rejected"
  | "published";

export type SubmitterType = "human" | "ai" | "guest";

export interface WorkSubmissions {
  id: Generated<number>;
  proposed_type: WorkType | null;
  proposed_title: string | null;
  proposed_slug: string | null;
  manuscript: string | null;
  dek: string | null;
  status: SubmissionStatus;
  submitter_type: SubmitterType;
  created_at: ColumnType<Date, string | Date, string | Date>;
  updated_at: ColumnType<Date, string | Date, string | Date>;
  reviewed_at: ColumnType<Date | null, string | Date | null, string | Date | null>;
  reviewer_notes: string | null;
  result_work_id: string | null;
  promoted_at: ColumnType<Date | null, string | Date | null, string | Date | null>;
}

export type IdentitySource =
  | "runtime_verified"
  | "self_reported"
  | "manual"
  | "unknown";

export interface SubmissionContributions {
  id: Generated<number>;
  submission_id: number;
  contributor_slug: string | null;
  guest_name: string | null;
  role_key: string | null;
  role_label: string;
  sort_order: number;
  suggested_public_credit: string | null;
  ai_provider: string | null;
  ai_model: string | null;
  ai_persona: string | null;
  ai_actual_role: string | null;
  ai_identity_source: IdentitySource;
  created_at: ColumnType<Date, string | Date, string | Date>;
}

export type PromptStatus = "active" | "inactive";

export interface PromptTemplates {
  id: Generated<number>;
  name: string;
  prompt_text: string;
  scope: string;
  work_type: WorkType | null;
  work_id: string | null;
  version: number;
  status: PromptStatus;
  created_at: ColumnType<Date, string | Date, string | Date>;
  updated_at: ColumnType<Date, string | Date, string | Date>;
}

export type VisualRequestStatus =
  | "draft"
  | "queued"
  | "generating"
  | "generated"
  | "failed"
  | "under_review"
  | "approved"
  | "rejected"
  | "attached";

export type ApprovalState = "pending" | "approved" | "rejected";

export type VisualExecutionMode = "magnific_api" | "magnific_connector";

export type AspectRatio = "1:1" | "3:2" | "2:3" | "16:9" | "9:16" | "4:3" | "3:4";

export interface VisualAttemptEntry {
  at: string;
  mode: VisualExecutionMode | "poll" | "webhook";
  taskId?: string | null;
  status?: string;
  webhookId?: string;
  errorCategory?: string | null;
  note?: string;
}

export interface VisualRequests {
  id: Generated<number>;
  work_id: string | null;
  submission_id: number | null;
  visual_role: VisualRole;
  prompt: string;
  provider: string;
  provider_request_id: string | null;
  provider_creation_id: string | null;
  status: VisualRequestStatus;
  source_asset_url: string | null;
  source_asset_path: string | null;
  alt_text: string | null;
  anchor: string | null;
  place: VisualPlace;
  approval_state: ApprovalState;
  requested_by: string;
  approved_by: string | null;
  error_category: ErrorCategory | null;
  error_message: string | null;
  retry_count: number;
  idempotency_key: string | null;
  aspect_ratio: AspectRatio;
  model: string | null;
  prompt_composed: string | null;
  asset_width: number | null;
  asset_height: number | null;
  asset_mime_type: string | null;
  asset_finalized: boolean;
  execution_mode: VisualExecutionMode | null;
  /** JSON-serialized attempt chronology (text column). */
  attempt_history: string | null;
  last_webhook_id: string | null;
  started_at: ColumnType<Date | null, string | Date | null, string | Date | null>;
  completed_at: ColumnType<Date | null, string | Date | null, string | Date | null>;
  approved_at: ColumnType<Date | null, string | Date | null, string | Date | null>;
  rejected_at: ColumnType<Date | null, string | Date | null, string | Date | null>;
  failed_at: ColumnType<Date | null, string | Date | null, string | Date | null>;
  created_at: ColumnType<Date, string | Date, string | Date>;
  updated_at: ColumnType<Date, string | Date, string | Date>;
}

export type GenerationRequestStatus =
  | "queued"
  | "running"
  | "succeeded"
  | "failed"
  | "cancelled";

export type ErrorCategory =
  | "auth"
  | "rate_limit"
  | "timeout"
  | "provider_error"
  | "webhook_signature_error"
  | "validation_error"
  | "unknown";

export interface GenerationRequests {
  id: Generated<number>;
  submission_id: number;
  prompt_template_id: number | null;
  prompt_composed: string;
  provider: string;
  model: string;
  status: GenerationRequestStatus;
  requested_by: string;
  provider_request_id: string | null;
  token_input: number | null;
  token_output: number | null;
  token_total: number | null;
  estimated_cost_cents: number | null;
  currency: string;
  error_category: ErrorCategory | null;
  error_message: string | null;
  result_manuscript: string | null;
  idempotency_key: string;
  started_at: ColumnType<Date | null, string | Date | null, string | Date | null>;
  completed_at: ColumnType<Date | null, string | Date | null, string | Date | null>;
  failed_at: ColumnType<Date | null, string | Date | null, string | Date | null>;
  created_at: ColumnType<Date, string | Date, string | Date>;
}

export interface SourceWorks {
  id: Generated<number>;
  work_id: string;
  original_title: string | null;
  author: string | null;
  original_language: string | null;
  publication_year: number | null;
  source_edition: string | null;
  source_url: string | null;
  source_locator: string | null;
  source_text_basis: string | null;
  rights_status: RightsStatus | string;
  rights_notes: string | null;
  rights_evidence: string | null;
  rights_history: string | null;
  approved_material_hash: string | null;
  reviewed_at: ColumnType<Date | null, string | Date | null, string | Date | null>;
  reviewed_by: string | null;
  created_at: ColumnType<Date, string | Date, string | Date>;
  updated_at: ColumnType<Date, string | Date, string | Date>;
}

export type ChangeType = "major" | "minor" | "patch";

export interface WorkRevisions {
  id: string;
  work_id: string;
  revision_no: number;
  version_label: string | null;
  change_type: ChangeType;
  revision_summary: string | null;
  snapshot: ColumnType<Record<string, unknown>, string | Record<string, unknown>, string | Record<string, unknown>>;
  content_hash: string;
  published_by: string;
  published_at: ColumnType<Date, string | Date, string | Date>;
  first_published_at: ColumnType<Date | null, string | Date | null, string | Date | null>;
  created_at: ColumnType<Date, string | Date, string | Date>;
}

export type SeriesMode = "continuous" | "anthology";
export type SeriesStatus = "ongoing" | "completed";

export interface ReadingSections {
  id: Generated<number>;
  work_id: string;
  slug: string;
  title: string | null;
  position: number;
  body: string;
  reading_minutes: number | null;
  created_at: ColumnType<Date, string | Date, string | Date>;
  updated_at: ColumnType<Date, string | Date, string | Date>;
}

export interface Series {
  id: string;
  slug: string;
  title: string;
  dek: string | null;
  genre: string | null;
  audience: string | null;
  mode: SeriesMode | string;
  status: SeriesStatus | string;
  created_at: ColumnType<Date, string | Date, string | Date>;
  updated_at: ColumnType<Date, string | Date, string | Date>;
}

export interface SeriesEntries {
  id: Generated<number>;
  series_id: string;
  work_id: string;
  position: number;
  created_at: ColumnType<Date, string | Date, string | Date>;
  updated_at: ColumnType<Date, string | Date, string | Date>;
}

export interface EditorialAuditRuns {
  id: string;
  generated_at: ColumnType<Date, string | Date, string | Date>;
  summary_json: string;
  issues_json: string;
  created_by: string | null;
  created_at: ColumnType<Date, string | Date, string | Date>;
}

export interface EditorialIssues {
  id: string;
  type: string;
  work_id: string | null;
  severity: string;
  status: string;
  message: string;
  created_at: ColumnType<Date, string | Date, string | Date>;
  resolved_at: ColumnType<Date | null, string | Date | null, string | Date | null>;
}

export interface EditorialIssueEvents {
  id: string;
  issue_id: string;
  action: string;
  from_status: string | null;
  to_status: string;
  actor: string | null;
  metadata_json: string | null;
  created_at: ColumnType<Date, string | Date, string | Date>;
}

export interface EditorialRoles {
  id: string;
  name: string;
  description: string | null;
  permissions_json: string;
  created_at: ColumnType<Date, string | Date, string | Date>;
}

export interface Database {
  works: Works;
  contributors: Contributors;
  credits: Credits;
  visuals: Visuals;
  glossary_terms: GlossaryTerms;
  work_submissions: WorkSubmissions;
  submission_contributions: SubmissionContributions;
  prompt_templates: PromptTemplates;
  visual_requests: VisualRequests;
  generation_requests: GenerationRequests;
  source_works: SourceWorks;
  reading_sections: ReadingSections;
  series: Series;
  series_entries: SeriesEntries;
  work_revisions: WorkRevisions;
  editorial_audit_runs: EditorialAuditRuns;
  editorial_issues: EditorialIssues;
  editorial_issue_events: EditorialIssueEvents;
  editorial_roles: EditorialRoles;
}
