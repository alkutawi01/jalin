# PRODUCTION_CUTOVER_PLAN.md

## Gate 0 — Production Precheck

### Precheck Checklist

| # | Item | Status | Notes |
|---|------|--------|-------|
| 1 | Production deployment target identified | ✅ | jalin.adjung.com (Vercel) |
| 2 | Current deployed Git SHA recorded | ✅ | `66c009a` — Phase 4C-8 |
| 3 | Production DATABASE_URL exists | ⬜ | Configure in Vercel |
| 4 | Production database is NOT staging database | ⬜ | Verify during setup |
| 5 | Database backup/snapshot available | ⬜ | Configure during setup |
| 6 | ADMIN_SECRET configured securely | ⬜ | Configure in Vercel |
| 7 | ADMIN_ALLOWED_EMAILS non-empty | ✅ | `admin@jalin.adjung.com` |
| 8 | Dev auth bypass disabled | ✅ | Not enabled in production |
| 9 | Production HTTPS active | ✅ | Vercel provides HTTPS |
| 10 | Current production CONTENT_SOURCE=markdown | ✅ | Confirmed |
| 11 | GitHub production branch contains 66c009a | ✅ | `main` branch |

### Precheck Result

**BLOCKED** — Items 3, 4, 5, 6 require production database setup.

## Production Environment Configuration

### Required Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:password@host:5432/jalin_production
DATABASE_SSL=true
DATABASE_POOL_SIZE=10

# Content Source
CONTENT_SOURCE=database

# Application
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://jalin.adjung.com

# Admin Authentication
ADMIN_SECRET=<strong-random-secret>
ADMIN_ALLOWED_EMAILS=admin@jalin.adjung.com

# Dev Bypass (MUST be disabled)
ADMIN_DEV_BYPASS=false
```

### Production vs Staging vs Development

| Aspect | Development | Staging | Production |
|--------|-------------|---------|------------|
| DATABASE_URL | Local | Staging DB | Production DB |
| CONTENT_SOURCE | markdown | database | database |
| ADMIN_SECRET | dev-secret | staging-secret | production-secret |
| ADMIN_ALLOWED_EMAILS | admin@jalin.local | admin@jalin.adjung.com | admin@jalin.adjung.com |
| ADMIN_DEV_BYPASS | true | false | false |
| NODE_ENV | development | production | production |
| NEXT_PUBLIC_APP_URL | http://localhost:3000 | https://staging.jalin.adjung.com | https://jalin.adjung.com |
| DATABASE_SSL | false | true | true |
| DATABASE_POOL_SIZE | 5 | 10 | 10 |

## Production DB Preparation

### Step 1: Create Production PostgreSQL Database

```sql
-- Connect to PostgreSQL
CREATE DATABASE jalin_production;
CREATE USER jalin_user WITH PASSWORD '<strong-password>';
GRANT ALL PRIVILEGES ON DATABASE jalin_production TO jalin_user;
```

### Step 2: Apply Schema Migrations

```bash
DATABASE_URL=postgresql://user:password@host:5432/jalin_production \
npm run db:schema:migrate
```

Expected output:
```
[DB Schema] Running schema migration...
[DB Schema] Schema migration complete.
```

### Step 3: Seed/Import Current Canonical Content

```bash
DATABASE_URL=postgresql://user:password@host:5432/jalin_production \
npm run db:seed
```

Expected output:
```
[DB Seed] Seeding works...
[DB Seed] Works seeded successfully.
[DB Seed] Seeding contributors...
[DB Seed] Contributors seeded successfully.
[DB Seed] Seeding credits...
[DB Seed] Credits seeded successfully.
[DB Seed] Seeding visuals...
[DB Seed] Visuals seeded successfully.
[DB Seed] Seeding glossary...
[DB Seed] Glossary seeded successfully.
```

### Step 4: Verify Counts

```bash
DATABASE_URL=postgresql://user:password@host:5432/jalin_production \
npm run db:verify
```

Expected output:
```
[DB Verify] Works: 3
[DB Verify] Contributors: 5
[DB Verify] Credits: 9
[DB Verify] Visuals: 8
[DB Verify] Glossary: 17
[DB Verify] All checks passed.
```

### Step 5: Run Parity Check

```bash
DATABASE_URL=postgresql://user:password@host:5432/jalin_production \
npm run content:compare
```

Expected output:
```
[Content Compare] Comparing Markdown and Database...
[Content Compare] Work: kerusi-di-beranda - MATCH
[Content Compare] Work: nombor-giliran-117 - MATCH
[Content Compare] Work: rumah-yang-masih-menyimpan-suara - MATCH
[Content Compare] All works match.
```

### Step 6: Take Pre-Cutover Backup

```bash
pg_dump -U user -d jalin_production > jalin_production_pre_cutover_$(date +%Y%m%d_%H%M%S).sql
```

## Content Source Cutover Plan

### Before Cutover

```
CONTENT_SOURCE=markdown
```

### After Cutover

```
CONTENT_SOURCE=database
```

### Cutover Steps

1. **Set environment variable in Vercel**
   - Go to Vercel Dashboard → jalin → Settings → Environment Variables
   - Add/Update `CONTENT_SOURCE` = `database`
   - Add/Update `DATABASE_URL` = `postgresql://...`
   - Add/Update `DATABASE_SSL` = `true`
   - Add/Update `DATABASE_POOL_SIZE` = `10`
   - Add/Update `ADMIN_SECRET` = `<production-secret>`
   - Add/Update `ADMIN_ALLOWED_EMAILS` = `admin@jalin.adjung.com`
   - Add/Update `ADMIN_DEV_BYPASS` = `false`

