# Audit: Production Readiness — Manuskrip hingga Published

| | |
| --- | --- |
| **Status** | Audit sahaja. Tiada kod, schema atau UI diubah. Tiada cadangan feature baharu. |
| **Tarikh** | 2026-09-29 |
| **Skop** | (1) Senaraikan semua langkah manual editor drpd manuskrip → published. (2) Ukur medan yang perlu diisi manual. (3) Senaraikan langkah yang BOLEH diautomasikan oleh Master Parser tanpa ubah architecture. |
| **Kaedah** | Semakan kod terus (`src/lib/admin/publication-readiness.ts`, `*-service.ts`, `publish-work.ts`) + ujian hidup sebenar (cerpen "Surat yang Tidak Pernah Selesai", 2026-09-29) + audit `JALIN_VISUAL_WORKFLOW_AUDIT.md`. |
| **Berkaitan** | `docs/JALIN_MASTER_CONTENT_PARSER_PROMPT.md` (v2), `docs/JALIN_CONTENT_MODEL_READINESS_AUDIT.md`, `docs/JALIN_VISUAL_WORKFLOW_AUDIT.md` |

## 1. Senarai langkah manual editor (manuskrip → published)

Ini laluan sebenar dalam UI admin sekarang, disahkan hidup untuk
`cerpen`; jenis lain (novela/bersiri/fragmen/sinopsis) disahkan
melalui kod (belum diuji hidup dalam pass ini — lihat Bahagian 4).

### A. Semua jenis karya

