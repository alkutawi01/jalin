# Phase 4D-8 — Novela & Bersiri Structural Model

Status: **IMPLEMENTED — additive, reversible**

Fasa ini menutup jurang struktur terbesar dalam MVP Jalin:
Novela kekal **satu Work** dengan bahagian dalaman, dan Bersiri menggunakan
**satu container Series** dengan setiap episod ialah **Work**.

## Canonical Novela model

- Satu `Work` `type=novela`.
- Bab/bahagian dalaman disimpan dalam `reading_sections` — **bukan** Work berasingan.
- Jika `reading_sections` kosong, `works.body` kekal struktur tunggal (mundur selaras).
- Apabila `reading_sections` wujud, ia menjadi struktur kanonik pembaca
  (sections take precedence; `works.body` boleh kosong — warning sahaja).
- Section order: `position` integer bersebelahan `1..N`, unik per Work.
- Section slug: unik per Work, format `a-z0-9-` (regex sama seperti Work slug).
- Novela **bukan** Series dan **bukan** satu Work per chapter.

## Canonical Bersiri model

- Satu `series` container (id, slug, title, dek, genre, audience, mode, status).
- `series_entries`: keahlian + susunan episod dalam Siri (unique `work_id`,
  unique `(series_id, position)`).
- Setiap episod ialah `Work` `type=bersiri` (id/slug/body/credits/visuals/status
  sendiri) — **satu sumber kebenaran**, tiada jadual manuskrip episod kedua.
- Hanya `type=bersiri` boleh menyertai Series.
- Satu Work **tidak boleh** menyertai dua Series (unique `work_id`).
- Penerbitan episod berlaku **secara independen** melalui Work status —
  membership **tidak pernah** auto-publish.
- Status Series: `ongoing | completed`. Completed kekal Bersiri dan kekal
  publicly discoverable jika ada episod eligible.

## Series modes

| Mode | Public eligibility |
|------|--------------------|
| `continuous` | **Contiguous published prefix** dari position 1 sahaja. Episod selepas gap (draft/ready/archived) tidak exposed melalui Series. |
| `anthology` | Setiap episod published **independently visible**. Gap position tidak menutup episod lain. |

Zero publicly eligible episodes → Series **tidak** discoverable (dibuang daripada public cache).

Published bersiri episode yang tidak eligible melalui Series → dibuang daripada
public works cache (tiada flat discovery).

## URL model

| Jenis | Canonical URL |
|-------|---------------|
| Novela landing / first section | `/kategori/novela/[workSlug]` |
| Novela section nav | `/kategori/novela/[workSlug]/[sectionSlug]` — invalid slug → 404; must canonicalize ke Work |
| Series landing | `/kategori/bersiri/[seriesSlug]` |
| Nested episode (canonical) | `/kategori/bersiri/[seriesSlug]/[episodeSlug]` |
| Flat episode (backward-compat) | `/kategori/bersiri/[episodeSlug]` → redirect ke nested; **tiada** duplicate canonical page |

Notes routing:
- Static `kategori/bersiri/[seriesSlug]/` mengatasi dynamic `kategori/[type]/[slug]/`
  untuk type=bersiri (Next.js static > dynamic precedence).
- `[type]/[slug]` skip `bersiri` dalam generateStaticParams dan `notFound()`
  untuk type=bersiri.
- Series landing generateStaticParams merangkumi series slug **dan** flat episode
  slug (required kerana `dynamicParams=false`).

## Ordering semantics & admin workflows

- Section create: position auto `max+1` atau explicit (clash → reject).
- Section position change / reorder: **two-phase** (park negative → assign `1..N`),
  atomic, exact-set validation (submitted IDs == all section IDs).
- Section delete: gap close contiguously `1..N`.
- Series entry attach: auto next position atau explicit (clash → reject).
- Series entry reorder: exact-set, atomic, park-negative then assign.
- Reorder yang melibatkan episod **published** → response `reorderedPublished: true`
  (requiresConfirmation) — UI mesti confirm secara eksplisit.
- Detach episod **published** → **reject** (archive dulu).
- Delete Series → hanya apabila **kosong** (tiada membership); **tidak pernah**
  cascade-delete Works.
