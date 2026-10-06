# AGENTS.md

Dokumen ini ialah arahan kerja bersama untuk semua AI/agent yang menyentuh repository Jalin.

## Produk

Jalin — oleh Adjung ialah platform bacaan sastera berilustrasi untuk remaja 13–17 tahun.

Kategori utama:

Jalin bukan platform novel penuh. Novel dan Novel Pendek tidak berada dalam taxonomy.

## Hard rules

1. Jangan ubah keputusan produk yang sudah dilock tanpa arahan manusia.
2. Baca `docs/MASTER_PLAN.md` sebelum perubahan produk, schema atau reader UX yang besar.
3. Jangan masukkan secrets, API key, token, data peribadi, private story bible atau future arc sulit ke repo public.
4. AI tidak menerbitkan kandungan secara autonomi. Kawal selia manusia wajib.
5. Penulis/penyemak maya boleh menggunakan persona bernama, tetapi mesti mempunyai disclosure awam yang jelas; byline tidak lagi memaparkan penanda "Maya" (arahan Izzat, 6 Okt 2026); pendedahan kekal pada halaman penulis dan halaman Tentang.
6. Semua ilustrasi mesti mematuhi Jalin House Style.
7. Untuk watak/lokasi berulang, guna canonical visual reference apabila tersedia; jangan reka semula daripada prompt teks sahaja.
9. Bersiri terdiri daripada episod canonical yang mempunyai kesinambungan.
10. Semua karya perlu menyokong glosari ringkas pada perkataan terpilih.
13. Jangan overengineer MVP.
14. Perubahan besar pada schema, auth, publishing flow atau deployment perlu didokumenkan dahulu.
15. **Agent/AI menjana imej melalui Magnific sahaja.** Jangan silently substitute generator/editor lain. Rekod provenance Magnific untuk aset yang dijana agent. **Pindaan 2026-09-29 (arahan Izzat, pemilik produk): gate Magnific-sahaja pada pautan visual dibatalkan.** Editor manusia boleh memuat naik imej yang dibuat di luar Magnific; ia direkod sebagai provider `manual` (dengan nama alat), dan masih perlu diluluskan manusia sebelum dipautkan. Jangan mendakwa imej sebagai "magnific" jika bukan.
16. Muka manusia dalam ilustrasi fiksyen Jalin tidak boleh jelas secara default; gunakan crop, belakang, profil separa, siluet atau obstruction kecuali editor manusia meluluskan sebaliknya.
17. Setiap visual mesti dipaut pada adegan teks spesifik dan disemak fakta adegan sebelum generation.
18. Jika tidak pasti siapa melakukan tindakan, objek/lokasi canonical, tool, atau face rule: STOP dan semak source terlebih dahulu.
19. Ikut `docs/VISUAL_GENERATION_GUARDRAILS.md` untuk semua generation, edit dan approval visual.
20. **Satu permintaan UI hendaklah dibatch menjadi satu commit/deploy seboleh mungkin.** Elakkan satu commit bagi setiap fail apabila perubahan itu sebahagian daripada permintaan UI yang sama, supaya deployment Vercel tidak membazir.
21. Untuk prosa baharu Jalin, gunakan beberapa kosa kata Melayu aras tinggi / kurang lazim secara organik untuk memperkaya pembaca; jangan memaksa diksi yang kabur atau arkaik semata-mata untuk nampak sasterawi. Istilah yang berguna boleh dimasukkan ke glosari.
22. Karya asli Jalin ialah **living text**. Simpan tarikh terbit, tarikh kemas kini dan versi; rekod perubahan bermakna dalam Sejarah editorial.
23. Kredit mesti berdasarkan sumbangan sebenar. Jangan menyamakan penyunting, penyemak fakta atau penyelidik dengan “Penulis” jika mereka tidak menulis karya.
24. Novela ialah satu Work lengkap long-form, bukan Bersiri dan bukan Novel penuh.
25. **Sinopsis dan fragmen hanya diambil daripada karya (novel) sebenar yang sudah diterbitkan di tempat lain**, bukan pertama kali terbit dalam Jalin (arahan Izzat, 5 Okt 2026). Nama di bawah tajuk bagi kedua-dua jenis ini hanyalah pengarang karya asal, dipaparkan automatik daripada rekod Sumber; "Nama di bawah tajuk" tidak terpakai pada mana-mana kredit mereka. Nama penyumbang Jalin disebut di blok Editorial sahaja.

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
