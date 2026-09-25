# Jalin Work Schema Proposal v1

Status: PROPOSAL — untuk semakan editorial/AI sebelum kod
Tarikh: 22 September 2026
Author: OpenCode/big-pickle

Dokumen ini mencadangkan skema data untuk item kandungan Jalin (Work), jenis kredit dan sejarah editorial. Ia selari dengan `docs/CONTENT_LAYER_MIGRATION_PLAN.md` dan tidak melaksanakan sebarang kod.

---

## 1. Work types

Setiap Work tergolong dalam satu jenis yang mengenal pasti bentuk, struktur dan peraturan editorialnya.

| Type | Penerangan | Struktur | Pagination |
|---|---|---|---|
| `cerpen` | Karya asli lengkap pendek-sederhana | satu Work | pilihan |
| `novela` | Karya asli long-form lengkap, satu Work | bab/bahagian dalaman | ya (Waktu Sebenar) |
| `bersiri` | Karya asli episodik; setiap episod adalah Work dengan `series_id` | episod canonical | tidak (per episod) |
| `fragmen` | Sedutan bermakna karya domain awam | satu Work + provenance | tidak |
| `sinopsis` | Penceritaan semula editorial karya lain | satu Work + provenance | pilihan |

Peraturan asas:

- `cerpen`, `novela`, `fragmen`, `sinopsis` ialah satu Work walaupun panjang.
- `bersiri` terdiri daripada episod; setiap episod adalah Work berasingan dengan `series_id`.
- `novela` bukan `bersiri` dan bukan novel penuh.
- Novel dan Novel Pendek **tidak** berada dalam taxonomy Jalin.

```ts
export type WorkType =
  | "cerpen"
  | "novela"
  | "bersiri"
  | "fragmen"
  | "sinopsis";

export type WorkStatus =
  | "draft"
  | "review"
  | "ready"
  | "published"
  | "archived";
```

---

## 2. Work record

Field utama bagi satu Work (frontmatter dalam `content/works/<slug>.md`).

```ts
export interface Work {
  id: string;                    // contoh: "JLN-CER-0002"
  slug: string;                  // contoh: "nombor-giliran-117"
  title: string;
  type: WorkType;
  genre: string;
  status: WorkStatus;

  audience?: string;             // contoh: "13-17"
  dek?: string;                  // deskripsi ringkas / subjudul
  readingMinutes?: number;       // anggaran masa baca

  publishedAt?: string;          // ISO date
  updatedAt?: string;            // ISO date
  version: string;               // contoh: "v1.1"

  seriesId?: string;             // hanya untuk bersiri (Work episodik)

  body: {
    kind: "markdown";
    source: string;              // path relatif kandungan, contoh "content/works/nombor-giliran-117.md"
  };

  credits: Credit[];
  visuals: VisualRef[];
  glossary: GlossaryEntry[];
  editorialHistory: EditorialRevision[];

  // Metadata provenance untuk karya derivative sahaja
  sourceWork?: SourceWorkRef;
}
```

Nota:

- Sumber kebenaran metadata = frontmatter; bidang tidak digunakan boleh diabaikan.
- `audience`, `dek`, `readingMinutes` ialah metadata awam (bukan dalaman).
- `sourceWork` hanya perlu untuk `fragmen`, `sinopsis`.

---

## 3. Credit roles

Sistem kredit mengikut logik produksi (kredit filem), bukan jawatan organisasi. Kredit diberikan berdasarkan sumbangan sebenar.

```ts
export interface Credit {
  contributorId: string;   // key contributor, contoh "nara-zahin"
  displayName?: string;    // ganti nama jika berbeza daripada contributor
  role: CreditRole;
  sequence: number;        // susunan paparan
  isPrimary?: boolean;
  public: boolean;         // papar dalam rail / credit penuh?
  note?: string;
}
```

Role disokong (nama skema, bukan hanya label UI):

```ts
export type CreditRole =
  | "original_idea"      // Idea asal
  | "initial_draft"      // Draf awal
  | "writer"             // Penulis
  | "story_editor"       // Penyunting cerita
  | "language_editor"    // Penyunting bahasa
  | "fact_checker"       // Penyemak fakta
  | "final_editor"       // Editor akhir / editor
  | "publication_editor" // Editor penerbitan
  | "research"           // Penyelidikan
  | "translator"         // Penterjemah
  | "adapted_by"         // Adaptasi
  | "retold_by"          // Penceritaan semula
  | "art_direction"      // Pengarah seni
  | "illustrator"        // Ilustrator
  | "visual_editor"      // Penyunting visual
  | "rights_review";     // Semakan hak & sumber
```

Peraturan:

