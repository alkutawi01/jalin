# PHASE_4D_1_SUBMISSION_MODEL.md

**Phase:** 4D-1 — Submission Data Model & Editorial Queue  
**Status:** COMPLETE  
**Date:** 2026-09-23

## Overview

Backend foundation for AI/human story submissions without enabling automated generation or automated publishing.

## Schema Migration

**Migration:** `004_submission_data_model`  
**Applied:** 2026-09-23  
**Tables Added:** 4

### work_submissions

| Column | Type | Notes |
|--------|------|-------|
| id | serial PK | Auto-increment |
| proposed_type | text | nullable, WorkType |
| proposed_title | text | nullable |
| proposed_slug | text | nullable |
| manuscript | text | nullable, full text body |
| dek | text | nullable, synopsis/blurb |
| status | text | NOT NULL, default "draft" |
| submitter_type | text | NOT NULL, default "human" |
| created_at | timestamptz | NOT NULL |
| updated_at | timestamptz | NOT NULL |
| reviewed_at | timestamptz | nullable |
| reviewer_notes | text | nullable |
| result_work_id | text | nullable, FK to works.id |

**Statuses:** draft → submitted → under_review → changes_requested → approved / rejected → published  
**Submitter types:** human, ai, guest

### submission_contributions

| Column | Type | Notes |
|--------|------|-------|
| id | serial PK | Auto-increment |
| submission_id | integer | NOT NULL, FK → work_submissions.id |
| contributor_slug | text | nullable, FK → contributors.slug |
| guest_name | text | nullable |
| role_key | text | nullable |
| role_label | text | NOT NULL, default "" |
| sort_order | integer | NOT NULL, default 0 |
| suggested_public_credit | text | nullable |
| ai_provider | text | nullable, INTERNAL ONLY |
| ai_model | text | nullable, INTERNAL ONLY |
| ai_persona | text | nullable, INTERNAL ONLY |
| ai_actual_role | text | nullable, INTERNAL ONLY |
| ai_identity_source | text | NOT NULL, default "unknown" |
| created_at | timestamptz | NOT NULL |

**Identity source values:** runtime_verified, self_reported, manual, unknown

### prompt_templates

| Column | Type | Notes |
|--------|------|-------|
| id | serial PK | Auto-increment |
| name | text | NOT NULL |
| prompt_text | text | NOT NULL |
| scope | text | NOT NULL, default "global" |
| work_type | text | nullable |
| work_id | text | nullable |
| version | integer | NOT NULL, default 1 |
| status | text | NOT NULL, default "active" |
| created_at | timestamptz | NOT NULL |
| updated_at | timestamptz | NOT NULL |

**Scopes:** global, category, work  
**Status values:** active, inactive

### visual_requests

| Column | Type | Notes |
|--------|------|-------|
| id | serial PK | Auto-increment |
| work_id | text | nullable |
| submission_id | integer | nullable |
| visual_role | text | NOT NULL, default "inline" |
| prompt | text | NOT NULL |
| provider | text | NOT NULL, default "magnific" |
| provider_request_id | text | nullable |
| provider_creation_id | text | nullable |
| status | text | NOT NULL, default "pending" |
| source_asset_url | text | nullable |
| source_asset_path | text | nullable |
| alt_text | text | nullable |
| anchor | text | nullable |
| place | text | NOT NULL, default "after" |
| approval_state | text | NOT NULL, default "pending" |
| created_at | timestamptz | NOT NULL |
| updated_at | timestamptz | NOT NULL |

**Provider required:** magnific (for Jalin-generated visuals)

## API Routes

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/admin/submissions` | List all submissions |
| POST | `/api/admin/submissions` | Create submission |
| GET | `/api/admin/submissions/[id]` | Get submission |
| PATCH | `/api/admin/submissions/[id]` | Update submission |
| DELETE | `/api/admin/submissions/[id]` | Delete submission (cascades contributions) |
| GET | `/api/admin/contributions?submissionId=X` | List contributions for submission |
| POST | `/api/admin/contributions` | Create contribution |
| GET | `/api/admin/contributions/[id]` | Get contribution |
| PATCH | `/api/admin/contributions/[id]` | Update contribution |
| DELETE | `/api/admin/contributions/[id]` | Delete contribution |
| GET | `/api/admin/prompts` | List prompt templates |
| POST | `/api/admin/prompts` | Create prompt template |
| GET | `/api/admin/prompts/[id]` | Get prompt template |
| PATCH | `/api/admin/prompts/[id]` | Update prompt template |
| DELETE | `/api/admin/prompts/[id]` | Delete prompt template |
| GET | `/api/admin/visual-requests` | List visual requests |
| POST | `/api/admin/visual-requests` | Create visual request |
| GET | `/api/admin/visual-requests/[id]` | Get visual request |
| PATCH | `/api/admin/visual-requests/[id]` | Update visual request |
| DELETE | `/api/admin/visual-requests/[id]` | Delete visual request |

## Admin UI Pages

| Page | Type | Description |
|------|------|-------------|
| `/admin/submissions` | Server | Submissions list |
| `/admin/submissions/[id]` | Client | Submission detail + contributions editor |
| `/admin/submissions/new` | Client | Create new submission |
| `/admin/prompts` | Server | Prompt templates list |
| `/admin/prompts/[id]` | Client | Prompt template detail |
| `/admin/prompts/new` | Client | Create new prompt template |
| `/admin/visual-requests` | Server | Visual requests list |
| `/admin/visual-requests/[id]` | Client | Visual request detail |
| `/admin/visual-requests/new` | Client | Create new visual request |

## Privacy Boundary

### Public-facing (NEVER exposed)
- `ai_provider` — internal tool identity
- `ai_model` — internal model identity
- `ai_actual_role` — internal technical role
- `ai_identity_source` — internal verification state
- Prompt template internal content (unless explicitly published)

### Admin-only (protected by auth)
- All submission metadata and manuscript content
- Reviewer notes and internal decisions
- AI identity fields
- Visual request internals

### Sanitized public APIs
- No submission data exposed in public routes
- No AI identity exposed in contributor pages
- Contributor disclosure only shows persona name, not provider/model

## Workflow States

### Submission Lifecycle
```
draft → submitted → under_review → approved → published
                           ↓
                   changes_requested → submitted (loop)
                           ↓
                       rejected (terminal)
```

### Approval does NOT auto-publish
- Approved submissions must be manually linked to a work via `result_work_id`
- Publishing follows existing Phase 4C workflow

## Deferred Items (Phase 4D-2+)

1. **Generation orchestration** — AI story generation from prompt templates
2. **Magnific integration** — actual visual generation pipeline
3. **Submission-to-work promotion** — automated workflow from approved submission to published work
4. **Visual request provider callbacks** — status updates from Magnific API
5. **Batch operations** — bulk approve/reject
6. **Submission versioning** — track manuscript revisions
7. **Email notifications** — submission status change notifications
8. **Public submission portal** — non-admin submission interface

## Testing Results

| Check | Status |
|-------|--------|
| Schema migration | ✅ PASS (004_submission_data_model) |
| Migration repeatability | ✅ PASS (idempotent) |
| db:verify | ✅ PASS (16/16 checks) |
| validate-content | ✅ PASS |
| build | ✅ PASS |
