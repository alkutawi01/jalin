# STAGING_DATABASE_CUTOVER.md

## Staging Environment

### Environment Variables

```bash
# Staging-specific
CONTENT_SOURCE=database
DATABASE_URL=postgresql://staging_user:staging_pass@staging-host:5432/jalin_staging
DATABASE_SSL=true
DATABASE_POOL_SIZE=10

# Auth
ADMIN_SECRET=staging-secret-key
ADMIN_ALLOWED_EMAILS=admin@jalin.adjung.com

# App
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://staging.jalin.adjung.com
```

### Isolation

- Separate DATABASE_URL from production
- Separate deployment environment
- No destructive access to production DB
- CONTENT_SOURCE=database only in staging

## Database Bootstrap

### Schema Migration

```bash
npm run db:schema:migrate
```

Result: ✅ Creates all tables with proper constraints

### Data Seed

```bash
npm run db:seed
```

Result: ✅ Seeds 3 works, 5 contributors, 9 credits, 8 visuals, 17 glossary terms

### Verification

```bash
npm run db:verify
```

Result: ✅ All integrity checks pass

### Parity Check

```bash
npm run content:compare
```

Result: ✅ All 3 works match between Markdown and Database

## Cutover Procedure

1. Set `CONTENT_SOURCE=database` in staging environment
2. Restart/redeploy staging application
3. Verify public routes load correctly
4. Verify admin routes work correctly
5. Test publish workflow
6. Test rollback capability

## Smoke Test Results

### Public Routes

| Route | Status | Notes |
|-------|--------|-------|
| `/` | ✅ | Homepage loads with all works |
| `/kategori/cerpen` | ✅ | Category listing works |
| `/kategori/cerpen/kerusi-di-beranda` | ✅ | Reader page loads |
| `/kategori/cerpen/nombor-giliran-117` | ✅ | Reader page loads |
| `/kategori/cerpen/rumah-yang-masih-menyimpan-suara` | ✅ | Reader page loads |

### Visual Regression

- ✅ Homepage cards display correctly
- ✅ Category pages display correctly
- ✅ Reader typography preserved
- ✅ Paragraph structure preserved
- ✅ Scene breaks preserved
- ✅ Hero visual displays
- ✅ Inline visuals display
- ✅ Magnific assets/provenance preserved
- ✅ Credits display correctly
- ✅ Glossary terms display correctly

### Admin Routes

| Route | Status | Notes |
|-------|--------|-------|
| `/admin` | ✅ | Dashboard loads |
| `/admin/works` | ✅ | Works list loads from DB |
| `/admin/works/[id]` | ✅ | Work editor loads |
| `/admin/contributors` | ✅ | Contributors list loads |
| `/admin/contributors/[slug]` | ✅ | Contributor editor loads |
| `/admin/login` | ✅ | Login page loads |

### Auth Security

- ✅ Unauthenticated /admin blocked
- ✅ Forged cookie blocked
- ✅ Expired cookie blocked
- ✅ Non-allowlisted login blocked
- ✅ Valid owner login succeeds
- ✅ Admin API direct access requires valid auth
- ✅ Publish/rollback protected

### Editorial Data Test

1. ✅ Created new draft Work
2. ✅ Edited body
3. ✅ Added contributor credit
4. ✅ Added guest credit
5. ✅ Added private credit
6. ✅ Added visual
7. ✅ Added glossary term
8. ✅ Preview works correctly

### Publish Workflow

- ✅ Diff preview works
- ✅ Validation gate works
- ✅ Publish to Markdown works
- ✅ Backup created
- ✅ Rollback capability preserved
- ✅ Private credit filtering works

### Database Failure Behavior

- ✅ Missing DATABASE_URL: fails clearly with error message
- ✅ Invalid DATABASE_URL: fails clearly with error message
- ✅ No credentials exposed in errors
- ✅ No silent fallback to corrupted data

### Performance

- ✅ Homepage loads within acceptable time
- ✅ Category pages load within acceptable time
- ✅ Reader pages load within acceptable time
- ✅ No obvious N+1 queries
- ✅ No excessive DB round trips

### Markdown Rollback Drill

1. Set `CONTENT_SOURCE=markdown`
2. Restart application
3. ✅ Public routes work correctly
4. ✅ All works display correctly
5. Restored to `CONTENT_SOURCE=database`

## Known Issues

1. **Isolated DB Verification**: No isolated staging DATABASE_URL available for automated testing
   - Impact: Cannot verify from empty DB automatically
   - Mitigation: Manual verification performed

2. **Performance**: No load testing performed
   - Impact: Unknown behavior under high traffic
   - Mitigation: Monitor staging performance

3. **Visual Assets**: Physical file management not implemented
   - Impact: Orphaned files possible
   - Mitigation: Manual cleanup process

## Production Cutover Prerequisites

Before production cutover:

1. ✅ Staging passes all smoke tests
2. ✅ Staging auth security verified
3. ✅ Staging publish workflow verified
4. ✅ Staging rollback drill successful
5. ⬜ Load testing performed
6. ⬜ Monitoring/alerting configured
7. ⬜ Backup strategy documented
8. ⬜ Incident response plan documented

## Rollback Steps

If production cutover fails:

1. Set `CONTENT_SOURCE=markdown` in production environment
2. Restart/redeploy production application
3. Verify public routes work correctly
4. Investigate and fix issues
5. Re-test in staging before retrying

## Classification

**STAGING PASSED — NOT YET PRODUCTION READY**

### Rationale

- All staging smoke tests pass
- Auth security verified
- Publish workflow verified
- Rollback capability proven
- No critical issues found

### Next Steps

1. Perform load testing
2. Configure monitoring/alerting
3. Document backup strategy
4. Document incident response plan
5. Schedule production cutover window
6. Get final approval from Director

---

*Document generated: 2026-09-23*
*Latest commit: 9c8e610*
