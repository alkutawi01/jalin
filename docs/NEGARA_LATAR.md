# Negara latar (negara pada kad)

Keputusan Izzat, 12 Oktober 2026, selepas perbincangan empat pusingan dengan ChatGPT.

## Apa yang dipaparkan

Nama **negara** tempat cerita berlaku, bersebelahan masa bacaan (bukan dalam eyebrow, kerana tiga bahagian huruf besar terlalu panjang: "Sinopsis · Drama sosial · Amerika Syarikat"):

- Karya luar negara: eyebrow `Cerpen · Sejarah`, dan di baris masa bacaan `Jepun · ± 11 minit`.
- Karya Malaysia: `± 11 minit` sahaja (Malaysia **tidak** dipaparkan apabila ia satu-satunya negara; Jalin memang Malaysia).
- Eyebrow kekal Format · Genre. "Pilihan Editor" dibuang daripada eyebrow hero laman utama (carousel itu sendiri ialah pilihan editor).

Negara sahaja: bukan kampung, lorong atau daerah. Itu kekal pada Latar tempat di halaman karya.

## Peraturan

1. Satu negara. Dua negara (dipaparkan dengan sempang, contoh `Malaysia-Indonesia`) hanya apabila cerita benar-benar karya kedua-dua negara; jika tidak, pilih satu.
2. Isi hanya apabila teks menyatakan negara atau jelas menunjukkannya. Jika perlu meneka, kosongkan. Nama Melayu, nama sekolah rekaan atau suasana kampung tidak membuktikan negara.
3. Latar sejarah: papar negara hari ini (Peru untuk Empayar Inka, Maghribi untuk Marinid). Zaman diterangkan pada halaman karya (Latar masa, Catatan editor).
4. Tiada bendera (bendera moden salah untuk Inka, Marinid, Joseon).
5. Wilayah dipertikaikan: ikut istilah dalam teks karya; editor menyemak sebelum terbit; jangan dimasukkan ke negara induk secara automatik.
6. Nama paparan ialah nama Jalin sendiri (`src/lib/reader/countries.ts`), bukan nama rasmi ISO: contohnya `England` (GB-ENG) dan `Korea` (KR).

## Data

`works.metadata.countries`: senarai kod (satu atau dua), yang pertama ialah negara utama. Tiada migrasi pangkalan data (medan baharu dalam JSON metadata sedia ada). Kosong bermaksud tiada paparan. Disunting di admin karya, tab **Watak & latar**, bahagian **Negara Latar** (disimpan serta-merta; perlu "Terbitkan semula" supaya pembaca melihatnya).

Disertakan dalam cap jari semakan perubahan (`charactersFingerprint`), jadi butang "Terbitkan semula" muncul apabila negara berubah.

## Di mana dipaparkan

Kad laman utama (Koleksi cerita) dan hero, senarai kategori, halaman Mula, hasil carian, kicker halaman karya dan baris "Negara" dalam kad Tentang karya.

## Ditangguh

Penapis negara, halaman `/negara/jepun`, peta, data berstruktur `contentLocation`, bendera.