- Kredit berdasarkan sumbangan, bukan jawatan. Penyunting bahasa tidak boleh diberi role `writer` melainkan benar-benar menulis.
- Contributor dirujuk melalui `contributorId`; fail `content/contributors/<id>.md` menyimpan nama, bio, jenis (manusia/maya).
- Seorang contributor boleh memegang beberapa role pada Work yang sama (bukan disyorkan melainkan sumbangan sebenar).
- `writer` untuk karya penulis maya menggunakan persona (contoh: Nara Zahin); disclosure `Maya` datang daripada metadata contributor, bukan pekerjaan manual per page.

---

## 4. Revision (EditorialRevision)

Sejarah editorial bagi Living Text. Setiap perubahan bermakna direkodkan; perubahan mikro (koma/typo) tidak wajib.

```ts
export interface EditorialRevision {
  version: string;           // contoh: "v1.1"
  type: RevisionType;        // "initial" | "minor" | "major"
  summary: string;
  date: string;              // ISO date
  contributors?: string[];   // contributorId yang terlibat dalam semakan
  notesInternal?: string;    // butiran dalaman (tidak dipaparkan awam)
}

export type RevisionType = "initial" | "minor" | "major";
```

Peraturan versi:

- `minor`: bahasa, glosari, visual, fakta kecil, kelancaran — v1.1 → v1.2.
- `major`: struktur, plot besar, ending, identiti karya — v1.x → v2.0.
- Major revision tidak boleh disamarkan sebagai kemas kini kecil.
- Sejarah awam hanya memaparkan ringkasan berguna; `notesInternal` dieksklusifkan daripada paparan awam/API.

---

## 5. Glossary entry

Sokongan glosari ringkas bagi perkataan terpilih dalam body.

```ts
export interface GlossaryEntry {
  term: string;
  meaning: string;
  source: string;        // contoh: "Kamus Dewan / PRPM", "Glosari editorial Jalin"
}
```

- Makna mestilah ringkas dan sesuai remaja.
- Reader memadankan istilah dalam body (existing tooltip approach) tetapi data berasal daripada content, bukan TS.

---

## 6. Visual reference

Provenance visual + rujukan scene/aset — bukan penyimpanan fail.

```ts
export interface VisualRef {
  role: string;              // "hero" | "inline-nasi-lemak" | ...
  scene: string;             // deskripsi adegan untuk generation/verification
  assetKey?: string;         // storage key / URL production
  creationId?: string;       // Magnific creation ID (provenance)
  model?: string;            // contoh: "Seedream 5 Pro"
}
```

Peraturan:

- Semua imej yang dijana/diedit untuk Jalin WAJIB melalui Magnific.
- Muka manusia tidak jelas secara default.
- Setiap visual dipaut pada adegan teks spesifik.
- Provenance aset berada di `content/visuals/<work>.json`; rujukan Work menyenaraikan visual yang digunakan.

---

## 7. Source work (derivative)

Untuk `fragmen`, `sinopsis`. Wajib untuk status selain draft.

```ts
export interface SourceWorkRef {
  originalTitle: string;
  author: string;
  originalLanguage: string;
  publicationYear?: number;
  sourceEdition?: string;
  sourceUrl?: string;
  rightsStatus: "public_domain" | "licensed" | "unknown_need_review";
  rightsNotes: string;
  verifiedAt?: string;
  verifiedBy?: string;
}
```

Karya derivative tidak boleh `ready`/`published` tanpa provenance dan semakan hak penggunaan yang mencukupi.

---

## 8. Contributor record

```ts
export interface Contributor {
  id: string;            // contoh: "nara-zahin"
  name: string;
  kind: "human" | "virtual";
  role?: string;         // label ringkas, contoh "Penulis Maya"
  bio?: string;
  disclosure?: string;   // kenyataan maya/human
  status: "draft" | "published" | "archived";
  avatarKey?: string;
}
```

- `content/contributors/<id>.md` menjadi sumber tunggal senarai contributor (bukan whitelist).
- Byline dan kredit lengkap membaca daripada sini.

---

## 9. Acceptance criteria

Proposal dianggap diluluskan untuk peringkat reka bentuk apabila:

1. Skema menyokong semua enam Work type (cerpen–sinopsis) tanpa percanggahan.
2. Credit flexibel kepada role yang berbeza dan menyokong mana-mana contributor (manusia/maya) bagi satu karya.
3. EditorialRevision menyokong initial/minor/major dengan pemisahan awam/dalaman.
4. Glossary dan visual dirujuk daripada content, bukan TS.
5. Skema tidak memaksa perubahan schema DB (belum ada DB) dan tidak overengineer MVP.
6. Karya sedia ada (Kerusi, Nombor) boleh dimigrasi tanpa perubahan pengalaman pembaca.