# Homepage Curation + Visual Cards (Editor Pick)

Status: live. Tarikh: 2026-09-28. Skop: satu batch UI — homepage bahagian "Pilihan Editor", visual kad karya/kategori, dan kawalan Admin "Editor Pick".

## Keputusan produk

1. Laman utama menunjukkan seksyen **Pilihan Editor** (1–3 karya) diikuti **Karya Terbaru** dan **Jelajahi Kategori**. Seksyen Pilihan Editor hanya dirender apabila ada pick — tiada "empty state" kosong.
2. Pick ditetapkan oleh editor melalui Admin (Karya → tab Metadata): checkbox `Pilihan Editor`, nombor `Kedudukan` (ranking 1–99), dan `Sebab` (nota dalaman — **tidak** dipaparkan kepada pembaca).
3. Semua kad karya (Karya Terbaru, Pilihan Editor, senarai kategori) memaparkan visual `hero` (gambar) atau placeholder gradient editorial dengan monogram tajuk. Kad kategori (Jelajahi Kategori) menerima tint gradient mengikut jenis.
4. Tiada pipeline AI baharu. Tiada lampiran visual, tiada perubahan pada B3/guardrails.

## Schema (migration `019_editor_pick`)

Kolom baharu pada `works` (semua nullable, additive, guarded per-kolom ikut pola 018):

| Kolom | Jenis | Kegunaan |
| --- | --- | --- |
| `editor_pick` | boolean | true = papar di Pilihan Editor |
| `editor_pick_rank` | integer | susunan (kecil dahulu); null = selepas yang beranking |
| `editor_pick_reason` | text | nota editorial admin-sahaja, max 300 aksara |

Sifat data:

- **Bukan sebahagian daripada snapshot revisi terbit** — pick ialah keadaan hidup database, bukan artefak penerbitan. Menukar pick tidak memerlukan publish semula.
- **Bukan sebahagian daripada frontmatter Markdown** — `content:compare` dan sync-status (`metadataChanged`) tidak menyentuhnya; status IN_SYNC kekal tepat.
- Kolom tidak dieksport ke payload awam (tiada `editorPick`/`editorPickReason` dalam projection — ujian `public-rsc-payload` forbidden-keys kekal hijau).

## Aliran data (laman utama)

- Laman utama ditukar kepada `export const dynamic = "force-dynamic"` supaya pick yang ditetapkan admin muncul pada request seterusnya tanpa deploy.
- **Picks dibaca terus** (`src/lib/reader/editor-picks.ts`): `SELECT works WHERE status='published' AND editor_pick=true ORDER BY coalesce(rank, 9999), updated_at DESC LIMIT 3` + `hero` visual bagi work terpilih. Ini mengelakkan kekangan cache repository (repo cache hanya dimuat semula semasa boot proses).
- Mod Markdown / DB-matikan: query ditutup → seksyen Pilihan Editor disembunyikan. Tiada impak pada parity `content:compare` (field picks memang bukan sebahagian daripada model Markdown).
- Aliran lain (Karya Terbaru, kad kategori) kekal seperti sedia ada — repository cache + snapshot seperti biasa.

## Projection

- `PublicWorkSummary` kini turut mempunyai `hero?: { src, alt }` (dipilih daripada visual role `hero`) supaya semua kad karya boleh memaparkan gambar. Tiada field dalaman (id, credits, visuals provenance, glossary source) melintasi sempadan payload.

## UI

- Bahagian homepage: Hero → **Pilihan Editor** → Karya Terbaru → Jelajahi Kategori.
- Pilihan Editor: grid `auto-fit minmax(280px, 1fr)` (1 pick = kad lebar, 2–3 = sama rata), kad berselubung `hero` + kicker jenis/min baca + tajuk + dek + CTA "Baca".
- Kad karya: cover 16:10 (gambar `object-fit: cover`, atau placeholder gradient per-jenis dengan monogram huruf pertama tajuk) di atas teks sedia ada.
- Semua gaya dalam `globals.css`, mobile-first (media query 1050px/680px sedia ada dikemas kini).

## Admin

- `PATCH /api/admin/works/[id]` menyokong tiga medan baharu dengan pengesahan: `editorPick` boolean, `editorPickRank` integer 1–99 (atau null/""), `editorPickReason` string ≤300.
- `work-service`: `WorkInput`/`WorkRecord` + mapping `updateWork` (null apabila kosong).
- UI: blok "Pilihan Editor" pada tab Metadata (checkbox + kedudukan + sebab + hint), disimpan bersama butang "Simpan Perubahan" sedia ada.

## Bukan dalam skop

- Prompt Library (fasa seterusnya).
- Pipeline AI/generation baharu; apa-apa perubahan pada B3.
- Lampiran/lazymod gambar baharu (media query gambar sedia ada sahaja).
- Deck/DB trigger untuk deploy automatik — pick ialah kawalan langsung; perubahan kandungan lain kekal ikut model deploy sedia ada.
- Medan picks dalam Markdown frontmatter.

## Pengesahan

1. `npm run db:schema:migrate` (019 idempotent) → `npm run db:verify` jika perlu.
2. `npm run lint`, `npx tsc --noEmit`, `npm test` (termasuk `public-rsc-payload` forbidden-keys dan `migration-inventory` yang kini menuntut `019_editor_pick`).
3. `npm run validate-content` + `npm run content:compare` (Differences: 0).
4. Satu batch commit + push + `npx vercel --prod --yes`.
5. Verifikasi produksi: homepage 200, seksyen Pilihan Editor tersembunyi apabila tiada pick; kad Karya Terbaru/kategori memaparkan cover/gradient; tiada bocoran field admin dalam payload; halaman NOV/FRA kekal 200 dengan glosari.
6. Toggle pick ujian (set → homepage tunjuk → unset → homepage sembunyi) untuk membuktikan aliran langsung, kemudian serah kepada Director untuk memilih karya rasmi.
