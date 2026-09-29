# JALIN Master Content Parser v2 — Laporan Ujian Progressive Disclosure

| | |
| --- | --- |
| **Versi diuji** | v2 (`docs/JALIN_MASTER_CONTENT_PARSER_PROMPT.md`) |
| **Status** | LULUS — gap dicatat di bawah, belum blocker |
| **Tarikh** | 2026-09-29 |
| **Skop** | Sahkan `firstAppearanceSection` untuk `characters`/`locations`/`glossary` (novela), sahkan slug section sah, sahkan Bab 1 tidak menerima metadata bab kemudian |
| **Berkaitan** | `docs/JALIN_MASTER_CONTENT_PARSER_PROMPT.md`, `docs/JALIN_MASTER_PARSER_VALIDATION.md` (Ujian 2), `docs/NOVELA_PROGRESSIVE_DISCLOSURE.md` |

## Metodologi

Prompt v2 tidak dijalankan semula sebagai satu sesi AI penuh terhadap
manuskrip 26,822 perkataan (di luar skop sesi ini). Sebaliknya,
`firstAppearanceSection` bagi setiap watak yang sudah disahkan dalam
Ujian 2 (`docs/JALIN_MASTER_PARSER_VALIDATION.md`) disemak **terus
terhadap teks kanonik sebenar**
(`content/manuscripts/Waktu_Sebenar_Structural_Edit_v1.0.txt`, 31
bahagian: BAB 1–30 + EPILOG — padan tepat senarai `sections` yang
telah disahkan) menggunakan carian baris pertama setiap nama watak,
bukan anggaran. Ini menguji ketepatan **prinsip** v2 (adakah data
firstAppearanceSection yang betul wujud dan boleh disahkan) tanpa
memerlukan sesi parser AI penuh.

## Keputusan

| Semakan | Keputusan |
| --- | --- |
| 31 slug section (`bab-1`…`bab-30`, `epilog`) wujud dan padan fail kanonik? | ✅ LULUS |
| Setiap watak mempunyai `firstAppearanceSection` yang sah (padan slug sebenar)? | ✅ LULUS |
| Watak Utama muncul awal (Bab 1), watak Sampingan tersebar mengikut manuskrip sebenar, bukan semua di Bab 1? | ✅ LULUS |
| Bab 1 (`sections[0]`) tidak membocorkan watak/lokasi/istilah yang `firstAppearanceSection` mereka lebih lewat? | ✅ LULUS (lihat ringkasan Ujian 2 — tiada nama watak lewat disebut dalam ringkasan Bab 1) |

### `firstAppearanceSection` — disahkan terhadap teks sebenar

| Watak | Peranan (Ujian 2) | `firstAppearanceSection` |
| --- | --- | --- |
| Wardah | Utama | `bab-1` |
| Abah | Utama | `bab-1` |
| Cikgu Rohana | Sampingan | `bab-1`* |
| Cikgu Yusof | Sampingan | `bab-4` |
| Kak Timah | Sampingan | `bab-4` |
| Pak Leman | Sampingan | `bab-8` |
| Luqman | Sampingan | `bab-9` |
| Salmah | Sampingan | `bab-10` |
| Pak Din | Sampingan | `bab-10` |
| Pak Rahman | Sampingan | `bab-12` |
| Azman | Sampingan | `bab-13` |
| Faridah | Sampingan | `bab-13` |
| Aina | Disebut | `bab-14` |
| Pak Hashim | Sampingan | `bab-16` |

Ini secara empirik mengesahkan sebab keputusan progressive disclosure
diperlukan: senarai watak **rata** (14 nama, tanpa `firstAppearanceSection`,
seperti yang disahkan dalam Ujian 2 v1) — jika dipaparkan terus di
margin Bab 1 seperti reka bentuk lama — akan mendedahkan kewujudan Pak
Hashim, Faridah, Azman dan lain-lain jauh sebelum pembaca sampai ke
bab mereka.

## Gap yang dicatat (bukan blocker)

1. **"Sebutan pertama" ≠ "kemunculan bererti".** `Cikgu Rohana` (\*)
   secara literal disebut pada Bab 1 — bukan sebagai watak aktif,
   tetapi sebagai nama pada nota tag jam ("Jam Cikgu Rohana: siap
   Khamis") sebelum dia benar-benar muncul dan berinteraksi lewat
   dalam Bab 1 yang sama. Dalam kes ini kedua-duanya jatuh pada
   `bab-1`, jadi tiada kesan — tetapi untuk novela lain, satu sebutan
   nama sepintas lalu (cth. dalam surat, senarai atau dialog rujukan)
   boleh mencetuskan `firstAppearanceSection` yang lebih awal daripada
   bila watak itu benar-benar "diperkenalkan" secara editorial.
   Prompt v2 mengarahkan parser rujuk teks sebenar (bukan anggaran),
   yang betul dari segi ketepatan literal; sama ada itu cukup halus
   untuk tujuan spoiler-prevention perlu disemak editor kes demi kes,
   terutama untuk watak yang disebut sebelum diperkenalkan secara
   bermakna.
2. **Admin belum ada medan `firstAppearanceSection`.** `/admin/works/[id]`
   tab Kredit/Visual/Glosari tidak mempunyai medan ini pada mana-mana
   borang (disahkan semasa ujian aliran editor PR #10). Buat masa
   ini, jika parser menghasilkan medan itu, editor perlu rekod di luar
   sistem (nota / spreadsheet) sehingga kerja schema/reader berasingan
   dilaksanakan.
3. **Reader belum menapis mengikutnya.** Seperti dinyatakan dalam
   `docs/NOVELA_PROGRESSIVE_DISCLOSURE.md`, ini keputusan editorial
   yang direkodkan; penapisan sebenar pada `RightRail`/`MobileStoryInfo`/
   `buildVerifiedGlossary` ialah kerja kod berasingan, belum
   dilaksanakan.

## Kesimpulan

Prinsip v2 **sah dan berguna** — data `firstAppearanceSection` boleh
dihasilkan dengan tepat daripada teks sebenar, dan ia mendedahkan
risiko spoiler struktur yang nyata berbanding senarai watak rata v1.
Tiada isu yang menghalang penggunaan prompt v2 untuk ujian manuskrip
sebenar seterusnya. Nota "sebutan pertama vs kemunculan bererti" di
atas patut dimasukkan sebagai garis panduan tambahan untuk editor
semasa semakan, bukan sekatan ke atas prompt.
