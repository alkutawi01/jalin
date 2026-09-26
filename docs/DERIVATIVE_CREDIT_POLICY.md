# Derivative Credit Policy

Status: dicadangkan — menunggu kelulusan editorial akhir (Adjung).
Skop: fragmen, sinopsis dan mana-mana karya derivative; karya asli dirujuk di mana berkaitan.
Dokumen ini ringkas. Ia tidak menggantikan `EDITORIAL_SYSTEM.md`; ia menetapkan peraturan kredit untuk karya derivative.

## Prinsip

1. Kredit mesti berdasarkan sumbangan sebenar (AGENTS.md — Hard rules).
2. Pengarang asal, editor Jalin dan penyumbang dalaman ialah tiga kategori berbeza; jangan dicampurkan.
3. AI tidak menerbitkan karya secara autonomi; manusia mempunyai kuasa akhir publish/unpublish.
4. Tiada halaman contributor dicipta untuk pengarang sejarah/klasik.

## Siapa boleh muncul sebagai byline (`Oleh …`)

Byline hanya untuk penulis teks yang dipaparkan kepada pembaca:

| Bentuk | Byline | Alasan |
|---|---|---|
| Fragmen (petikan verbatim) | Pengarang asal sahaja (`guest:`, `byline: true`) | Teks itu milik pengarang sumber |
| Sinopsis / terjemahan Jalin | Tiada byline pengarang sumber (`guest:`, `byline: false`) | Teks yang dipaparkan ditulis oleh Jalin; pengarang asal tetap dikreditkan di rail kanan (`Pengarang asal`) dan baris provenance |
| Karya asli (cerpen/novela/bersiri) | Penulis Jalin berprofil (`byline: true`) | Mereka menulis teks yang dipaparkan |

Konsisten untuk SEMUA karya satu bentuk — jangan campur separuh.

## Pautan byline

- Penulis Jalin berkontributor → pautan ke `/penulis/{slug}`.
- Guest / pengarang sumber → teks sahaja, TIADA pautan, TIADA halaman contributor.
- Pada renderer: `credit.href` wujud → `<a>`; tiada → `<span class="byline-name">`.
- Jangan sekali-kali menjatuhkan pautan kepada `href="#"`.

## Bila "Disediakan oleh" dipaparkan

"Disediakan oleh" ialah kredit penyediaan editorial Jalin (bukan kredit penulis):

- Paparkan HANYA apabila wujud sumbangan penyediaan/seleksi/editorial sebenar oleh Jalin untuk karya itu.
- Untuk fragmen petikan verbatim tanpa sumbangan penulisan Jalin yang dikreditkan → JANGAN paparkan.
- Ia tidak boleh menggantikan kredit pengarang asal yang wajib, dan tidak boleh dipaparkan untuk orang yang tidak menyumbang.

## Keputusan yang ditahan

Kredit penulis Jalin (cth. Rafiq Naim) untuk sinopsis/fragmen → keputusan editorial, all-or-nothing:

- Sebelum kelulusan: tiada kredit penulis pada mana-mana karya derivative.
- Selepas kelulusan: digunakan KONSISTEN untuk semua karya sejenis.
- Validator tidak boleh dilonggarkan untuk membenarkan karya tanpa kredit yang betul.

## Label peranan (whitelist pembaca)

| Role key | Label pembaca |
|---|---|
| `author` | Pengarang asal |
| `initial_draft` | Penulis |
| `story_editor` | Penulis & penyemak |
| `final_editor` | Editor |
| `co_writer` | Penulis bersama |

Role key mentah, enum DB dan nama placeholder tidak pernah sampai ke pembaca; sumbangan tanpa kontributor diluluskan disembunyikan.

## Gate provenance — KEKAL

Karya derivative (fragmen/sinopsis dengan `sourceWork`) hanya boleh `published`/`ready` apabila:

- `sourceWork.title` hadir;
- kredit `role: author` (pengarang asal) hadir;
- reader memaparkan baris provenance (`Sumber asal`, `Bahasa asal`, label hak dibaca).

Gate ini tidak dilonggarkan walaupun untuk ujian. `rightsStatus` ditulis secara jujur dan tidak diubah secara automatik.

## Ujian yang mengunci polisi ini

- `__tests__/validate-content-gate.test.ts` — gate derivative (source + author).
- `__tests__/source-work-reader.test.ts` — provenance reader.
- `__tests__/reader-credit-projection.test.ts` — label peranan, guest tanpa pautan, tiada fallback `#`.
- `__tests__/verified-glossary.test.ts` — glosari disahkan sahaja.