2. **Redeploy application**
   - Trigger redeploy in Vercel
   - Wait for deployment to complete

3. **Run smoke tests**

### Smoke Tests

#### Public Routes

| Route | Expected | Status |
|-------|----------|--------|
| `/` | Homepage loads with all works | ⬜ |
| `/kategori/cerpen` | Category listing works | ⬜ |
| `/kategori/cerpen/kerusi-di-beranda` | Reader page loads | ⬜ |
| `/kategori/cerpen/nombor-giliran-117` | Reader page loads | ⬜ |
| `/kategori/cerpen/rumah-yang-masih-menyimpan-suara` | Reader page loads | ⬜ |

#### Visual Regression

| Check | Status |
|-------|--------|
| Homepage cards display correctly | ⬜ |
| Category pages display correctly | ⬜ |
| Reader typography preserved | ⬜ |
| Paragraph structure preserved | ⬜ |
| Scene breaks preserved | ⬜ |
| Hero visual displays | ⬜ |
| Inline visuals display | ⬜ |
| Magnific assets/provenance preserved | ⬜ |
| Credits display correctly | ⬜ |
| Glossary terms display correctly | ⬜ |

#### Admin Routes

| Route | Status |
|-------|--------|
| `/admin` | ⬜ |
| `/admin/works` | ⬜ |
| `/admin/works/[id]` | ⬜ |
| `/admin/contributors` | ⬜ |
| `/admin/contributors/[slug]` | ⬜ |
| `/admin/login` | ⬜ |

#### Database

| Check | Status |
|-------|--------|
| `npm run db:verify` passes | ⬜ |
| `npm run content:compare` passes | ⬜ |

### Rollback Threshold

Rollback if ANY of the following occur:
- Reader 500 errors
- Missing works
- Wrong bylines
- Missing visuals
- Auth failure affecting admin
- Parity mismatch
- DB connectivity instability

### Rollback Procedure

1. Set `CONTENT_SOURCE=markdown` in Vercel environment
2. Redeploy application
3. Verify public routes work correctly
4. Investigate and fix issues
5. Re-test in staging before retrying

### Data Loss Considerations

