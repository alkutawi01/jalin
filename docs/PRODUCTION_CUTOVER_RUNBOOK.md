# PRODUCTION_CUTOVER_RUNBOOK.md

## Cutover Summary

| Item | Value |
|------|-------|
| **Date** | 2026-09-23 |
| **Deployed SHA** | `28dda1989905e63043f8b777d4f456e9d42f267a` |
| **Deployment ID** | `dpl_jhs26FwJTzBtWi3U8oi8npuUL2nd` |
| **Production URL** | https://jalin.adjung.com |
| **CONTENT_SOURCE before** | markdown |
| **CONTENT_SOURCE after** | database |
| **Database** | Neon PostgreSQL (Singapore) |
| **Rollback needed** | No |

## Pre-Cutover Results

| Check | Status |
|-------|--------|
| Gate 0 | ✅ 11/11 PASS |
| Content Import Gate | ✅ PASS |
| db:verify pre-seed | ✅ 12/12 PASS |
| content:compare pre-seed | ✅ 0 differences |
| validate-content | ✅ PASS |
| build | ✅ PASS |

## Cutover Steps Executed

1. ✅ Verified HEAD = 28dda19
2. ✅ Confirmed DB recovery point (Neon branching)
3. ✅ Re-ran db:verify — PASS
4. ✅ Re-ran content:compare — 0 differences
5. ✅ Confirmed DB counts (3 works, 5 contributors, 9 credits, 9 visuals, 23 glossary)
6. ✅ Set CONTENT_SOURCE=database in Vercel production
7. ✅ Deployed to production via Vercel CLI
8. ✅ Build confirmed using database source

## Post-Cutover Smoke Tests

### Public Routes

| Route | Status |
|-------|--------|
| Homepage (`/`) | ✅ Loads, 3 works visible |
| Category Cerpen (`/kategori/cerpen`) | ✅ Lists all 3 works |
| Reader: kerusi-di-beranda | ✅ Full content, paragraphs, scene breaks, glossary, credits |
| Reader: nombor-giliran-117 | ✅ Full content renders correctly |
| Contributor: nara-zahin | ✅ Loads with disclosure |

### Credits/Privacy

| Check | Status |
|-------|--------|
| Public credits appear | ✅ |
| Guest credits render | ✅ |
| Contributor-linked credits | ✅ |
| Ordering correct | ✅ |

### Database Health

| Check | Status |
|-------|--------|
| db:verify post-cutover | ✅ 12/12 PASS |
| content:compare post-cutover | ✅ 0 differences |

## Rollback Procedure

If issues detected:

1. Set `CONTENT_SOURCE=markdown` in Vercel production
2. Redeploy: `npx vercel --prod --yes`
3. Verify public routes recover
4. Investigate root cause
5. Do NOT delete database data

## Known Issues

None.

---

*Document updated: 2026-09-23*
*Deployment: https://jalin.adjung.com*