1. `/admin/works/new` — isi Tajuk, Dek, Manuskrip (tampal penuh), Genre. Audience/readingMinutes/slug auto-cadang (boleh ubah). Klik **Simpan Draf** → status mula sebagai `draft`.
2. Tab **Kredit** — untuk setiap penyumbang: pilih Contributor sedia ada ATAU taip Nama Tetamu, isi Peranan, tanda kotak Byline/Public. Simpan (satu-satu).
3. Tab **Watak** *(cerpen/novela — PR #19)* — untuk setiap watak: Nama, Peranan (+ Kemunculan Pertama jika novela). Simpan (satu butang, semua baris sekali).
4. Tab **Glosari** — untuk setiap istilah: Term, Meaning. Simpan (satu-satu, ada mod edit berasingan).
5. Visual (laluan berasingan, `/admin/visual-requests/new`) — Work ID, Role, Prompt, Anchor, Place, Aspect Ratio → cipta rekod `draft`. Kemudian editor: **jana** (Magnific, perlukan kunci API) ATAU **muat naik sendiri** → isi Alt Text → **lulus** (approval_state) → **finalize** → lekat sebagai `visuals` row.
6. Naikkan **Status** karya drpd `draft`/`review` → `ready` (keputusan editorial manusia, bukan automatik).
7. Semak **Publication Readiness** (butang "Semak Semula") — semua gerbang (content/credits/visuals/privacy/rights/struktur/aliran kerja) mesti PASS.
8. Klik **Terbitkan** → `publishWork()` tulis fail Markdown + frontmatter, tetapkan `published_at`.

### B. Tambahan mengikut jenis

- **Novela**: tab **Bahagian** — setiap bab: slug, tajuk, **body (teks manuskrip sebenar bab itu)**, position (mesti 1..N tanpa jurang). `reading_sections` menggantikan `body` karya sebagai struktur kanonik.
- **Bersiri**: cipta/pilih **Series** di `/admin/series`, tambah Work sebagai episod (position dalam siri).
- **Fragmen/Sinopsis** (derivative): tab **Sumber** — original_title, author, original_language, source_url/locator, **rights_status** (mesti `public_domain`/`licensed`/`permission_obtained`), **reviewed_by + reviewed_at** (rekod semakan manusia — WAJIB, tiada laluan automatik), rights_notes jika status `restricted`/`rejected`.

### C. Sekatan yang ditemui semasa ujian hidup (2026-09-29)

- **Perlanggaran slug** dengan fail Markdown sedia ada diblok automatik pada peringkat penerbitan (pengesanan PR #14) — editor kena selesaikan secara manual (tukar slug atau sahkan fail lama tak diperlukan).
- Tab Visual (`/admin/works/[id]`) memerlukan `src` fail sebenar — **bukan** destinasi untuk brief teks; destinasi brief ialah `/admin/visual-requests/new` (lihat `JALIN_VISUAL_WORKFLOW_AUDIT.md`).

## 2. Ukuran medan yang perlu diisi MANUAL (tiada laluan automatik, dan/atau mesti keputusan manusia)

| Medan/Langkah | Kenapa manual (bukan sekadar "belum automasi") |
| --- | --- |
| Status `draft`→`ready`→publish | Keputusan editorial murni — sengaja tiada automasi (gerbang kelulusan). |
| `rights_status`, `reviewed_by`, `reviewed_at` (fragmen/sinopsis/terjemahan) | Parser DILARANG isi hak cipta secara automatik (per Master Prompt "PERATURAN MANDATORI"). Selalu manusia. |
| Penjanaan/muat naik visual sebenar | Perlukan kunci `MAGNIFIC_API_KEY` sebenar + kelulusan manusia (AGENTS.md #15–19). Tiada laluan automatik langsung, sengaja. |
| Alt text visual | Keputusan aksesibiliti — parser tiada input untuk ini. |
| Pemetaan Kredit → Contributor sedia ada vs Nama Tetamu | Parser hanya beri `author.name`/`credit`; sistem tak tahu sama ada nama itu contributor sedia ada (perlu slug) — editor tentukan. |
| Byline/Public checkbox per kredit | Keputusan dedahan editorial (AGENTS.md #5, #23). |
| Penyelesaian perlanggaran slug | Keputusan editorial (fail lama mungkin masih relevan). |
| `body` setiap `reading_sections` (novela) | Parser sengaja TIDAK sertakan teks manuskrip penuh dalam output (Master Prompt: "Jangan sertakan semula teks manuskrip dalam output"). Editor kena tampal teks bab sebenar sendiri. |

## 3. Langkah yang BOLEH diautomasikan oleh Master Parser TANPA ubah architecture

Ini bermakna: medan/jadual destinasi **sudah wujud** hari ini; kerja
sahaja ialah pemetaan salin-tampal (manual ATAU automatik kelak),
tiada jadual/lajur baharu diperlukan.

| Medan output parser | Destinasi sedia ada | Nota pemetaan |
| --- | --- | --- |
| `title`, `dek`, `genre`, `audience`, `readingMinutes`, `slug` | `works` (`/admin/works/new`) | **Disahkan hidup 2026-09-29**: `slug` dan `readingMinutes` auto-cadang sistem PADAN TEPAT dengan output parser untuk manuskrip ujian. |
| `characters[].{name,role,firstAppearanceSection}` | `works.metadata.characters` (tab Watak, PR #19) | Disahkan hidup 2026-09-29. `firstAppearanceSection` hanya novela. |
| `glossary[].{term,meaning}` | `glossary_terms` (tab Glosari) | Laluan wujud. `firstAppearanceSection` pada glossary TIADA destinasi (gap sedia direkod dlm `JALIN_CONTENT_MODEL_READINESS_AUDIT.md`). |
| `visualSuggestions[].{scene,reason}` | `visual_requests.{prompt,anchor}` (`/admin/visual-requests/new`, status `draft`) | Disahkan via audit kod 2026-09-29 (`JALIN_VISUAL_WORKFLOW_AUDIT.md`). Cipta draf TIDAK cetus Magnific. |
| `sections[].{order,slug,title}` (novela) | `reading_sections.{position,slug,title}` | `summary` parser BUKAN untuk `body` — body mesti teks manuskrip sebenar (manual, per Bahagian 2). |
| `episodes[].{order,slug,title}` (bersiri) | `series_entries` + Work per episod | Struktur sedia ada; parser tak isi body episod (sama sebab spt novela). |
| `source.{title,author,language,provenance}` (fragmen/sinopsis) | `source_works.{original_title,author,original_language,source_locator}` | `rights_status`/`reviewed_by`/`reviewed_at` KEKAL manual (Bahagian 2) — parser dilarang isi. |
| `author.{name,credit}` | Tab Kredit (Nama Tetamu + Peranan) | Boleh terus isi sebagai tetamu; pemetaan ke contributor sedia ada tetap manual (Bahagian 2). |

## Kesimpulan

Hampir semua medan struktur/metadata yang dihasilkan Master Parser v2
**sudah** ada destinasi admin sedia ada — tiada perubahan architecture
diperlukan untuk memindahkan data itu. Sekatan sebenar bukan pada
"tiada tempat untuk data", tetapi pada:

1. Keputusan editorial yang sengaja kekal manual (status, hak cipta, byline, kelulusan visual) — ini **reka bentuk**, bukan kekurangan.
2. Teks penuh (body bab/episod) yang parser sengaja tidak keluarkan — editor tetap perlu salin manuskrip sebenar ke setiap bahagian.
3. Pemetaan kredit ke contributor sedia ada — perlukan senarai contributor yang tepat, bukan hanya nama daripada parser.

Tiada cadangan feature/automasi baharu dalam dokumen ini, ikut arahan.
