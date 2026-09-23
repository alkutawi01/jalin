# PHASE_4D_3_GENERATION_ORCHESTRATION.md

**Phase:** 4D-3 — AI Generation Orchestration  
**Status:** COMPLETE  
**Date:** 2026-09-23

## Overview

Controlled AI text-generation orchestration for Jalin submissions. Generates DRAFT SUBMISSIONS only.

**No auto-publish. No auto-promotion to Work. No visuals. No Magnific. No batch generation.**

## Architecture

```
Admin UI → POST /api/admin/generate → Generation Service
                                         ↓
                                   Prompt Composer (templates + brief)
                                         ↓
                                   Provider Adapter (OpenAI / Mock)
                                         ↓
                                   Identity Handshake (Phase 4D-2)
                                         ↓
                                   DB: generation_requests (audit trail)
                                   DB: work_submissions (manuscript updated)
                                   DB: submission_contributions (AI identity)
```

## Generation Request Model

**Table:** `generation_requests` (Migration 005)

| Column | Type | Description |
|--------|------|-------------|
| id | serial PK | Request ID |
| submission_id | integer FK | Link to work_submissions |
| prompt_template_id | integer FK | Which template was used (nullable) |
| prompt_composed | text | Full composed prompt (JSON with provenance) |
| provider | text | e.g., "openai", "mock" |
| model | text | e.g., "gpt-4o", "mock-v1" |
| status | text | queued → running → succeeded / failed / cancelled |
| requested_by | text | Who triggered it |
| provider_request_id | text | Provider's request ID (if available) |
| token_input | integer | Input token count |
| token_output | integer | Output token count |
| token_total | integer | Total tokens |
| estimated_cost_cents | integer | Cost in cents (null if unknown) |
| currency | text | "usd" default |
| error_category | text | auth / rate_limit / timeout / provider_error / validation_error / unknown |
| error_message | text | Sanitized error (max 500 chars) |
| result_manuscript | text | Generated content |
| idempotency_key | text | Unique key preventing duplicate generation |
| started_at | timestamptz | When generation started |
| completed_at | timestamptz | When generation succeeded |
| failed_at | timestamptz | When generation failed |
| created_at | timestamptz | Record creation |

**Indexes:** submission_id, status, idempotency_key (UNIQUE)

## Provider Adapter Interface

**File:** `src/lib/admin/generation/adapter.ts`

```typescript
interface ProviderAdapter {
  readonly providerName: string;
  readonly supportedModels: string[];
  isConfigured(): boolean;
  generateText(request: GenerateTextRequest): Promise<GenerateTextResponse>;
  validateModel(model: string): boolean;
}
```

All provider-specific code stays behind adapters. No provider logic in API routes.

### Error Classification

| Error Pattern | Category |
|---------------|----------|
| API key, unauthorized, 401 | auth |
| Rate limit, 429 | rate_limit |
| Timeout, abort | timeout |
| Invalid, validation, 400 | validation_error |
| 500, 502, 503 | provider_error |
| Everything else | unknown |

## Provider Adapters

### OpenAI Adapter (`openai-adapter.ts`)
- Uses raw fetch (no SDK dependency)
- API key: `OPENAI_API_KEY` env var (server-side only)
- Supported models: gpt-4o, gpt-4o-mini, gpt-4-turbo, gpt-4, gpt-3.5-turbo
- 120s timeout via AbortController
- Cost stored as null (OpenAI pricing varies)

### Mock Adapter (`mock-adapter.ts`)
- Always configured
- Returns deterministic Malaysian literary content
- Zero cost
- Verification method: `test_deterministic`
- For automated tests — no real API calls

## Prompt Composition

**File:** `src/lib/admin/generation/prompt-composer.ts`

Composition order:
1. Active global editorial prompts (scope: "global")
2. Work-type/category prompts (scope: "per-type")
3. Optional submission-specific override (promptTemplateId)
4. Submission brief / requested concept

Prompt version/provenance preserved in `prompt_composed` JSON field.

## Identity Handshake Integration