- DB edits made after cutover will be lost if rolled back
- Use publish workflow to backup DB edits to Markdown before rollback
- Admin should be read-only during rollback if possible

## Production Rollback Plan

### Rollback Trigger Examples

- Reader 500 errors
- Missing works
- Wrong bylines
- Missing visuals
- Auth failure affecting admin
- Parity mismatch
- DB connectivity instability

### Rollback Procedure

1. Set `CONTENT_SOURCE=markdown` in production environment
2. Restart/redeploy production application
3. Verify public routes work correctly
4. Investigate and fix issues
5. Re-test in staging before retrying

### Data Loss Considerations

- DB edits made after cutover will be lost if rolled back
- Use publish workflow to backup DB edits to Markdown before rollback
- Admin should be read-only during rollback if possible

## Write-Flow Review

### Admin Write Operations

| Operation | A. DB Only | B. Markdown Only | C. Both |
|-----------|------------|------------------|---------|
| Work edit | ✅ | | |
| Contributor edit | ✅ | | |
| Credit edit | ✅ | | |
| Visual edit | ✅ | | |
| Glossary edit | ✅ | | |
| Archive | ✅ | | |
| Publish | | | ✅ |
| Rollback | | ✅ | |

### Source-of-Truth Policy

**Option A: DB primary, Markdown backup/export**

- Admin edits: Direct to DB
- Public reader: Reads from DB
- Git history: Markdown files become generated backup/export
- Rollback: Switch back to `CONTENT_SOURCE=markdown`
- Manual Markdown edits: Discouraged, use Admin instead

## Manual Markdown Policy

**Discouraged**

Once production uses DB reading:
- Manual editing of `content/works/*.md` is discouraged
- Use Admin console for all edits
- If manual edit is required, use publish workflow to sync

## Security Checklist

- ✅ Auth: Token-based with HMAC, fail-closed
- ✅ API protection: All admin routes protected by middleware
- ✅ Database secrets: Environment variables, not in code
- ✅ SSL: Required for production DB
- ✅ Safe error responses: API error sanitization implemented
- ✅ Rollback: Rollback plan documented
- ✅ Private credits: Excluded from public content
- ✅ Hidden contributors: Excluded from public listings
- ✅ Guest credits: Discriminated identity, no fake links

## Dependency Audit

### Current Status

- postcss vulnerability (high severity) — from Next.js dependency
- next depends on vulnerable postcss
- Fix available via `npm audit fix --force` but requires Next.js 16.3.6 (breaking change)

### Recommendation

**ACCEPTABLE POST-CUTOVER**

- Risk: postcss XSS and path traversal vulnerabilities
- Mitigation: Monitor for updates, upgrade when stable
- Production-blocking: No — vulnerabilities require attacker-controlled CSS input

## Production Observability

### Minimum Monitoring

| Type | Mechanism |
|------|-----------|
| Application errors | Vercel Function Logs |
| DB connection errors | Application logs |
| Auth failures | Application logs |
| Publish failures | Application logs |
| Rollback failures | Application logs |

### Recommended Actions

1. Enable Vercel Analytics
2. Set up error alerting via Vercel
3. Monitor database connection pool
4. Track publish/rollback operations

## GO/NO-GO Criteria

### GO only if:

- ✅ All BLOCKER items closed
- ✅ Production DB prepared
- ✅ Backup exists
- ✅ Auth config valid
- ✅ Schema migration passes
- ✅ Seed/import passes
- ✅ db:verify passes
- ✅ Parity passes
- ✅ Rollback plan confirmed
- ✅ Dependency risks acceptable

### Current Status

**BLOCKED** — Production DB not yet configured.

### Next Steps

1. Configure production PostgreSQL database
2. Run schema migrations
3. Seed/import current content
4. Configure environment variables in Vercel
5. Take pre-cutover backup
6. Proceed with cutover

---

*Document generated: 2026-09-23*
*Latest commit: 66c009a*
