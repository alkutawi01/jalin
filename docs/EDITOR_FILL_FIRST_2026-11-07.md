# Isian draf dahulu, semakan kemudian

Keputusan Izzat, 7 November 2026: jawapan chatbot mesti boleh diisi dahulu dan dibetulkan oleh editor selepas simpan. Satu masalah editorial tidak boleh membatalkan semua medan lain.

- Simpan keterangan latar, catatan dan glosari penuh; jangan potong teks untuk mematuhi had paparan.
- Had panjang dan masalah editorial menjadi catatan semakan draf. Pemeriksaan penerbitan kekal berkuat kuasa.
- Nilai yang tidak boleh dimasukkan ke medan berhubungan (contohnya penyumbang yang tidak wujud atau tahun bukan nombor) disimpan bersama jawapan asal dalam ruang pembetulan admin, sementara medan lain diisi. Jawapan itu mesti boleh dibuka semula dan disunting. Ia tidak boleh masuk HTML/RSC pembaca atau diterbitkan sebelum diselesaikan.
- Kegagalan sambungan, kebenaran atau rekod karya yang benar-benar tiada tidak boleh dilaporkan sebagai berjaya.
- Jangan padam draf secara automatik apabila halaman ditinggalkan. Teks setempat mungkin belum sampai ke pelayan.

Tiada migrasi diperlukan. Tiada perubahan produksi dibuat oleh penyediaan pembetulan ini. Kerja label langganan dalam worktree lain dikekalkan.

## Pengesahan

- `__tests__/editor-fill-first.integration.ts`: 19 semakan PostgreSQL terbenam lulus, tanpa sambungan Neon. Meliputi simpan teks penuh, glosari panjang/tidak lengkap, pembetulan selepas simpan, kredit/tahun bermasalah, jawapan tersimpan, pengesahan semakan lapuk dan kegagalan DB sebenar.
- `node __tests__/editor-fill-first.browser.mjs`: komponen sebenar dengan API simulasi; 375, 390, 430 dan 1440 piksel, jawapan dibuka semula selepas reload, pembetulan manual, perlindungan teks sebelum reload dan tiada ralat JavaScript lulus. Ini bukan pengesahan sesi admin produksi.
- TypeScript, validasi kandungan, ujian unjuran pembaca dan `git diff --check` lulus.
- Binaan produksi akhir (`node ./node_modules/next/dist/bin/next build`) lulus pada 7 November 2026 selepas percubaan semula. Ia menggunakan sumber Markdown setempat, tanpa menyambung ke pangkalan data produksi. Percubaan terdahulu gagal kerana ruang cakera penuh.
- Suite 295 fail dijalankan. Lima kegagalan akibat kontrak lama (had isian dan bilangan permintaan komponen) dikemas kini kepada keputusan Izzat dan diuji semula sehingga lulus.
- Empat kegagalan sedia ada pada asas `10764727` kekal: inventori tiada migrasi 035, ujian pengepala mengandaikan satu peraturan sahaja, senarai fon ujian belum mengenali Amiri, dan ujian kotak ayat mengandaikan komen lama dalam komponen. Fail pelaksanaan berkaitan tidak diubah oleh tugasan ini.

Pemasangan PGlite untuk ujian berada di direktori sementara di luar repo. Untuk mengulangi ujian integrasi, tetapkan `PGLITE_MODULE` kepada pemasangan ujian itu untuk satu arahan sahaja. Tiada manuskrip pengguna dimasukkan ke fixture; semua contoh adalah rekaan.
