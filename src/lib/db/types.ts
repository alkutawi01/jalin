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

export type ContributorKind = "human" | "virtual" | "organization";

export type VisualRole = "hero" | "inline" | "section";

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
  editorial_history: ColumnType<Record<string, unknown>, string | Record<string, unknown>, string | Record<string, unknown>>;
  published_at: ColumnType<Date | null, string | Date | null, string | Date | null>;
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
  | "pending"
  | "generating"
  | "generated"
  | "approved"
  | "rejected";

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
  approval_state: string;
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
}
