# Content Model v0.2

Dokumen ini menerangkan model konseptual; schema sebenar belum dilock.

## Core entity: Work

Semua kandungan awam menggunakan unit `Work`.

Cadangan field:
- id
- slug
- title
- type: synopsis | short_story | translation | fragment | serial_episode
- series_id: nullable
- genre
- dek / short_description
- status
- access_mode: free | subscriber | promotional
- hero_asset_id
- source_work_id: nullable
- published_at

## Content body and pagination

Cerpen, Sinopsis, Terjemahan dan Fragmen ialah **satu Work**, walaupun panjang.

Body boleh dipecahkan secara teknikal kepada `ReadingSection` / `Page` untuk pagination dan progress, tanpa menukarnya menjadi bab novel.

### ReadingSection
- id
- work_id
- sequence
- body
- page_label: nullable
- estimated_read_minutes: nullable

Pagination ialah presentation/read-state concern, bukan taxonomy kandungan.

## Bersiri

### Series
- id
- slug
- title
- synopsis
- status
- hero_asset_id

Setiap episod Bersiri direkodkan sebagai Work dengan `type: serial_episode` dan `series_id`.

Ini membolehkan setiap episod mempunyai:
- URL sendiri;
- ilustrasi sendiri;
- glosari sendiri;
- publish date sendiri;
- progress sendiri.

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

## Credit

Menyokong:
- original_story
- written_by
- drafted_by
- reviewed_by
- translated_by
- adapted_by
- source_author
- illustrated_by

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
