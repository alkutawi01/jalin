# Phase 4D-6 — Editorial Publication Pipeline

Status: implemented + 4D-6R atomic recheck (pending Director gate).
Depends on: 4D-1..4D-5R2 (submissions, generation, promotion, Magnific, Neon Object Storage).

## Objective

Complete the editorial workflow from a promoted Work to an **explicitly** published Work.
Publication remains a separate human-controlled action. No auto-publish.

```
submission → generated/reviewed content → promoted Work → editorial checks
→ approved credits → approved/finalized visuals → publication readiness
→ explicit publish → public availability
```

## Work status semantics

| Status | Meaning |
|---|---|
| `draft` | Active editing |
| `review` | Editorial review in progress |
| `ready` | All mandatory publication gates passed — *permits* publish |
| `published` | Explicitly published (via publish endpoint only) |
| `archived` | Removed from normal publication lifecycle (soft remove) |

**Readiness never publishes.** A Work becomes `published` only through
`POST /api/admin/works/[id]/publish`.

Raw `PATCH /api/admin/works/[id]` **cannot** set `status=published`.
Published → `draft`/`review`/`ready` via raw PATCH is also blocked (unpublish
endpoint deferred); published → `archived` remains allowed (Arkib).

## Readiness service

Central gate: `evaluatePublicationReadiness(workId)` in
`src/lib/admin/publication-service.ts`, pure core in
`src/lib/admin/publication-readiness.ts` (`evaluatePublicationReadinessFromData`).

Returns:

```json
{
  "ready": false,
  "blockers": [{ "code": "...", "message": "..." }],
  "warnings": [{ "code": "...", "message": "..." }],
  "gates": {
    "content":  { "pass": false, "blockers": [], "warnings": [] },
    "credits":  { "pass": true,  "blockers": [], "warnings": [] },
    "visuals":  { "pass": true,  "blockers": [], "warnings": [] },
    "privacy":  { "pass": true,  "blockers": [], "warnings": [] },
    "workflow": { "pass": true,  "blockers": [], "warnings": [] }
  },
  "checkedAt": "ISO-8601"
}
```

UI/routes must not duplicate gate logic.

### Blocker rules (prevent publish)

**Content**
- Work missing / invalid `status` / status not in {`ready`,`published`}
- empty `title`, empty/invalid/duplicate `slug`, invalid `type`, empty `body`

**Credits**
- zero credits
- credit without contributor XOR guest identity
- unknown `contributor_slug`
- empty `role_label`
- no public byline credit

**Visuals** (non-published Works; see grandfather policy)
- missing `src`, empty `src`
- transient/non-durable `src` (Magnific API/CDN+token, `file:`, `/assets/`)
- `is_asset_finalized ≠ true`
- empty `alt`
- invalid `role`
- missing hero when policy is `required` (cerpen/novela/bersiri)

**Workflow**
- rejected visual request still attached via `creation_id`

**Privacy**
- forbidden substrings in public metadata (`prompt_composed`, API key patterns,
  storage/webhook secrets, `bearer `, etc.)
- forbidden internal keys on the Work projection

### Warning rules (never block)

- missing `dek`, empty glossary
- derivative provenance reminder (sinopsis/terjemahan/fragmen)
- private credits excluded from public byline (expected)
- credit sort order irregularity
- magnific visual without `creation_id`
- recommended-hero missing (fragmen/sinopsis/terjemahan)
- pending/failed visual requests not yet attached
- grandfathered visual gaps on already-published Works

### Visual requirement policy (backward-compatible)

| Type | Hero |
|---|---|
| cerpen, novela, bersiri | **required** (blocker if missing, non-published) |
| terjemahan, fragmen, sinopsis | recommended (warning) |

**Grandfather:** Works with `status=published` downgrade visual policy failures
(unfinalized, transient src, missing alt, missing hero) to warnings so existing
production Works remain valid. Integrity blockers (title/slug/body/privacy) still apply.

## API

### `GET /api/admin/works/[id]/publication-readiness` (admin)

