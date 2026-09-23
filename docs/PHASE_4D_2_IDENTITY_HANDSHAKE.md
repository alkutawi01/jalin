# PHASE_4D_2_IDENTITY_HANDSHAKE.md

**Phase:** 4D-2 — AI Identity Handshake & Contribution Provenance  
**Status:** COMPLETE  
**Date:** 2026-09-23

## Overview

Identity/provenance layer for AI-assisted submissions. Implemented BEFORE any generation orchestration is enabled.

**No generation providers have been invoked. No stories generated. No Magnific calls.**

## Canonical Persona Mapping

| Provider Family | Public Persona | Actual Role |
|----------------|---------------|-------------|
| OpenAI/ChatGPT | Rafiq Naim | draft_writer |
| Anthropic/Claude | Nara Zahin | draft_writer |
| MiMo/OpenCode | Amir Syafiq | draft_writer |
| Human owner/editor | Izzat Anas | editor_in_chief |
| Unknown | _(no persona)_ | _(none)_ |

**File:** `src/lib/admin/persona-mapping.ts`

### Key Functions
- `detectProviderFamily(provider)` → maps provider string to canonical family
- `resolvePublicPersona(provider)` → returns public persona (empty for unknown)
- `hasKnownPersona(provider)` → boolean check
- `isValidPublicPersona(persona)` → rejects provider/model keywords
- `listPersonaMappings()` → admin inspection of all mappings

### Safety Rules
- Unknown providers get NO automatic persona (empty string)
- Invalid personas (containing "openai", "gpt-4", etc.) are silently cleared
- Admin can override/correct persona manually
- Manual correction is auditable via identity source field

## Identity Handshake Contract

**File:** `src/lib/admin/identity-handshake.ts`

### Handshake Payload
```typescript
{
  provider: string;           // e.g., "openai", "anthropic"
  model: string;              // e.g., "gpt-4", "claude-sonnet-4-20250514"
  publicPersona?: string;     // optional override (e.g., "Rafiq Naim")
  actualRole: string;         // e.g., "draft_writer", "editor"
  identitySource: IdentitySource;  // runtime_verified | self_reported | manual | unknown
  runtimeVerification?: {
    verifiedAt: string;
    verificationMethod: string;
    confidence: number;       // 0.0 - 1.0
    notes?: string;
  };
}
```

### Validation Rules
1. `provider` — required, non-empty
2. `model` — required, non-empty
3. `actualRole` — required, non-empty
4. `identitySource` — must be one of: runtime_verified, self_reported, manual, unknown
5. `publicPersona` — if provided, must not contain provider/model keywords
6. `runtimeVerification` — if provided, requires verifiedAt, verificationMethod, confidence (0-1)

### Provider-Agnostic Design
- System accepts ANY provider string
- Unknown providers are handled safely (no false persona assignment)
- No provider-specific logic outside persona-mapping.ts
- Ready for Phase 4D-3 generation orchestration

## Privacy Boundary

### Internal-Only Fields (NEVER exposed publicly)
- `ai_provider` — tool identity
- `ai_model` — model identity
- `ai_persona` — public persona (admin-controlled)
- `ai_actual_role` — internal technical role
- `ai_identity_source` — verification state
- `runtime_verification` — verification metadata

### Public Projection
```typescript
{
  contributorSlug: string | null;
  guestName: string | null;
  roleKey: string | null;
  roleLabel: string;
  sortOrder: number;
  suggestedPublicCredit: string | null;
}
```

### Projection Functions
- `toPublicProjection(contribution)` → strips ALL internal fields
- `toAdminProjection(contribution)` → includes ALL fields (admin-only)
- `verifyPrivacyBoundary(projection)` → runtime check for field leakage

### Public API
`GET /api/public/contributions?submissionId=X` — returns ONLY public projections with runtime privacy verification.

## Suggested Credit ≠ Final Credit

**Boundary enforced.** Submission contributions suggest credits but do NOT automatically become final Work credits.

```
Submission Contribution (suggested_public_credit)
    ↓
    ✗ NOT auto-applied to Work
    ↓
Admin explicitly confirms credits during
submission-to-Work promotion workflow
    ↓
Work Credit (final)
```

**Constant:** `SUGGESTED_CREDIT_BOUNDARY.enforced = true`

## Admin UI Changes

### Submission Detail — Contribution Editor
- **Public Identity section** (green): persona, public role, suggested credit
- **Internal Identity section** (red): provider, model, actual role, identity source
- Clear visual separation between public-facing and internal fields
- Privacy boundary warning in red banner

### Contribution Table
- **Identiti Awam** column: shows persona/guest name (bold)
- **Identiti Dalaman** column: shows provider/model/role (gray, admin-only)
- **Sumber** column: shows identity source with color-coded badge

## API Routes Added

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/admin/contributions/[id]/handshake` | Register identity handshake |
| GET | `/api/public/contributions?submissionId=X` | Public-safe contribution projection |

## Tests

**File:** `__tests__/identity-privacy.test.ts`

| Test Category | Count | Status |
|---------------|-------|--------|
| Persona Mapping | 22 | ✅ PASS |
| Identity Handshake Validation | 16 | ✅ PASS |
| Privacy Boundary | 14 | ✅ PASS |
| Human/Guest Contributions | 6 | ✅ PASS |
| Suggested Credit Boundary | 3 | ✅ PASS |
| **Total** | **64** | **✅ ALL PASS** |

### Key Privacy Tests
- Public projection has NO internal fields (aiProvider, aiModel, etc.)
- Admin projection includes ALL fields
- Bad projection detected as NOT private (leakage detection)
- Human contributions unaffected (no AI fields needed)
- Guest contributions unaffected

## Files Added/Modified

### New Files
- `src/lib/admin/persona-mapping.ts` — canonical persona registry
- `src/lib/admin/identity-handshake.ts` — handshake validation & projection
- `src/app/api/admin/contributions/[id]/handshake/route.ts` — handshake API
- `src/app/api/public/contributions/route.ts` — public-safe API
- `__tests__/identity-privacy.test.ts` — 64 privacy/identity tests
- `docs/PHASE_4D_2_IDENTITY_HANDSHAKE.md` — this document

### Modified Files
- `src/lib/admin/contribution-service.ts` — added identity validation, registerIdentityHandshake()
- `src/app/admin/submissions/[id]/page.tsx` — public/internal identity sections

## Validation Results

| Check | Status |
|-------|--------|
| Identity tests | ✅ PASS (64/64) |
| db:verify | ✅ PASS (16/16) |
| validate-content | ✅ PASS |
| build | ✅ PASS |

## Deferred (Phase 4D-3+)

1. Generation orchestration — AI story generation from prompt templates
2. Magnific integration — actual visual generation pipeline
3. Runtime verification at generation time
4. Provider adapter plugins
5. Batch identity registration
6. Identity audit trail / history
