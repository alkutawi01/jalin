# Catatan: pembaikan UX admin, 16 Okt 2026

Datang daripada semakan semasa menerbitkan cerpen "Jangan Didihkan Daun Itu" (JLN-CER-0014). Tiada perubahan skema, auth atau aliran penerbitan.

1. **Petikan separuh ditukar.** `smartQuotes` kini menganggap `"` yang diikuti `...` atau `…` sebagai pembuka, jadi `"...abang mana?"` ditukar sepasang. Sebelum ini hanya penutup yang bertukar.
2. **Had nota.** Nota pada kad "Tentang karya" (600) dan Catatan editor (5000) berada dalam `src/lib/admin/note-limits.ts`. Laluan "Tampal jawapan" (`editor-answer-service`) kini menolak nota terlalu panjang dengan panjangnya dan tidak menyimpan apa-apa; sebelum ini ia memintas semakan dan nota panjang masuk ke pangkalan data. Medan menunjukkan pembilang aksara.
3. **Mesej bercanggah.** Bar simpan: "Teks dan maklumat sudah disimpan" dan menyatakan pembaca hanya melihat perubahan selepas terbit. Panel status: "Draf berbeza daripada versi terbit…".
4. **Kredit.** "Pembantu" sentiasa ditawarkan (disimpan sebagai teks, paparan pembaca tidak berubah). "Nama di bawah tajuk" bermula ditanda untuk Penulis dan Penulis & penyemak (kredit baharu dan jawapan ditampal), tidak menimpa pilihan editor. Jadual kredit menunjukkan AI sebenar: "Rafiq Naim (ChatGPT)" (admin sahaja).
5. **Status "Sedia".** Tiada perubahan kod. Panel status sudah menjadikan "Terbitkan" tindakan utama apabila semua semakan lulus (menandakan Sedia dan menerbitkan sekali gus); kekeliruan berpunca daripada status ditukar manual di tab Maklumat.
7. **Nama "Catatan".** Catatan editor kini "Catatan" di admin (label dan teks bantuan), pada halaman awam (dahulu "Catatan penyunting"), dalam format arahan chatbot (`Catatan:`; `Catatan editor:` masih dibaca) dan dalam mesej ralat/sejarah.
6. **Mod Markdown.** Mod Visual menyebut apa yang hanya boleh disunting dalam Markdown (`:::mesej`, pemisah adegan, nota kaki, penanda gambar) dengan butang yang membuka Markdown dan panduan.

Ujian: `smart-quotes`, `note-limits`, `admin-ux-credit-and-guidance` (baharu); `reader-note` dikemas kini kepada had bersama. `card-attribution` dan `reading-minutes-field` gagal pada `main` sebelum perubahan ini.