→ `{ ready, blockers, warnings, gates, checkedAt }` (404 if missing Work).

### `POST /api/admin/works/[id]/publish` (admin)

1. Auth via middleware + `getCurrentAdmin()`
2. Load Work; if already `published` → idempotent `{ alreadyPublished: true, ... }`
3. **Preflight** readiness (advisory/fast fail); blockers → HTTP 422
4. Status must be `ready` → 422 otherwise
5. **Transaction begins** — `beforeTransaction` test hook may run (race tests only)
6. Inside the **same transaction**, reload Work + credits + visuals + glossary +
   visual_requests + contributors + duplicate-slug via `loadReadinessInput(trx, …)`
7. **Authoritative transactional readiness recheck** — must return `ready === true`
   or the transaction rolls back (Work stays `ready`, audit fields unchanged)
8. Single transaction commits: `status=published`, `published_at`, `published_by`,
   append `editorial_history` publish entry, `updated_at`
9. Response returns the **transactional** readiness object (not the preflight snapshot)

Preflight is advisory only; the transactional recheck is the publication gate.

Does **not** auto-fix blockers, generate/approve/attach visuals, or edit content.

## Audit metadata

Migration **010** (additive):
- `works.published_by` (text, nullable) — admin email/id of publisher
- `works.published_at` (already existed) — publication timestamp
- index `works_published_at_idx`

Defined in both `scripts/db-schema-migrate.ts` and
`src/lib/db/migrations/010_add_published_by.ts` (file runner idempotent).

## Public visibility

Only `status = "published"` is publicly discoverable:

- `DatabaseContentRepository.init` caches **published rows only**
- `workLoader.getWorkBySlug` / `getWorksByType` / `getAllWorks` filter `status === "published"`
- homepage, `/kategori/*`, `/kategori/[type]/[slug]` therefore exclude
  draft/review/ready/archived
- `dynamicParams = false` on the reader → unpublished slugs 404 (no static param)

Admin preview (`/admin/works/[id]/preview`) remains authenticated and loads
near-public rendering (body, glossary, hero, public byline) without mutating status.

## Markdown fallback role

- Production content source remains **database** (`CONTENT_SOURCE=database`).
- Markdown export (`POST /api/admin/publish` → "Sync Markdown") is **backup/export only**.
- Public availability never depends on a filesystem write.
- Explicit DB publish and Markdown sync are separate actions in the admin UI.

## Rollback / unpublish policy

- Destructive unpublish **deferred** (documented, not implemented).
- Safe remove path: **Arkib** (`status=archived`) — keeps Work, credits, visuals.
- Raw PATCH cannot move published → draft/review/ready.

## Privacy guarantees

- Public repository only emits public credits (`is_public`) and visible contributors.
- Readiness privacy gate scans public metadata for secrets/internal markers.
- Publish/readiness endpoints are under `/api/admin/*` (session + middleware).
- No prompt/provider/storage secrets in readiness responses.

## Tests

- `__tests__/publication-pipeline.test.ts` — pure readiness/publish-rule/visibility/race matrix
- `scripts/publication-readiness-audit.ts` (`npm run audit:readiness`) — read-only audit of live Works
- `scripts/controlled-publication-test.ts` (`npm run test:controlled-publish`) —
  dedicated test Work draft→ready→**race invalidation**→publish→idempotent→archive
  (never touches production editorial Works)

## Verification checklist

- [x] Central readiness service
- [x] Blockers vs warnings separated
- [x] Explicit admin publish endpoint
- [x] Atomic + idempotent publish
- [x] **Transactional readiness recheck (authoritative)** — 4D-6R
- [x] All readiness relations loaded via trx (credits/visuals/glossary/visual_requests/slug)
- [x] published_at / published_by audit
- [x] Public routes: published only
- [x] Admin preview private + non-mutating
- [x] Visual finalized + transient URL gates
- [x] Grandfather existing published Works
- [x] No auto generate/approve/attach/publish
- [x] Race regression: relation invalidated after preflight → publish blocked, status stays ready