- Bersiri tanpa membership → readiness blocker `series_membership_missing`.
- Sections pada type ≠ novela → blocker `sections_only_novela`.
- Series entry pada type ≠ bersiri → blocker `series_entry_only_bersiri`.
- Admin: tab **Bahagian** (novela sahaja) pada Work detail; nav **Siri** +
  halaman `admin/series` (list/new/detail) untuk membership & reorder.

## Readiness structure gate

Gate `structure` (blockers, bukan warnings) meliputi:

- `novela_no_structure` — Novela tiada sections dan body kosong.
- `section_position_duplicate` / `section_position_gap` / `section_position_invalid`
- `section_slug_duplicate` / `section_slug_invalid`
- `section_body_missing`
- `sections_only_novela`
- `series_membership_missing` / `series_missing`
- `series_position_invalid` / `series_mode_invalid` / `series_status_invalid`
- `series_entry_only_bersiri`

Warning (tidak block): `novela_sections_take_precedence` (body kosong + sections wujud).

## Concurrency locking (publication transaction)

Dalam `publishWorkExplicit` (SERIALIZABLE + bounded retry 40001/40P01):
- `reading_sections` → `FOR UPDATE`
- `series_entries` → `FOR UPDATE`
- `series` row → `FOR SHARE` (via `loadSeriesRow`)
- Works/credits/visuals/glossary/source_works kekal `FOR UPDATE`; contributors `FOR SHARE`.

Tiada auto-state cascade semasa status mutation (tiada auto-archive/auto-publish
berikutan membership atau section edit).

## Preview behavior

Admin preview (`/admin/works/[id]/preview`):
- Novela: SectionNav prev/next/Indks merentas semua `reading_sections`.
- Bersiri: panel konteks Siri (adjacent entries) untuk orientasi editorial sahaja —
  **bukan** public metadata.

## Migration strategy

- File: `src/lib/db/migrations/012_novela_bersiri_structure.ts` (file runner, idempotent).
- Inline: `scripts/db-schema-migrate.ts` entry `012_novela_bersiri_structure`.
- **Additive only** — tiada perubahan pada Works sedia ada.
- Constraints: unique `(work_id,slug)` + `(work_id,position)`; `position >= 1`;
  unique `series.slug`; mode/status CHECK; unique `series_entries.work_id` +
  `(series_id,position)`.
- Index: `reading_sections(work_id, position)`, `series_entries(series_id, position)`.
- Re-run migration untuk verify idempotency (no duplicate/reapply failure).
- Production structural audit: tiada fabrikasi section split atau Series membership
  untuk Works sedia ada.

## Waktu Sebenar structural test approach

Manuskrip Waktu Sebenar tersedia di `content/manuscripts/Waktu_Sebenar_MASTER.txt`
(sumber luaran, disalin daripada `C:\Users\manus\Downloads\Waktu_Sebenar_MASTER.txt`).
Fail ini menamakan karya sebagai "novel penuh, versi Voice Pass" — Jalin
menggunakannya hanya sebagai test corpus struktur panjang (structural corpus).

Struktur sumber: 29 BAB eksplisit (BAB 1–29) + EPILOG. Tiada keputusan
taksonomi/editorial dibuat dalam 4D-8. Teks tidak diubah. Tidak diterbitkan
secara awam.

Fixture sintetik juga digunakan untuk ujian terkawal (`JLN-NOV-9998` etc.).

## Verification

```
npx tsc --noEmit
npm test                          # termasuk structure gate matrix
npm run db:verify                 # 4D-8 schema/FK/unique/index checks
npm run validate-content
npm run build
npm run audit:readiness
npm run test:controlled-publish
npm run test:source-rights
npm run test:structure            # novela + continuous + anthology
npm run test:novela-race          # 4D-8R: true mid-publish Novela race
npm run test:bersiri-race         # 4D-8R: true mid-publish Bersiri race
npm run test:waktu-sebenar        # 4D-8R: 29-BAB structural import
npm run test:mobile-qa            # 4D-8R: viewport QA
```

Magnific generations expected in 4D-8: **0**.

## What remains deferred

Tiada dalam 4D-8 (rujuk arahan §57): reader accounts, saved Works,
reading progress persistence, cross-device resume, Living Text revision
architecture penuh, seasons, story arcs DB, character/canon DB,
recommendations, notifications, reactions/comments, reader voting,
open subscriptions, AI continuity scoring, public AI ratings.
