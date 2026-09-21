# AGENTS.md

Dokumen ini ialah arahan kerja bersama untuk semua AI/agent yang menyentuh repository Jalin.

## Produk

Jalin — oleh Adjung ialah platform bacaan sastera berilustrasi untuk remaja 13–17 tahun.

Kategori utama:
**Sinopsis · Cerpen · Terjemahan · Fragmen · Bersiri**

Jalin bukan platform novel penuh. Novel Pendek telah dikeluarkan daripada taxonomy.

## Hard rules

1. Jangan ubah keputusan produk yang sudah dilock tanpa arahan manusia.
2. Baca `docs/MASTER_PLAN.md` sebelum perubahan produk, schema atau reader UX yang besar.
3. Jangan masukkan secrets, API key, token, data peribadi, private story bible atau future arc sulit ke repo public.
4. AI tidak menerbitkan kandungan secara autonomi. Kawal selia manusia wajib.
5. Penulis/penyemak maya boleh menggunakan persona bernama, tetapi mesti mempunyai disclosure awam yang jelas; byline menggunakan penanda halus seperti `Maya`.
6. Semua ilustrasi mesti mematuhi Jalin House Style.
7. Untuk watak/lokasi berulang, guna canonical visual reference apabila tersedia; jangan reka semula daripada prompt teks sahaja.
8. Cerpen, Sinopsis, Terjemahan dan Fragmen ialah satu `Work`; jika panjang, gunakan pagination dalaman, bukan model Novel Pendek.
9. Bersiri terdiri daripada episod canonical yang mempunyai kesinambungan.
10. Semua karya perlu menyokong glosari ringkas pada perkataan terpilih.
11. Sinopsis, Terjemahan dan Fragmen berasaskan karya lama tidak boleh READY tanpa provenance dan semakan hak penggunaan/domain awam.
12. Jangan anggap terjemahan moden bebas hak cipta hanya kerana karya asal sudah domain awam.
13. Jangan overengineer MVP.
14. Perubahan besar pada schema, auth, publishing flow atau deployment perlu didokumenkan dahulu.
15. **Semua imej yang dijana atau diedit untuk digunakan dalam Jalin WAJIB melalui Magnific.** Jangan silently substitute generator/editor lain. Rekod provenance Magnific untuk aset produksi atau staging yang dipilih.
16. Muka manusia dalam ilustrasi fiksyen Jalin tidak boleh jelas secara default; gunakan crop, belakang, profil separa, siluet atau obstruction kecuali editor manusia meluluskan sebaliknya.
17. Setiap visual mesti dipaut pada adegan teks spesifik dan disemak fakta adegan sebelum generation.
18. Jika tidak pasti siapa melakukan tindakan, objek/lokasi canonical, tool, atau face rule: STOP dan semak source terlebih dahulu.
19. Ikut `docs/VISUAL_GENERATION_GUARDRAILS.md` untuk semua generation, edit dan approval visual.
20. **Satu permintaan UI hendaklah dibatch menjadi satu commit/deploy seboleh mungkin.** Elakkan satu commit bagi setiap fail apabila perubahan itu sebahagian daripada permintaan UI yang sama, supaya deployment Vercel tidak membazir.
21. Untuk prosa baharu Jalin, gunakan beberapa kosa kata Melayu aras tinggi / kurang lazim secara organik untuk memperkaya pembaca; jangan memaksa diksi yang kabur atau arkaik semata-mata untuk nampak sasterawi. Istilah yang berguna boleh dimasukkan ke glosari.

## Working style

- Utamakan perubahan kecil yang boleh diuji, tetapi batch perubahan yang datang daripada satu permintaan UI.
- Pisahkan content model daripada UI.
- Gunakan TypeScript strict.
- Pastikan reka bentuk responsif dan mobile-first.
- Reader layout mesti mengekalkan max-width / margin yang stabil pada laptop dan monitor besar.
- Margin luar boleh digunakan untuk elemen sekunder, tetapi tidak boleh mengganggu reading column.
- Elakkan vendor lock-in yang tidak perlu.
- Jangan tambah dependency besar tanpa justifikasi.
- Simpan keputusan penting dalam docs/.

## Source of truth

1. docs/MASTER_PLAN.md
2. docs/PRODUCT.md
3. docs/EDITORIAL_SYSTEM.md
4. docs/AI_WRITERS_ROOM.md
5. docs/VISUAL_BIBLE.md
6. docs/CONTENT_MODEL.md
7. docs/ARCHITECTURE.md
