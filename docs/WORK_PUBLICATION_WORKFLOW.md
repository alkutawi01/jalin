# Work Publication Workflow v1

Status: TEMPLATE extend — dokumen perancangan FASA 2E-1 (dokumentasi sahaja, tiada kod)
Tarikh: 22 September 2026
Milestone: FASA 2E-1 — Takrifkan aliran penerbitan karya baharu

## 1. Cara menambah karya baharu

Satu karya = satu fail Markdown di `content/works/<slug>.md`.

Contoh:

```md
---
id: JLN-CER-0003
slug: karya-baharu
title: Karya Baharu
type: cerpen
status: published
version: "v0.1"
publishedAt: "2026-09-22"
updatedAt: "2026-09-22"
...
---

# Karya Baharu

Isi cerita di sini.
```

Selepas fail dimasukkan, tiada fail kod yang perlu disentuh:

- `src/app/cerpen/page.tsx` — automatik membaca melalui `getWorksByType("cerpen")`;
- `src/app/cerpen/[slug]/page.tsx` — automatik menjana route melalui `generateStaticParams`.

Aliran pembaca:

```
/cerpen
   ↓
getWorksByType("cerpen")
   ↓
Work cards
   ↓
/cerpen/<slug>
   ↓
WorkLoader
   ↓
Work content
```

## 2. Metadata wajib

Setiap `content/works/<slug>.md` MESTI mengandungi field berikut:

| Field | Jenis | Contoh | Nota |
| --- | --- | --- | --- |
| `id` | string | `JLN-CER-0003` | ID unik merentas semua Work. Corak: `JLN-<TYPE><BERURUT>`. |
| `slug` | string | `karya-baharu` | Sepadan dengan nama fail; untuk URL `/cerpen/<slug>`. |
| `title` | string | `Karya Baharu` | Tajuk paparan. |
| `type` | enum | `cerpen` | Sedia: `cerpen, novela, bersiri, fragmen, sinopsis`. |
| `status` | enum | `published` | Sedia: `draft, review, ready, published, archived`. |
| `version` | string | `"v0.1"` | Versi kandungan semasa. |
| `credits` | array | lihat §4 | Rujukan kepada `content/contributors/`. |
| `visuals` | array | lihat §3 | Rujukan aset visual + provenance. |
| `glossary` | array | `[{ term, meaning, source }]` | Glosari yang dipaparkan dengan karya. |
| `editorialHistory` | array | `[{ version, type, summary, date }]` | Rekod semakan editorial. |

Field sokongan (pilihan tetapi digalakkan):

- `genre`, `audience`, `dek`, `readingMinutes`;
- `publishedAt`, `updatedAt` (dipakai untuk sorting kategori: `updatedAt` DESC, fallback `publishedAt` DESC);
- `metadata.characters` — senarai watak;
- `reader.note` — nota panel bacaan AI;
- `sourceWork` — pustaka provenance asal (untuk `fragmen`/`sinopsis`).

Rujukan schema penuh: `src/lib/content/types.ts`.

## 3. Asset workflow

Semua imej Jalin dijana/diproses melalui **Magnific**.

Urutan yang betul:

1. Hasilkan/muat naik imej melalui Magnific;
2. Rekod provenance (id ciptaan + peranan) dalam nota kerja dalaman;
3. Rujuk visual dalam frontmatter Work:

```yaml
visuals:
  - role: hero
    src: "https://..."
    alt: "Perihal imej."
    provider: Magnific
    creationId: "<ID BUKAN PEMBOLEH>"
```

Untuk visual inline tambah kedudukan:

```yaml
    anchor: "Teks penuh perenggan di mana visual disisip."
    place: after   # atau before
```

Peraturan:

- `provider: Magnific` dan `creationId` WAJIB direkod untuk jejak provenance;
- jangan gantikan Magnific dengan generator lain tanpa arahan manusia;
- URL Magnific bersigned boleh tamat (cth Okt 2026) — pemindahan ke storan durable ditangguh ke fasa asset durability, tidak menghalang penerbitan semasa.
- pelanggaran provenance dianggap kegagalan editorial, bukan variasi kreatif.

Rujukan: `docs/VISUAL_GENERATION_GUARDRAILS.md`, `docs/VISUAL_BIBLE.md`.

## 4. Contributor workflow

Setiap penyumbang mempunyai fail `content/contributors/<slug>.md`:

```md
---
name: "Nama Penyumbang"
kind: "human"      # atau virtual
role: "Editor"     # atau Penulis/Penyemak ...
status: "published"
---

# Nama Penyumbang
```

- **Manusia**: `kind: "human"` — editor manusia, kawal selia penerbitan (cth `izzat-anas`).
- **Virtual**: `kind: "virtual"` — persona editorial Jalin, dijana dengan bantuan AI, bekerja di bawah kawal selia editorial manusia (cth `nara-zahin`, `rafiq-naim`). Identiti mustahil dikeliru sebagai manusia sebenar.

Dalam `credits` Work, rujuk contributer dengan slug:

```yaml
credits:
  - contributor: nara-zahin
    role: initial_draft
    byline: true
  - contributor: izzat-anas
    role: final_editor
    byline: false
```

Peraturan:

- contributor MESTI wujud sebelum Work dirujuk padanya;
- sekurang-kurangnya satu contributor `byline: true`;
- sekurang-kurangnya satu editor manusia (`kind: "human"`) dalam kredit bagi karya `published`.

## 5. Validation checklist

Sebelum karya dipertimbangkan sedia diterbitkan:

- [ ] `npm run build` lulus (semua route statik terjana);
- [ ] metadata lengkap: kesemua field wajib dalam §2 ada;
- [ ] contributor dirujuk wujud dalam `content/contributors/`;
- [ ] visual ada provenance (`provider` + `creationId`);
- [ ] glossary diuji — istilah dipaparkan dan berfungsi pada reader;
- [ ] reader diuji — `/cerpen/<slug>` memaparkan karya dengan betul (tajuk, dek, kredit, glosari, visual);
- [ ] indeks `/cerpen` memaparkan karya baharu dalam kedudukan `updatedAt` yang betul;
- [ ] slug tidak bertindih dengan karya lain;
- [ ] `editorialHistory` mencerminkan versi semasa (`version`).

## Skop yang sengaja TIDAK dibina (buat masa ini)

- CMS / admin panel;
- pangkalan data;
- autentikasi / log masuk;
- pipeline automasi penerbitan.

Matlamat FASA 2E ialah menguji hipotesis:

> "Jika editor mahu tambah cerpen ketiga, adakah hanya perlu tambah satu fail Markdown?"

Ujian sebenar (FASA 2E-2): tambah cerpen ketiga melalui model Work sahaja, tanpa menyentuh kod.