# Documentation Index

**Single entry point for AI agents and new contributors.**
**Version**: 1.0 | **Date**: 2026-09-22

---

## 00 -- Product

| Document | Purpose | Authority |
|----------|---------|-----------|
| MASTER_PLAN.md | Product thesis, content forms, navigation, technical baseline | **LOCKED** -- highest authority |
| PRODUCT.md | Brand, audience, content pillars, access model | High -- product contract |
| AGENTS.md | Working rules for all AI agents | **LOCKED** -- must follow |

## 01 -- Content

| Document | Purpose | Authority |
|----------|---------|-----------|
| CONTENT_MODEL.md | Entity definitions, field lists, relationships | High -- conceptual model |
| CONTENT_LAYER_MIGRATION_PLAN.md | Migration from hard-coded pages to WorkLoader | Medium -- implementation plan |
| CONTENT_LAYER_IMPLEMENTATION_RULES.md | Rules for content layer code changes | Medium -- code rules |
| WORK_PUBLICATION_WORKFLOW.md | How to publish a new work via markdown | Medium -- operational guide |
| WORK_SCHEMA_PROPOSAL.md | TypeScript schema proposals | Low -- proposal, superseded by types.ts |

## 02 -- Editorial

| Document | Purpose | Authority |
|----------|---------|-----------|
| EDITORIAL_SYSTEM.md | Workflow, credits, prose guidelines, typography | **LOCKED** -- editorial authority |
| AI_WRITERS_ROOM.md | AI collaboration rules for story creation | Medium -- AI workflow |
| JALIN_MASTER_PLAN_AI_HANDOFF.md | AI-facing consolidated decisions | Medium -- AI reference |
| RUMAH_MENYIMPAN_SUARA_EDITORIAL_REVIEW.md | Editorial review for specific work | Low -- per-work artifact |

## 03 -- Migration

| Document | Purpose | Authority |
|----------|---------|-----------|
| CONTENT_LAYER_MIGRATION_PLAN.md | 5-step migration to unified content layer | Medium -- implementation plan |
| GENERIC_READER_MIGRATION_PLAN.md | Migration from hard-coded cerpen routes to generic reader | Medium -- implementation plan |
| KERUSI_WORK_MIGRATION_MAP.md | Migration map for Kerusi di Beranda | Low -- per-work artifact |
| NOMBOR_WORK_MIGRATION_MAP.md | Migration map for Nombor Giliran 117 | Low -- per-work artifact |

## 04 -- Technical

| Document | Purpose | Authority |
|----------|---------|-----------|
| ARCHITECTURE.md | Tech baseline, reader architecture, layout, hosting, DB, security | High -- technical authority |
| MVP_MASTER_PLAN.md | Phase-by-phase MVP execution plan (A through P) | High -- active master plan |
| ADMIN_CONSOLE_PLAN.md | Admin console IA, SQL schema, ingestion workflow, migration phases | Medium -- backend planning |
| CATEGORY_INDEX_PLAN.md | Category index page planning | Low -- planning doc |

## 05 -- Visual

| Document | Purpose | Authority |
|----------|---------|-----------|
| VISUAL_BIBLE.md | Visual identity, house style, illustration rules | High -- visual authority |
| VISUAL_GENERATION_GUARDRAILS.md | Rules for AI image generation | High -- visual generation rules |

## 06 -- Reference

| Document | Purpose | Authority |
|----------|---------|-----------|
| JALIN_EDITORIAL_ARCHITECTURE.md | Cross-reference index for editorial architecture | Index -- points to sources |
| JALIN_MASTER_PLAN_AI_HANDOFF.md | Consolidated decisions for AI agents | Medium -- AI reference |

---

## Authority Levels

- **LOCKED**: Do not change without explicit human approval. Highest authority.
- **High**: Authoritative source for its domain. Changes require documentation.
- **Medium**: Active planning/reference. Can be updated as work progresses.
- **Low**: Per-work artifact or superseded proposal. Archive when no longer needed.
- **Index**: Navigation document. Points to other sources.

---

## Reading Order for New AI Agents

1. AGENTS.md (rules)
2. MASTER_PLAN.md (product vision)
3. EDITORIAL_SYSTEM.md (editorial rules)
4. JALIN_EDITORIAL_ARCHITECTURE.md (cross-reference index)
5. ARCHITECTURE.md (technical baseline)
6. Relevant section documents from index above
