# Keputusan editorial: Progressive disclosure untuk Novela

Status: DECIDED (dokumentasi sahaja — tiada perubahan schema/kod dalam nota ini)
Tarikh: 29 September 2026
Skop: Novela sahaja (Cerpen, Bersiri episod, Fragmen, Sinopsis tidak terjejas)

## Keputusan

Jalin **tidak** memaparkan senarai penuh watak, lokasi atau istilah glosari
sesebuah Novela kepada pembaca sejak Bab 1. Margin/panel Info sesebuah
bab hanya boleh memaparkan watak, lokasi dan istilah yang **sudah
diperkenalkan** dalam teks setakat bahagian yang sedang dibaca.

Sebab: Novela ialah karya panjang dengan struktur naratif berperingkat.
Memaparkan semua watak (termasuk watak yang baru muncul di Bab 20) pada
Bab 1 ialah spoiler struktur — ia memberitahu pembaca bahawa "akan ada
lagi watak akan datang" sebelum cerita sendiri mendedahkannya. Ini
bercanggah dengan prinsip pengalaman membaca yang tenang dan terkawal
yang menjadi asas produk Jalin (lihat `docs/PRODUCT.md`,
`docs/MASTER_PLAN.md` §9 Reader experience).

## Prinsip

1. Backend/editorial boleh dan patut menyimpan metadata **penuh** —
   semua watak, semua lokasi, semua istilah glosari sesebuah Novela —
   kerana editor manusia perlu pandangan keseluruhan semasa menyemak.
2. Paparan **pembaca** mesti disaring mengikut kemunculan pertama setiap
   elemen berbanding bahagian/bab yang sedang dibaca.
3. Elemen (watak/lokasi/istilah) hanya kelihatan kepada pembaca apabila
   `currentSection >= firstAppearanceSection`.
4. Tema/dakwaan editorial yang berpotensi spoiler (nasib akhir watak,
   hubungan rahsia, konflik masa depan) kekal sebagai metadata dalaman
   editor sahaja — tidak pernah dihantar ke paparan awam, tidak kira bab.
5. Progressive disclosure terpakai kepada elemen yang berpotensi menjadi
   spoiler: watak, lokasi penting, hubungan watak, istilah cerita dan
   maklumat naratif. Metadata editorial penuh kekal tersedia untuk
   editor.

## Medan metadata yang diperlukan (untuk pelaksanaan akan datang)

Nota ini **tidak** melaksanakan perubahan schema. Apabila kerja
pelaksanaan dijadualkan, setiap entri watak/lokasi/istilah glosari bagi
Novela perlu membawa sekurang-kurangnya:

```json
{
  "name": "Zaid",
  "role": "doktor",
  "firstAppearanceSection": "bab-7"
}
```

```json
{
  "term": "...",
  "meaning": "...",
  "firstAppearanceSection": "bab-12"
}
```

`firstAppearanceSection` merujuk `slug` bahagian/bab (padan dengan
`ReadingSection.slug` dalam `src/lib/content/types.ts`) di mana elemen
tersebut pertama kali disebut dalam teks.

## Kesan pada paparan sedia ada

Pelaksanaan sebenar (menapis `characters`, `metadata`, dan glosari
Novela mengikut `firstAppearanceSection` di reader — cth.
`src/app/kategori/[type]/[slug]/page.tsx`, `RightRail`,
`MobileStoryInfo`, `buildVerifiedGlossary`) **belum dibuat** dan bukan
skop PR #9 (UX/SEO/a11y). Pelaksanaan penapisan progresif dijadualkan
sebagai kerja berasingan selepas keputusan ini disahkan pemilik.

Sehingga pelaksanaan itu siap, paparan Novela sedia ada (cth. Waktu
Sebenar) kekal seperti sekarang — tiada regresi diperkenalkan oleh nota
ini.

## Kesan pada parser kandungan (Mimo)

`docs/JALIN_MASTER_CONTENT_PARSER_PROMPT.md` perlu dikemas kini supaya
output JSON untuk `type=novela` menyertakan `firstAppearanceSection`
bagi setiap watak, lokasi dan istilah glosari, dan tidak mendedahkan
nasib akhir/hubungan rahsia/konflik masa depan sebagai teks paparan
awam. Kemas kini prompt itu sendiri adalah kerja berasingan (bukan
skop nota ini).
