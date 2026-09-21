# Content Model v0.1

Dokumen ini menerangkan model konseptual; schema sebenar belum dilock.

## Core entities

### Work
- id
- slug
- title
- type: short_story | short_novel | serial
- genre
- synopsis
- status
- access_mode: free | subscriber | promotional
- hero_asset_id
- published_at

### Chapter
Untuk Novel Pendek dan Bersiri.
- id
- work_id
- number
- title
- body
- status
- published_at

Cerpen tunggal tidak memerlukan Chapter kecuali keputusan teknikal kemudian menyederhanakan storage.

### GlossaryTerm
- id
- work_id atau chapter_id
- term
- meaning
- occurrence/anchor metadata

Makna mesti ringkas.

### Contributor
- id
- display_name
- kind: human | virtual
- role
- bio
- avatar_asset_id
- disclosure

### Credit
Menyokong kredit berperingkat seperti:
- original_story
- drafted_by
- reviewed_by
- translated_by
- illustrated_by

### Asset
Metadata sahaja. Fail media berada di object storage.
- id
- type
- storage_key
- alt_text
- width
- height
- approved
- visual_reference_role

### ReadingProgress
- user_id
- work_id
- chapter_id
- position
- updated_at

### SavedWork
- user_id
- work_id

## Future-ready, bukan MVP wajib

Model hendaklah boleh dikembangkan untuk:
- subscription/access grants;
- reader feedback;
- notifications;
- series influence signals;
- richer editorial metadata.

Jangan bina UI untuk ciri masa depan hanya kerana field mungkin disediakan.
