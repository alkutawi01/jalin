# Content Model v0.3

Dokumen ini menerangkan model konseptual; schema sebenar belum dilock.

## Core entity: Work

Semua kandungan awam menggunakan unit `Work`.

Cadangan field:
- id
- slug
- title
- kind: cerpen | novela | bersiri (Novela and cerpen are single works; bersiri has multiple episodes)
- series_id: nullable
- genre
- dek / short_description
- status
- access_mode: free | subscriber | promotional
- hero_asset_id
- source_work_id: nullable
- section: nullable (e.g. "rumah" section for targeted homepage links)
- sectionPath: nullable (e.g. "/cerpen" for homepage cards)
- first_published_at
- updated_at
- current_version

### Work ID Convention
Format: `JLN-{TYPE}-{NUMBER}` where:
- `CER` = Cerpen
- `NOV` = Novela
- `BER` = Bersiri
- `FRA` = Fragmen
- `SIN` = Sinopsis

Example: `JLN-CER-0001`, `JLN-NOV-0001`

### Slug Format
- Cerpen, Novela, Fragmen, Sinopsis: `/kategori/{type}/{slug}` (contoh: `/kategori/cerpen/rumah`)
- Novela sections: `/kategori/novela/{workSlug}/{sectionSlug}` (canonical Work kekal `/kategori/novela/{workSlug}`)
- Series landing: `/kategori/bersiri/{seriesSlug}`
- Bersiri episod (canonical): `/kategori/bersiri/{seriesSlug}/{episodeSlug}`
- Bersiri episod flat (backward-compat): `/kategori/bersiri/{episodeSlug}` → redirect ke nested

## Content body and pagination


Body boleh dipecahkan secara teknikal kepada `ReadingSection` untuk pagination dan progress.

### ReadingSection (`reading_sections`)
- id
- work_id
- slug (unik per Work; format lowercase-hyphen)
- title: nullable
- position (integer >= 1; unik per Work; contiguously 1..N)
- body
- reading_minutes: nullable

Novela boleh mempunyai bab atau bahagian dalaman dalam ReadingSection, tetapi bab itu tidak menjadi Work berasingan.

Jika sections kosong, `works.body` kekal struktur tunggal. Apabila sections wujud, ia menjadi struktur kanonik pembaca (sections take precedence).

Pagination ialah presentation/read-state concern, bukan taxonomy kandungan.

## Bersiri

### Series (`series`)
- id
- slug (unik)
- title
- dek / genre / audience: nullable
- mode: continuous | anthology
- status: ongoing | completed

### SeriesEntry (`series_entries`)
- id
- series_id
- work_id (unik — satu Work hanya dalam satu Series)
- position (integer >= 1; unik per Series; contiguously 1..N)

Setiap episod Bersiri direkodkan sebagai Work dengan `type: bersiri` dan keahlian melalui `series_entries`.

Ini membolehkan setiap episod mempunyai:
- URL sendiri;
- ilustrasi sendiri;
- glosari sendiri;
- publish date sendiri;
- progress sendiri.

Penerbitan episod berlaku secara independen melalui Work status. Membership tidak pernah auto-publish.

**Public eligibility:**
- `continuous`: contiguous published prefix dari position 1 sahaja.
- `anthology`: setiap episod published independently visible.
- Zero eligible episodes → Series tidak discoverable.

Lihat `docs/PHASE_4D_8_NOVELA_BERSIRI_STRUCTURE.md` untuk model penuh.

## EditorialRevision

Digunakan untuk sejarah editorial karya hidup.

Cadangan field:
- id
- work_id
- version
- revision_type: minor | major
- summary
- reviewed_at
- published_at
- approved_by
- notes_internal: nullable

Prinsip:
- typo/koma kecil tidak perlu menghasilkan rekod awam;
- perubahan bahasa, visual, fakta kecil atau glosari boleh direkod sebagai minor;
- perubahan struktur, plot, ending atau identiti karya direkod sebagai major;
- sejarah editorial awam hanya memaparkan ringkasan yang berguna kepada pembaca.

## SourceWork


Cadangan field:
- id
- original_title
- author
- original_language
- publication_year
- source_edition
- source_url_or_reference
- rights_status
- rights_notes
- verified_at
- verified_by

Tiada content derivative berasaskan karya lama boleh READY tanpa provenance yang mencukupi.

### Dua bentuk Fragmen (keputusan editorial dikemas kini 2 Oktober 2026)

