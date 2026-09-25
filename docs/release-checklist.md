# Release Checklist — Waktu Sebenar

## Technical Readiness

| Item | Status | Action |
|------|--------|--------|
| Build | ✅ PASS | npm run build |
| Tests | ✅ PASS | 157 passed |
| TypeScript | ✅ PASS | npx tsc --noEmit |
| DB Verify | ✅ PASS | All checks passed |
| Editorial Audit | ⚠️ 2 warnings | Visual credits + legacy translation |
| Revision System | ✅ PASS | P1-P5 complete |
| Public Reader | ✅ PASS | Reads from published_revision_id |
| Snapshot Reconstruction | ✅ PASS | readingSections + sections consistent |

## Editorial Readiness

| Item | Status | Action |
|------|--------|--------|
| Author | ❌ KIV | Pending Director decision |
| Visual | ❌ KIV | Pending Director decision |
| Credit | ❌ KIV | Pending Director decision |
| Synopsis | ✅ READY | Draft available |
| Dek | ✅ READY | "Sebuah kisah tentang Wardah..." |
| Genre | ✅ READY | Drama |
| Audience | ✅ READY | Remaja |
| Reading time | ✅ READY | ~135 minutes |

## Deployment Readiness

| Item | Status | Action |
|------|--------|--------|
| Production deploy | ✅ READY | Vercel auto-deploy |
| Smoke test | ⏳ | After author + visual |
| Domain | ✅ READY | jalin.adjung.com |

## BLOCKERS

1. **Author Decision**: Who is the author? (Nara Zahin or other?)
2. **Visual Decision**: How many visuals? Which scenes?
3. **Credit Format**: What credit format for visuals?

## Release Flow (After Decisions)

1. Assign author credits
2. Generate visuals (6 minimum)
3. Add visual credits
4. Run publish validation
5. Fix any blockers
6. Publish via admin workflow
7. Verify production
8. Announce

## DO NOT

- ❌ Publish without author
- ❌ Publish without visual
- ❌ Skip credit assignment
- ❌ Rush the first Novela

## STATUS

**READY FOR PUBLISH: NO**

Waiting for:
1. Author decision from Director
2. Visual decision from Director
3. Credit format decision

After decisions: estimated 1-2 sessions to publish.