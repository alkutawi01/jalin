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
