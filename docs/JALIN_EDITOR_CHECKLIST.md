# Checklist Operasi Editor — Manuskrip hingga Published

| | |
| --- | --- |
| **Status** | Checklist operasi. Tiada kod diubah. |
| **Tarikh** | 2026-09-29 |
| **Skop** | Untuk 4 jenis karya (Cerpen, Novela, Fragmen, Sinopsis): langkah import manual, medan wajib, medan pilihan, gate sebelum publish, anggaran masa. |
| **Kaedah** | Digabung drpd `JALIN_PRODUCTION_READINESS_AUDIT.md`, `JALIN_VISUAL_WORKFLOW_AUDIT.md`, `JALIN_CONTENT_MODEL_READINESS_AUDIT.md`, dan ujian hidup cerpen sebenar (2026-09-29). Bersiri **tiada** dalam senarai ini (tidak diminta) — lihat nota di hujung. |
| **Berkaitan** | `docs/JALIN_MASTER_CONTENT_PARSER_PROMPT.md` (v2), fail-fail audit di atas |

## Cara guna checklist ini

Untuk setiap karya baharu: salin senarai jenis berkenaan, tandakan
setiap langkah bila selesai. "Medan wajib" mesti diisi sebelum gate
publish lulus. "Medan pilihan" boleh dilangkau (jadi AMARAN, bukan
BLOCKER).

---

## 1. Cerpen

**Anggaran masa total**: ~20–35 minit (tanpa visual sebenar) — disahkan
hampir tepat melalui ujian hidup 2026-09-29 (isi kandungan+metadata+
kredit+watak: ~15 minit).

### Langkah import manual

1. Jalankan Master Content Parser v2 atas manuskrip (luar sistem — ChatGPT/Claude) → terima JSON + Editor Report.
2. `/admin/works/new`: tampal `title`, `dek`, manuskrip penuh (body), `genre`. Semak `slug`/`readingMinutes` auto-cadang (biasanya padan parser). Simpan Draf.
3. Tab **Kredit**: untuk `author` parser → tambah kredit (Contributor sedia ada atau Nama Tetamu) + Peranan + Byline/Public.
4. Tab **Watak**: salin setiap `characters[]` → Nama + Peranan. Simpan.
5. Tab **Glosari**: salin setiap `glossary[]` → Term + Meaning. Simpan setiap satu.
6. Visual: buka `/admin/visual-requests/new` berasingan, salin setiap `visualSuggestions[]` → Prompt (scene+reason), Anchor (scene), Role. Simpan sebagai draf. (Penjanaan/kelulusan sebenar — lihat gate di bawah.)
7. Naikkan Status → `ready` bila semua sedia.

### Medan wajib (blocker jika tiada)

- Tajuk, slug (unik), manuskrip/body, jenis, status `ready`/`published`.
- Sekurang-kurangnya satu kredit, dengan Peranan diisi, dan sekurang-kurangnya satu byline awam.
- Visual hero (jenis cerpen: **wajib**) — src sebenar, alt text, `is_asset_finalized = true`.

### Medan pilihan (amaran jika tiada, bukan blocker)

- Dek/ringkasan.
- Glosari.
- Watak (tiada gate khusus buat masa ini).

### Gate sebelum publish

- Semua di atas + slug tidak berlanggar dgn fail Markdown lain.
- Privasi (tiada data sulit terselit), Struktur (n/a utk cerpen), Aliran kerja PASS.

---

## 2. Novela

**Anggaran masa total**: jauh lebih tinggi drpd cerpen — bergantung
bilangan bab. Anggaran kasar: ~15–20 minit setup + **~10–15 minit
per bab** (tampal body bab sebenar + slug/tajuk/position setiap satu).
**Belum disahkan hidup** dlm pass ini (hanya semakan kod).

### Langkah import manual

1–6. Sama seperti Cerpen, TAMBAH:
   - `characters[].firstAppearanceSection` turut direkod (medan tambahan pada tab Watak, khusus novela).
   - `glossary[].firstAppearanceSection` **tiada destinasi** (rekod di luar sistem buat masa ini — gap sedia diketahui).
