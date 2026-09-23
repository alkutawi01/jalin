# PRODUCTION_DB_PROVISIONING.md

## Gate-0 Blockers (All Resolved)

| # | Item | Status | Classification |
|---|------|--------|----------------|
| 3 | Production DATABASE_URL exists | ✅ RESOLVED | infrastructure |
| 4 | Production database is NOT staging database | ✅ RESOLVED | infrastructure |
| 5 | Database backup/snapshot available | ✅ RESOLVED | backup/recovery |
| 6 | ADMIN_SECRET configured securely | ✅ RESOLVED | environment configuration |

## Resolution Evidence

### Item 3: Production DATABASE_URL
- **Provider**: Neon PostgreSQL (Project: jalin, Region: Singapore)
- **Pooled endpoint**: DATABASE_URL configured in Vercel production environment
- **Direct endpoint**: DATABASE_URL_UNPOOLED configured for migrations
- **SSL**: DATABASE_SSL=true
- **Pool size**: DATABASE_POOL_SIZE=5

### Item 4: Production Database Isolation
- **Production DB**: ep-muddy-tooth-b3hukvx9 (Neon Singapore)
- **Staging DB**: Separate instance (not the same)
- **Confirmed**: Different connection strings, different endpoints

### Item 5: Backup/Recovery
- **Provider**: Neon automatic branching
- **Method**: Neon provides point-in-time recovery and branch-based backups
- **Status**: Available via Neon dashboard

### Item 6: ADMIN_SECRET
- **Configured in**: Vercel production environment
- **Status**: Secure, not exposed in code

## Connectivity Verification

| Check | Status |
|-------|--------|
| Pooled (DATABASE_URL) SELECT 1 | ✅ PASS |
| Direct (DATABASE_URL_UNPOOLED) SELECT 1 | ✅ PASS |

## Schema Migration

| Migration | Status |
|-----------|--------|
| 001_create_tables | ✅ Success |
| 002_add_credit_public_flag | ✅ Success |
| 003_add_contributor_visibility | ✅ Success |

### Migration Repeatability
- ✅ Second run: clean no-op, no destructive reset, no duplicate objects

## Schema Verification

| Check | Status |
|-------|--------|
| 5 tables exist (works, contributors, credits, visuals, glossary_terms) | ✅ |
| Credit hardening (is_public, byline, sort_order, contributor_slug, guest_name) | ✅ |
| Contributor visibility (is_visible column) | ✅ |
| Foreign keys (3: credits→works, visuals→works, glossary_terms→works) | ✅ |
| Indexes (6: primary keys + unique slug) | ✅ |

## Pre-Seed Row Counts

| Table | Count |
|-------|-------|
| works | 0 |
| contributors | 0 |
| credits | 0 |
| visuals | 0 |
| glossary_terms | 0 |

## Current Configuration

- **CONTENT_SOURCE**: markdown (unchanged)
- **Runtime**: Reads from Markdown files
- **Database**: Schema ready, empty, waiting for import

---

*Document updated: 2026-09-23*
*Latest commit: ca9d367*
