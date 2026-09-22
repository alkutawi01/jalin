# Jalin Editorial Architecture

**Cross-reference index. Not a source of truth -- points to authoritative documents.**
**Version**: 3.0 | **Date**: 2026-09-22

---

## A. Product Content Types

Six forms, each a single Work. Excludes Novel and Novel Pendek.

| Type | Key | Authority |
|------|-----|-----------|
| Cerpen | `cerpen` | MASTER_PLAN.md s2 |
| Novela | `novela` | MASTER_PLAN.md s2 |
| Bersiri | `bersiri` | MASTER_PLAN.md s2 |
| Terjemahan | `terjemahan` | MASTER_PLAN.md s2 |
| Fragmen | `fragmen` | MASTER_PLAN.md s2 |
| Sinopsis | `sinopsis` | MASTER_PLAN.md s2 |

Type definitions: `src/lib/content/types.ts` (TypeScript), `CONTENT_MODEL.md` (conceptual).

**Novela**: One complete Work, not a series. May use internal pagination. "Waktu Sebenar" is test corpus. (MASTER_PLAN.md s2, AGENTS.md Rule 24)

**Bersiri**: Episodic with canonical continuity. Each episode is a separate Work. (MASTER_PLAN.md s2)

---

## B. Source of Truth Hierarchy

**Current**: Markdown files in `content/works/` via `WorkLoader` (`src/lib/content/workLoader.ts`).

**Future**: PostgreSQL database after migration (ADMIN_CONSOLE_PLAN.md sE, CONTENT_LAYER_MIGRATION_PLAN.md).

Source of truth priority (AGENTS.md):
1. docs/MASTER_PLAN.md
2. docs/PRODUCT.md
3. docs/EDITORIAL_SYSTEM.md
4. docs/CONTENT_MODEL.md
5. docs/ARCHITECTURE.md

---

## C. Editorial Data Model

### Work
Core entity. Fields: id, slug, title, type, status, genre, audience, dek, body, readingMinutes, version, publishedAt, updatedAt, credits[], visuals[], glossary[], editorialHistory[], sourceWork?, seriesId?
Authority: `src/lib/content/types.ts`, CONTENT_MODEL.md sWork, ADMIN_CONSOLE_PLAN.md sB.

### Contributor
Fields: slug, displayName, kind (human|virtual|organization), bio, disclosure, status.
Internal-only (virtual): provider, technicalModel, identitySource, personaMapping.
Authority: CONTENT_MODEL.md sContributor, ADMIN_CONSOLE_PLAN.md sB.

### Credit
Flexible, contribution-based. Fields: workId, contributorSlug OR guestName, roleLabel (free-form), byline, public, sortOrder.
Authority: CONTENT_MODEL.md sCredit, EDITORIAL_SYSTEM.md s6.

### Visual Asset
Fields: workId, assetId, role (hero|inline|section), scene, sortOrder.
Asset fields: storageKey, altText, width, height, provider, creationId.
Authority: CONTENT_MODEL.md sAsset, ADMIN_CONSOLE_PLAN.md sB.

### Glossary
Fields: workId, term, meaning, source. Meaning must be brief.
Authority: CONTENT_MODEL.md sGlossaryTerm.

### Series
Fields: id, slug, title, synopsis, kind (continuous|anthology), status (ongoing|completed).
Authority: ADMIN_CONSOLE_PLAN.md sB, MASTER_PLAN.md s2.

### Submission
Fields: workId, submittedBy, status (pending|reviewed|accepted|rejected), manuscript, metadataJson, agentIdentity.
Authority: ADMIN_CONSOLE_PLAN.md sB, sC.

---

## D. AI Workflow

Flow: Request -> Prompt retrieval -> AI creation -> Identity handshake -> Submission -> Admin review -> Editorial gates -> Publish.

**Global prompt**: Active template from `prompt_templates` table, fallback to `config/editorial/new-work-global-prompt.md`. (ADMIN_CONSOLE_PLAN.md sD)

**Identity handshake**: AI declares provider, model, persona. Stored internally, never public. (ADMIN_CONSOLE_PLAN.md sC)

**Suggested credits**: AI suggests credits. Human editor reviews and edits. Never automatically final. (ADMIN_CONSOLE_PLAN.md sC)

**Human approval**: AI cannot publish autonomously. Human editorial gate is mandatory. (EDITORIAL_SYSTEM.md s2)

---

## E. Migration Phases

**Phase A**: Markdown remains source of truth. Admin reads/writes markdown via WorkLoader.

**Phase B**: Dual-write. Admin writes to both markdown AND database. Reader consumes markdown. Parity validation runs.

**Phase C**: Database becomes source of truth. Reader consumes from database. Markdown becomes export/backup.

Authority: ADMIN_CONSOLE_PLAN.md sE, CONTENT_LAYER_MIGRATION_PLAN.md.

---

## F. Document Cross-References

| Topic | Primary Source | Secondary |
|-------|---------------|-----------|
| Product thesis | MASTER_PLAN.md | PRODUCT.md |
| Content types | MASTER_PLAN.md s2 | CONTENT_MODEL.md |
| Work entity | types.ts | CONTENT_MODEL.md |
| Credit system | EDITORIAL_SYSTEM.md s6 | MASTER_PLAN.md s8 |
| Editorial workflow | EDITORIAL_SYSTEM.md s2 | MVP_MASTER_PLAN.md FASA H5 |
| Living text | EDITORIAL_SYSTEM.md s5 | MASTER_PLAN.md s7 |
| Migration plan | CONTENT_LAYER_MIGRATION_PLAN.md | ADMIN_CONSOLE_PLAN.md sE |
| Admin console | ADMIN_CONSOLE_PLAN.md sA | ARCHITECTURE.md sAdmin MVP |
| SQL schema | ADMIN_CONSOLE_PLAN.md sB | MVP_MASTER_PLAN.md FASA C1 |
| AI workflow | ADMIN_CONSOLE_PLAN.md sC | JALIN_MASTER_PLAN_AI_HANDOFF.md s4 |
| Prompt templates | ADMIN_CONSOLE_PLAN.md sD | -- |
| Visual system | VISUAL_BIBLE.md | VISUAL_GENERATION_GUARDRAILS.md |
| Prose guidelines | EDITORIAL_SYSTEM.md s12-16 | JALIN_MASTER_PLAN_AI_HANDOFF.md s7 |
| Reader architecture | ARCHITECTURE.md | GENERIC_READER_MIGRATION_PLAN.md |
| MVP phases | MVP_MASTER_PLAN.md | -- |