7. Tab **Bahagian** (reading_sections) — untuk SETIAP bab dlm `sections[]` parser: slug, tajuk, **tampal teks manuskrip SEBENAR bab itu** (parser TIDAK beri teks penuh, hanya `summary` rujukan editor — jangan salin `summary` sebagai body). Position mesti 1..N berturutan tanpa jurang.
8. Naikkan Status → `ready`.

### Medan wajib

- Sama seperti Cerpen, TAMBAH:
- Sekurang-kurangnya satu `reading_section` (atau `body` karya diisi terus, tapi sections diutamakan) dgn body, slug sah, position berturutan tanpa jurang/pendua.
- Visual hero: **wajib** (sama polisi dgn cerpen).

### Medan pilihan

- Sama seperti Cerpen.
- `firstAppearanceSection` pada watak/glosari — direkod untuk kegunaan editorial masa depan (progressive disclosure belum dibina di sisi pembaca — **jangan** anggap ia menapis paparan sekarang).

### Gate sebelum publish

- Sama seperti Cerpen, TAMBAH gate **Struktur**: position 1..N tanpa jurang/pendua, slug bahagian unik & sah, setiap bahagian ada body.

---

## 3. Fragmen

**Anggaran masa total**: ~25–40 minit + **masa semakan hak cipta
manusia (tidak boleh dianggarkan sistem — bergantung sumber)**.
**Belum disahkan hidup** dlm pass ini.

### Langkah import manual

1–6. Sama seperti Cerpen (fragmen guna struktur asas yg sama: tajuk, dek, body, kredit, watak, glosari, visual).
7. Tab **Sumber**: salin `source.{title,author,language,provenance}` parser → `original_title`, `author`, `original_language`, `source_url`/`source_locator`, `source_text_basis`.
8. **WAJIB manusia** (parser TIDAK isi ini): tetapkan `rights_status` (`public_domain`/`licensed`/`permission_obtained` sahaja utk publish), isi `reviewed_by` + `reviewed_at` (rekod semakan sebenar berlaku), `rights_notes` jika status `restricted`/`rejected`.
9. Naikkan Status → `ready`.

### Medan wajib

- Sama seperti Cerpen, TAMBAH:
- `source_works`: `original_title`, `author`, `original_language` (wajib), `source_url` mesti http/https jika diisi.
- `rights_status` PASS (`public_domain`/`licensed`/`permission_obtained`) + `reviewed_by` + `reviewed_at` direkod.
- Visual hero: **disyorkan sahaja** (bukan blocker utk fragmen/sinopsis/terjemahan).

### Medan pilihan

- Dek, glosari, watak — sama seperti Cerpen.
- `source_edition`, `source_locator` — jika ada dlm manuskrip asal.

### Gate sebelum publish

- Sama seperti Cerpen, TAMBAH gate **Hak (Rights)**: status PASS + semakan manusia direkod + hash provenance tidak lapuk (jika provenance diubah selepas kelulusan, perlu disemak semula).

---

## 4. Sinopsis

**Anggaran masa total**: serupa dgn Fragmen (~25–40 minit + masa
semakan hak). **Belum disahkan hidup** dlm pass ini.

### Langkah import manual

Sama sepenuhnya seperti **Fragmen** (jenis derivative sama, gate
Sumber/Hak sama). Perbezaan hanya editorial: sinopsis fokus meringkas
karya asal, fragmen memetik terus sebahagian teks asal.

### Medan wajib

Sama seperti Fragmen.

### Medan pilihan

Sama seperti Fragmen.

### Gate sebelum publish

Sama seperti Fragmen.

---

## Nota

- **Bersiri** tidak disenaraikan (tiada dlm 4 jenis diminta). Struktur
  serupa Novela tetapi guna `series` + `series_entries` merentasi
  berbilang Work (episod), bukan `reading_sections` dlm satu Work.
- Anggaran masa Novela/Fragmen/Sinopsis **belum disahkan hidup** —
  hanya drpd semakan kod + polisi gate. Ujian hidup sebenar (1 novela,
  1 fragmen, 1 sinopsis) akan sahkan/betulkan angka ini, selari dgn
  cadangan "batch percubaan" director.
- Semua masa "semakan hak cipta manusia" (fragmen/sinopsis) sengaja
  tiada anggaran sistem — ia proses editorial manusia sepenuhnya,
  bukan sesuatu Jalin boleh laju/lambatkan.
