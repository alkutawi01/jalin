# Pembaikan aliran AI — 15 Oktober 2026

## Skop dan keputusan

Susulan audit: seragamkan arahan, longgarkan kesilapan layout dan hapuskan penulisan separa. Tiada perubahan schema atau kelulusan hak automatik.

- Glosari tanpa kuota; tempoh bacaan dikira sistem. Arahan kandungan membenarkan penekanan Markdown berpasangan. Format semasa mengatasi contoh lama dalam tetapan.
- Pengurai menerima ruang/NBSP, baris kosong berlebihan, label dan nilai pada baris berasingan, pemisah `:`/`=`/dash, jadual menegak atau mendatar yang labelnya jelas, casing/dekorasi Markdown dan pembalut paparan chatbot. JSON dengan medan dikenal pasti turut diterima oleh bantuan maklumat/glosari. Import karya JSON lengkap kekal melalui pengurai JSON khusus supaya metadata imej tidak hilang.
- Panel menerima variasi layout, label berjarak, jadual, angka lebar penuh dan skor `/10`. Skor `/5`, kod salah, medan wajib hilang, blok berganda dan bukti awal/akhir yang tidak sepadan tetap ditolak. Arahan bukti kini menerangkan semakan sebenar, tanpa mendakwa ia membuktikan model membaca seluruh teks.
- Semua bantuan isi maklumat dan glosari: semak dahulu, kemudian sahkan. Glosari mempunyai tampal manual. Dropdown skop digunakan oleh kedua-dua butang salin dan tampal.
- Satu POST ke `/api/admin/works/[id]/assistant-fill`, satu transaksi PostgreSQL. Rekod terkini dibaca semula dengan kunci, istilah dideduplikasi dan medan sedia ada tidak diganti. Teks yang berubah/belum disimpan menghalang penulisan. Penulisan sumber memerlukan kebenaran source.manage dan menggunakan peraturan pembatalan semakan hak sedia ada.
- Jawapan baharu dalam Tambah karya tidak membawa penulis, tajuk siri, metadata atau pelan jawapan sebelumnya. Permintaan `fresh` tidak menggunakan state React lama sebagai override.
- Nasihat Kandungan/Kredit/Bab kekal manual; ia bukan kontrak import. Arahan gambar kekal menghasilkan imej, bukan data teks untuk pengurai metadata.

## Pengesahan

- `assistant-layout-tolerance.test.ts`: format rosak, JSON, jadual, skop dan pemeliharaan teks cerita.
- `assistant-transaction.integration.ts`: PostgreSQL sebenar terbenam (PGlite), rollback selepas istilah kedua gagal, rollback kerana kebenaran sumber, teks lapuk, commit, deduplikasi cubaan semula dan pembatalan kelulusan sumber apabila material berubah.
- `editor-workflow.browser.mjs` dengan `EDITOR_CHATBOT_ONLY=1`: fixture API dalam memori; tiada tulisan ketika pratonton/batal, kegagalan batch, pengesahan glosari dan skop Watak, serta telefon tanpa overflow.
- `authoring-fresh-answer.browser.mjs`: pertukaran jawapan, penulis lama dan override lama tidak terbawa, pelan lama tidak boleh disimpan.
- Ujian resipi, import, glosari, panel dan TypeScript/build.

Untuk ujian PostgreSQL tanpa Neon: pasang `@electric-sql/pglite` dalam folder ujian di luar repo, tetapkan `PGLITE_MODULE` kepada laluan modul dan jalankan `npm run test:assistant-db`. Tiada dependency produksi ditambah.

Semua jawapan model dalam ujian ialah fixture, bukan sesi baharu dengan penyedia AI. Toleransi format bukan jaminan memahami sebarang teks bebas; maklumat yang kabur tidak diteka. Tiada data produksi digunakan atau diubah dalam simulasi.
