# Satu editor, bantuan master dan bantuan tab

Keputusan Izzat, 15 Oktober 2026: pilih kategori terus membuka editor. Tiada pilihan Tulis sendiri/Guna bot sembang dan tiada dropdown destinasi jawapan.

Satu komponen bantuan digunakan di master dan setiap tab editorial. Skop tetap mengikut lokasi. Output ialah data untuk borang, bukan nasihat manual. Arahan khusus tab lebih terperinci daripada master. Penilaian AI mengekalkan komponen panel/rubrik sedia ada sebagai bantuan khusus tabnya; master tidak mereka skor, keputusan hak atau fail gambar.

Aliran: Salin arahan → Tampal jawapan → pratonton nilai lama/baharu dengan pilihan setiap perubahan → Sahkan & isi. Medan berisi tidak dipilih secara lalai. Pengesahan menulis hanya pilihan editor dalam satu transaksi, dengan semakan versi untuk mengelakkan overwriting kerja lain. Tiada penerbitan automatik. Teks kosong memerlukan bahan/tugasan, bukan placeholder manuskrip.

Kredit memerlukan identiti/peranan sebenar; bab hanya untuk novela, alamat bab awam tidak ditukar dan bab sedia ada tidak dipadam. Hak tetap melalui semakan manusia. Penulisan/suntingan kandungan mengekalkan penanda imej dan nota kaki sedia ada. Tempoh bacaan dikira sistem.

Negara latar turut boleh diisi master/pembantu Watak & latar. Borang negara, tempat/masa dan gambar yang belum disimpan menyekat tindakan AI sebelum penyegaran halaman, supaya input setempat tidak hilang.

## Semakan

- `npx tsx __tests__/editor-assistant.test.ts`: kontrak master dan tujuh tab, skop, nilai lama/baharu, format JSON/label, pemeliharaan prosa dan penolakan arahan/nasihat sebagai input.
- `PGLITE_MODULE=... npx tsx __tests__/editor-assistant.integration.ts`: PostgreSQL tempatan, pratonton tanpa tulisan, pilihan medan, rollback kegagalan lewat, versi basi, gambar/nota kaki, kredit, glosari dan bab. Tiada Neon produksi digunakan.
- `EDITOR_TEST_URL=http://localhost:3104 node __tests__/editor-workflow.browser.mjs`: API fixture dalam memori; tambah draf terus ke editor, suntingan, dua muat naik imej, satu ganti imej, pembantu tab, batal/ralat, desktop dan telefon.
- `EDITOR_TEST_URL=http://localhost:3104 node __tests__/authoring-fresh-answer.browser.mjs`: salin arahan master, tampal manual, jawapan baharu membatalkan pratonton/pilihan lama, nilai lama/baharu dan lebar telefon.

Suite lama mempunyai kegagalan di luar perubahan ini: `series-list-layout` menganggap `min-height: 0` bersama aspect-ratio sebagai ralat; `reading-minutes-field` masih mengharapkan tempoh bacaan manual boleh dikosongkan walaupun keputusan produk kini automatik. Kedua-duanya tidak diubah dalam tugas ini. Skrip npm test terlalu panjang untuk cmd Windows; arahan ujian dijalankan satu demi satu.