Every AI-generated submission registers an AI contribution using Phase 4D-2 handshake:
- Provider family detected via `detectProviderFamily()`
- Public persona resolved via `resolvePublicPersona()`
- Runtime verification metadata stored
- Identity source: `runtime_verified` when adapter metadata supports it
- Suggested credit = persona name (NOT auto-applied as final credit)

## Admin UI

**File:** `src/app/admin/submissions/[id]/page.tsx`

Added "Penjanaan AI" section with:
- Provider selector (Mock / OpenAI)
- Model selector (per provider)
- Brief/instructions textarea
- Generate button
- Generation history table (ID, provider, model, status, tokens, time, errors)

After generation:
- Manuscript auto-loaded into the submission form
- Provider/model shown internally (not public)
- Usage/cost metadata in history table

## API Routes

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/admin/generate` | Trigger generation |
| GET | `/api/admin/generate/history?submissionId=X` | List generation requests |

## Secret Handling

- `OPENAI_API_KEY`: environment variable only
- Never in database, client bundle, logs, or API response
- Fail-closed: missing key → 503 error

## Idempotency

- Active generation lock per submission (no concurrent generation)
- Idempotency key format: `gen-{submissionId}-{provider}-{model}-{timestamp}`
- Duplicate request returns existing result (no duplicate submissions/contributions)

## Cost/Usage Tracking

- Input/output/total tokens stored when available
- Estimated cost in cents (null if provider doesn't supply reliable cost)
- Currency default: "usd"

## Public Privacy

Public APIs do NOT expose:
- Provider, model, request IDs
- Prompt bodies
- Token/cost data
- Raw errors
- Internal runtime identity

## Tests

**File:** `__tests__/generation-orchestration.test.ts`

| Test Category | Count | Status |
|---------------|-------|--------|
| Mock Adapter | 14 | ✅ PASS |
| Error Classification | 9 | ✅ PASS |
| Prompt Composition | 13 | ✅ PASS |
| Identity Handshake Integration | 13 | ✅ PASS |
| Privacy Boundary | 11 | ✅ PASS |
| Suggested Credit Boundary | 3 | ✅ PASS |
| No Auto Work Creation | 3 | ✅ PASS |
| Persona Mapping for Generation | 12 | ✅ PASS |
| OpenAI Adapter (config) | 6 | ✅ PASS |
| Idempotency Key | 1 | ✅ PASS |
| **Total** | **86** | **✅ ALL PASS** |

## Validation Results

| Check | Status |
|-------|--------|
| Tests | ✅ PASS (86/86) |
| db:schema:migrate | ✅ PASS (005_generation_requests) |
| db:verify | ✅ PASS (17/17) |
| validate-content | ✅ PASS |
| build | ✅ PASS |

## Files Added/Modified

### New Files
- `src/lib/db/migrations/005_generation_requests.ts` — migration
- `src/lib/admin/generation/adapter.ts` — provider interface
- `src/lib/admin/generation/mock-adapter.ts` — mock adapter
- `src/lib/admin/generation/openai-adapter.ts` — OpenAI adapter
- `src/lib/admin/generation/prompt-composer.ts` — prompt composition
- `src/lib/admin/generation/generation-service.ts` — orchestration service
- `src/lib/admin/generation/index.ts` — module exports
- `src/app/api/admin/generate/route.ts` — generation API
- `src/app/api/admin/generate/history/route.ts` — history API
- `__tests__/generation-orchestration.test.ts` — 86 tests
- `docs/PHASE_4D_3_GENERATION_ORCHESTRATION.md` — this document

### Modified Files
- `src/lib/db/types.ts` — added GenerationRequests table, GenerationRequestStatus, ErrorCategory types
- `scripts/db-schema-migrate.ts` — added 005_migration inline
- `scripts/db-verify.ts` — added generation_request_count check, updated table list
- `src/app/admin/submissions/[id]/page.tsx` — added generation workflow UI

## Deferred (Phase 4D-4+)

1. Submission-to-Work promotion workflow
2. Anthropic adapter
3. MiMo adapter
4. Batch generation
5. Streaming responses
6. Advanced prompt versioning
7. Cost estimation per provider
8. Generation scheduling
