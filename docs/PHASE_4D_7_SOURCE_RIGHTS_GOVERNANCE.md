# Phase 4D-7 — Source Provenance & Rights Governance

Status: implemented (pending Director gate).
Depends on: 4D-6 / 4D-6R / 4D-6R2 (publication pipeline closed).

## Objective

Additive rights gate for derivative Works (fragmen / sinopsis).
No auto-approve, no auto-unpublish, no SSRF fetch of `source_url` during publication.
Human editorial review is final.

```
source_works (provenance) → rights review (server-stamped) → central readiness rights gate
→ publish transaction locks source_works (FOR UPDATE) → public serializer strips internal fields
→ reader provenance section
```

## Data model — `source_works` (migration 011)

Additive only. Production Works are never mutated to satisfy the new schema.

| Column | Notes |
|---|---|
| `work_id` | UNIQUE FK → `works.id` ON DELETE CASCADE |
| `original_title`, `author`, `original_language` | required for PASS approval |
| `publication_year`, `source_edition`, `source_url`, `source_locator` | optional provenance |
| `source_text_basis` | distinguishes PD original + modern protected translation vs lawful original-language basis |
| `rights_status` | `unknown \| needs_review \| public_domain \| licensed \| permission_obtained \| restricted \| rejected` |
| `rights_notes`, `rights_evidence` | human notes / evidence (text only — no separate evidence-asset system) |
| `rights_history` | JSON text audit trail |
| `approved_material_hash` | material hash at last PASS approval (staleness detection) |
| `reviewed_at`, `reviewed_by` | **server-controlled** from authenticated admin session only |

Indexes: `source_works_work_id_idx`, `source_works_rights_status_idx`.

Both migration runners implement 011:
- `scripts/db-schema-migrate.ts` (Kysely Migrator inline)
- `src/lib/db/migrations/011_source_works.ts` (idempotent information_schema file runner)

## Rights gate (central readiness)

New gate name: `rights` in `ReadinessGateName`.

| Type | Behaviour |
|---|---|
| cerpen / novela / bersiri (original) | rights gate **N/A → pass** (no source record required) |
| fragmen / sinopsis | **must** pass rights gate |

**PASS statuses:** `public_domain`, `licensed`, `permission_obtained` (with complete review stamps + fresh `approved_material_hash`).

**BLOCK codes:**
- `source_missing` — derivative without `source_works` row
- `source_incomplete` — missing `original_title` / `author` / `original_language`
- `source_url_invalid` — not http(s) (rejects `javascript:` / `file:` / `data:`) — **validate only, never fetch**
- `rights_not_approved` — status not in PASS set
- `rights_not_reviewed` — PASS status without `reviewed_by` + `reviewed_at`
- `rights_stale_approval` — material fields changed after approval (`approved_material_hash` mismatch)
- `rights_notes_required` — `restricted` / `rejected` without notes

**Warning:** `rights_public_domain_notice` — PD original does not automatically clear a modern translation; see `source_text_basis`.

Legacy warning `provenance_manual` replaced by `provenance_expected` (content) + real `rights` gate.

## Service rules

`src/lib/admin/source-rights.ts`:
- `upsertSourceProvenance` — editing material fields after PASS → invalidate (`needs_review`, clear stamps/hash), append history. Does **not** auto-set PASS status.
- `performRightsReview` — explicit human action; `reviewed_by` / `reviewed_at` always from server session; never from client payload. Requires complete provenance for PASS. Does **not** auto-create public credits.
- AI never autonomously approves rights.

`publication-service.loadReadinessInput` loads `source_works` with `FOR UPDATE` when `lock: true` (inside SERIALIZABLE publish transaction).

## API

- `GET/PUT /api/admin/works/[id]/source-rights` — admin view + provenance upsert
- `POST /api/admin/works/[id]/source-rights/rights-review` — human rights review (server stamps)

Both require `getCurrentAdmin()` (401 without session).

## Public projection

`toPublicSourceProvenance` / `mapPublicSourceWork` expose only:
`originalTitle`, `author`, `language`, `publicationYear`, `edition`, `locator`, `rightsLabel`
(`Domain awam` / `Berlesen` / `Kebenaran diperoleh`).

**Never public:** `rights_notes`, `rights_evidence`, `rights_history`, `reviewed_by`, `reviewed_at`, `source_url`, `approved_material_hash`.

Reader UI: provenance section on `/kategori/[type]/[slug]` when `work.sourceWork` is present.

## Admin UI

Tab **Sumber & Hak** on `/admin/works/[id]` for derivative types: provenance form, rights status select, review button, rights history table, readiness **Hak** gate chip.

## Production policy

- Original production Works (JLN-CER-0001/0002/0003): rights gate N/A — **do not invent source records**.
- No production Work rows mutated by 4D-7 migrations.
- Existing derivative published Works without provenance → report as blocker; do not fabricate.

## Verification checklist

- `npx tsc --noEmit`
- `npm test` (publication-pipeline includes rights matrix + serializer leak checks)
- `npm run db:schema:migrate` + `npm run db:migrate`
- `npm run db:verify` (`source_works_schema`, `source_works_indexes`)
- `npm run validate-content`
- `npm run build`
- `npm run audit:readiness` (published originals remain ready)
- `npm run test:controlled-publish` (cerpen path) + controlled derivative rights test
