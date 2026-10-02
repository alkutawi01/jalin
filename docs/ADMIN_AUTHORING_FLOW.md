# Aliran Tambah Karya (admin)

Menggantikan "Master Parser v3" (satu prompt untuk semua karya) dan halaman import tiga langkah.

## Menu
Papan Pemuka · Karya · Editorial · Tetapan · butang **+ Tambah Karya**.
Submission menjadi tapisan "Menunggu semakan" dalam Karya; Prompt menjadi Tetapan; Visual berada pada halaman setiap karya.

## Resipi (jenis + mod)
Setiap karya ada arahan sendiri. `src/lib/admin/authoring/recipes.ts`:
cerpen.data, novela.data, bersiri.data, fragmen.data/tulis, sinopsis.data/tulis.
- **data**: editor sudah ada teks; chatbot hanya mengeluarkan data.
- **tulis**: chatbot menulis teks ([KANDUNGAN]) dan data (sinopsis/fragmen).
Bersiri: pilih "siri baharu" atau "sambung siri sedia ada"; konteks siri dimuat dari pangkalan data.

## Arahan AI
Dilapis oleh `compose-prompt.ts`: peraturan am → arahan resipi → konteks siri → arahan khas editor → format jawapan (dikunci oleh kod, `output-format.ts`).
Peraturan am dan arahan resipi boleh disunting di Tetapan (`prompt_templates`, scope `parser`, versi baharu setiap simpanan; "Kembalikan teks asal" menyahaktifkan semua versi).
Editor hanya menekan "Salin Arahan AI"; arahan tidak dipaparkan.

## Jawapan chatbot
Teks biasa berlabel (`[KARYA]`, `[BAB]`, `[WATAK]`, `[GLOSARI]`, `[GAMBAR]`, `[SUMBER]`, `[KANDUNGAN]`, `[SIRI]`), diurai secara toleran oleh `labelled-output.ts`, kemudian disahkan oleh `parser-output.ts` (laluan JSON lama masih diterima).
Toleransi yang dipelajari daripada output ChatGPT sebenar: item dipisahkan baris kosong sahaja; glosari "istilah: maksud"; `Bab:` kosong dalam GAMBAR bukan tajuk bahagian; Petikan berbalut tanda petikan; tajuk "tidak dinyatakan" (editor menaip tajuk).

## Simpan
`/api/admin/works/import` (dry-run dahulu, kemudian `dryRun:false`) mencipta DRAF dalam satu transaksi (karya, kredit, glosari, bab, visual, siri). Tidak pernah menerbitkan.
Penulis yang ditaip editor dikreditkan `initial_draft` (byline); pengarang asal sinopsis/fragmen dikreditkan `author` tanpa byline.

## Editor bertab selepas pilihan jenis

Pintu masuk `Tambah Karya` memilih jenis sekali sahaja. Pilihan itu mencipta draf yang terus dibuka dalam editor bertab. Jenis karya tidak boleh ditukar pada karya yang sudah mempunyai ID kerana Bersiri, Novela dan karya terbitan semula mempunyai hubungan serta syarat editorial berbeza.

- Cerpen: satu karya lengkap.
- Novela: satu karya lengkap dengan pilihan Bahagian dalaman.
- Bersiri: setiap episod ialah Work berasingan; draf dan keahlian `series_entries` diwujudkan dalam transaksi yang sama. Siri baharu atau sedia ada dipilih sebelum draf episod dibuat.
- Fragmen dan Sinopsis: tab Sumber & Hak kekal wajib sebelum terbit.

Draf baharu bermula dengan tajuk dan slug sementara. Kedua-duanya mesti diganti sebelum penerbitan; manuskrip boleh dibiarkan kosong semasa editor melengkapkan maklumat tab lain. Versi dipaparkan sebagai maklumat sistem dan hanya dikemas kini oleh aliran penerbitan.

Pembantu chatbot dalam editor menyalin arahan mengikut tab bersama manuskrip semasa. Ia tidak mengimport hasil AI ke dalam draf tanpa semakan manusia. Aliran import AI lama masih tersedia untuk jawapan chatbot berstruktur yang sudah siap dan akan mencipta draf berasingan.

Penukaran anchor gambar lama ialah tindakan opt-in per karya: pratonton menunjukkan anchor yang dapat dipadankan secara unik dan yang perlu semakan manual; pengesahan menyimpan manuskrip dan anchor baru bersama-sama dalam satu transaksi. Sandaran sebelum/selepas berada dalam metadata Work untuk pemulihan selagi manuskrip dan penanda belum diubah lagi. Karya terbitan tidak berubah pada halaman pembaca sehingga aliran penerbitan eksplisit dijalankan semula. Anchor dalam Bahagian Novela yang tidak ditemui dalam `works.body` dilangkau, bukan diteka.

## Manuskrip: mod Visual dan Markdown

Manuskrip masih disimpan sebagai Markdown. Editor bertab menawarkan mod Visual untuk perenggan, tebal, condong, tajuk bahagian `##`, pemisah adegan dan penanda gambar `[[gambar:N]]`; mod Markdown kekal untuk kawalan penuh. Apabila manuskrip mengandungi sintaks yang belum boleh ditukar dengan selamat (contohnya pautan, senarai, petikan, kod atau tajuk `#` lama), mod Visual dinyahaktifkan supaya teks asal tidak diratakan. Kedua-dua mod berkongsi tindakan simpan yang sama.

Kotak komunikasi hanya mengandungi isi; identiti pengirim, nombor telefon, alamat e-mel dan masa tidak diwajibkan. Sintaks kanonik ialah blok berasingan berikut:

```text
:::mesej
Aku sudah sampai.
:::

:::emel
Salam,

Saya akan datang esok.
:::
```

Butang “Kotak mesej” dan “Kotak e-mel” menyisipkannya dalam mod Visual. Pembaca dan pratonton admin menggunakan `StoryMarkdown` yang sama; penanda `:::` tidak dipaparkan apabila blok sah. Penanda yang tidak lengkap kekal sebagai teks biasa untuk dibaiki editor, bukan ditafsir secara senyap.
