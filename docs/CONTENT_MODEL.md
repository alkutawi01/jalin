# Content Model v0.3

Dokumen ini menerangkan model konseptual; schema sebenar belum dilock.

## Core entity: Work

Semua kandungan awam menggunakan unit `Work`.

Cadangan field:
- id
- slug
- title
- type: cerpen | novela | bersiri | terjemahan | fragmen | sinopsis
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
- `TER` = Terjemahan
- `FRA` = Fragmen
- `SIN` = Sinopsis

Example: `JLN-CER-0001`, `JLN-NOV-0001`

### Slug Format
- Cerpen, Novela, Fragmen, Sinopsis: `/k/{slug}` (e.g. `/k/rumah`)
- Bersiri episodes: `/k/{slug}` for each episode (e.g. `/k/cerita-hujan-ep1`)

## Content body and pagination

Cerpen, Novela, Sinopsis, Terjemahan dan Fragmen ialah **satu Work**, walaupun panjang.

Body boleh dipecahkan secara teknikal kepada `ReadingSection` / `Page` untuk pagination dan progress.

### ReadingSection
- id
- work_id
- sequence
- body
- page_label: nullable
- estimated_read_minutes: nullable

Novela boleh mempunyai bab atau bahagian dalaman dalam ReadingSection, tetapi bab itu tidak menjadi Work berasingan.

Pagination ialah presentation/read-state concern, bukan taxonomy kandungan.

## Bersiri

### Series
- id
- slug
- title
- synopsis
- kind: continuous | anthology
- status: ongoing | completed
- hero_asset_id

Setiap episod Bersiri direkodkan sebagai Work dengan `type: serial_episode` dan `series_id`.

Ini membolehkan setiap episod mempunyai:
- URL sendiri;
- ilustrasi sendiri;
- glosari sendiri;
- publish date sendiri;
- progress sendiri.

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

Digunakan untuk Sinopsis, Terjemahan dan Fragmen.

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

## GlossaryTerm

- id
- work_id
- reading_section_id: nullable
- term
- meaning
- occurrence/anchor metadata

Makna mesti ringkas.

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