- **Fragmen asal**: bahasa petikan yang diterbitkan sama dengan bahasa karya sumber. Petikan asal bahasa Melayu **atau bahasa Indonesia** boleh diterbitkan tanpa diterjemah. “Asal” tidak bermaksud karya milik Jalin atau automatik domain awam.
- **Fragmen terjemahan**: bahasa petikan yang diterbitkan berbeza daripada bahasa karya sumber. Rekod asas teks/terjemahan dan kredit penterjemah sebenar sebelum terbit.
- Pengecualian bahasa Indonesia ini khusus untuk **Fragmen asal yang tidak diterjemah**. Fragmen asal bahasa Inggeris atau bahasa lain masih memerlukan terjemahan Melayu sebelum diterbitkan. Fragmen terjemahan diterbitkan dalam bahasa Melayu dan tetap memerlukan asas teks serta kredit penterjemah sebenar.
- Satu karya sumber asal (tajuk asal + penulis asal) tidak boleh diterbitkan serentak dalam dua jenis Jalin yang berbeza. Semakan penerbitan menyekat pertindihan dengan karya yang sudah diterbitkan.
- Simpan bahasa petikan diterbitkan dalam `works.metadata.fragmenTextLanguage`; bahasa karya sumber kekal dalam `source_works.original_language`. Jenis Fragmen diterbitkan sebagai hasil perbandingan kedua-duanya, bukan pilihan bebas yang boleh bercanggah dengan data.
- Kedua-duanya tetap melalui semakan hak sumber oleh editor manusia. Perubahan bahasa petikan selepas kelulusan membatalkan kelulusan hak supaya semakan dibuat semula.
- Jika tajuk paparan Fragmen berbeza daripada tajuk karya sumber (misalnya tajuk petikan atau tajuk terjemahan), paparkan tajuk asal dengan label jelas pada halaman pembaca.

## GlossaryTerm

- id
- work_id
- reading_section_id: nullable
- term
- meaning
- occurrence/anchor metadata
- pronunciation: nullable (cara sebut, cth. mu-dif)
- original_text: nullable (istilah dalam tulisan bahasa asalnya, cth. Arab)
- original_language: nullable (cth. Arab; dipaparkan hanya bersama original_text)

Makna mesti ringkas.

Cara sebut dan ejaan asal (migration 023) pilihan, untuk perkataan pinjaman. Ia dipaparkan satu baris di bawah istilah dalam tooltip glosari, dan diisi oleh editor atau oleh chatbot hanya jika pasti (baris Sebutan, Bahasa asal dan Ejaan asal dalam [GLOSARI]; jangan meneka). Perkataan asing dalam teks, nama watak dan latar memakai tanda *teks* untuk italik, dan kad Watak, Latar tempat dan Latar masa memaparkannya.

## Contributor

- id
- display_name
- kind: human | virtual
- role
- bio
- avatar_asset_id
- disclosure
- virtual_badge_label: nullable

### Internal-only contributor metadata
Mapping model seperti Claude/ChatGPT tidak perlu dipaparkan pada byline awam kecuali editor memilih untuk berbuat demikian.

AI tools names must never appear publicly. Use human pen names:
- ChatGPT → "Rafiq Naim" (writing assistant)
- MiMo → "Amir Syafiq" (editorial assistant)

## Credit

Credit perlu fleksibel dan berasaskan sumbangan sebenar, bukan hard-coded kepada beberapa jawatan sahaja.

Cadangan field:
- id
- work_id
- contributor_id: nullable
- display_name
- role_key
- role_label
- sequence
- is_primary
- public
- note: nullable

Contoh `role_key`:
- original_idea
- initial_draft
- written_by
- story_editor
- language_editor
- fact_checker
- final_editor
- publication_editor
- research
- translated_by
- translation_editor
- adapted_by
- retold_by
- source_author
- art_direction
- illustrated_by
- visual_editor
- rights_review

UI tidak perlu memaparkan semua peranan pada rail kanan. Rail menunjukkan kredit utama; panel/section **Kredit penuh** memaparkan keseluruhan produksi.

## Asset

Metadata sahaja. Fail media berada di object storage.
- id
- type
- storage_key
- alt_text
- width
- height
- approved
- visual_reference_role
- provider
- provider_creation_id: nullable

## ReadingProgress

- user_id
- work_id
- reading_section_id: nullable
- position
- updated_at

## SavedWork

- user_id
- work_id

## Future-ready, bukan MVP wajib

Model hendaklah boleh dikembangkan untuk:
- subscription/access grants;
- reader feedback;
- notifications;
- series influence signals;
- thematic collections;
- richer editorial metadata.

Jangan bina UI untuk ciri masa depan hanya kerana field mungkin disediakan.
