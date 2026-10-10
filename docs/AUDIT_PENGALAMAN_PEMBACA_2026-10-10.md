# Audit pengalaman pembaca, dari awal hingga akhir (10 Okt 2026)

Skop: pelawat tiba, melihat karya terkunci, log masuk, percubaan, membaca, tebus kod, tamat, akaun, padam akaun. Hanya dibaca daripada kod dan diuji pada localhost. Tiada apa diubah selain dokumen ini.

## A. Sudah ada dan diuji

Log masuk emel (kod 6 digit, emel sebenar sampai), percubaan 14 hari atas pilihan sendiri, dinding bayar di pelayan, cerita contoh, halaman /mula, popup log masuk, tebus kod kad dan kod kongsi (bertindih), akaun, peranti (had 2), padam akaun, butang Log masuk/nama di header (desktop dan telefon), senarai ahli, jejak kod.

## B. Perlu dibuat sebelum pengalaman dikatakan sempurna

### P1. Bercanggah dengan keputusan sekarang (betulkan dahulu, kecil)

1. **Dasar Privasi** (`src/app/privasi/page.tsx` baris ~24, ~53, ~56): "Anda boleh membaca Jalin tanpa akaun" dan "Jalin tidak meminta anda membuka akaun". Salah apabila dinding bayar hidup. Teks mesti ditulis semula (semakan ChatGPT diwajibkan untuk teks undang-undang).
2. **Terma** (`src/app/terma/page.tsx` baris 23): "membaca semua karya tanpa bayaran dan tanpa akaun". Baris 73: percubaan "bermula apabila akaun dibuka"; sebenarnya bermula apabila pembaca memilihnya.
3. **Tetapan bacaan tidak dipakai**: `/akaun` menyimpan saiz huruf, tema, jarak baris, lebar, redup, tetapi halaman bacaan tidak membacanya (teks di akaun sendiri berkata "tidak lama lagi"). Pembaca akan rasa tetapan rosak. Perlu dipakai pada halaman karya, atau dibuang daripada akaun.
4. **/tebus** (pelawat): dihantar ke `/log-masuk` tanpa `?next=/tebus`, jadi selepas log masuk dia mendarat di akaun, bukan borang tebus.

### P2. Jurang pengalaman

5. **Tiada peringatan tamat**: tiada emel atau notis "percubaan tamat dalam 3 hari" / "langganan tamat". Pembaca baru tahu apabila terkunci. Banner dalam akaun dan dalam header (header sudah menunjukkan "N hari lagi" bila 7 hari atau kurang, tetapi hanya pada halaman).
6. **Kad karya tidak menunjukkan kunci** pada senarai (laman utama, kategori, carian) untuk pelawat. Mereka hanya tahu selepas klik. Tambah ikon kunci kecil atau tanda "Contoh" pada cerita percuma.
7. **Laman utama tiada ajakan** untuk pelawat (cuba percuma 14 hari / apa itu Jalin). `/mula` hanya dipaut dari halaman terkunci. Tambah di laman utama dan pautan dalam menu/footer.
8. **Keadaan tamat**: popup berkata "percubaan sudah digunakan atau tamat" tanpa menerangkan langkah seterusnya (beli kad di mana). Pautan Shopee ditangguh atas arahan, tetapi tempat dan teksnya perlu disediakan, dan halaman /mula perlu ada bahagian "Dapatkan kad".
9. **Teruskan membaca / simpan karya**: jadual `reading_progress` dan `saved_works` wujud tetapi tiada UI. Pembaca yang membayar jangkaan "sambung dari mana saya berhenti".
10. **Nama paparan**: kebanyakan pembaca tidak akan mengisi nama; header jatuh balik kepada bahagian depan emel (cth. `alkutawi_01`). Pertimbangkan meminta nama sekali, selepas log masuk pertama (boleh langkau).
11. **Emel kod log masuk**: sudah ada, tetapi tiada pautan satu klik / tiada ayat "jika bukan anda, abaikan" (semak). Teks dan reka bentuk emel belum disemak mata.
12. **Kod yang salah**: mesej ralat tebus (kod tidak sah / sudah digunakan / luput / batch salah) perlu diuji satu per satu untuk bahasa dan kejelasan.
13. **Peranti ketiga**: semasa had 2 peranti dicapai, ada pilihan keluarkan peranti; perlu semak kejelasan untuk pembaca bukan teknikal.
14. **Pengesahan emel bertulis salah** (cth. `gmial.com`): tiada petunjuk. Pembaca tidak akan menerima kod dan tidak tahu mengapa. Tambah "Tidak terima? Semak ejaan dan folder spam" (sudah separa ada).

### P3. Operasi dan keselamatan sebelum awam (daripada audit sebelum ini)

15. Had hantaran emel global (kos dan penyalahgunaan), putar kunci Resend yang terdedah, sandaran DB, dan item P0 dalam `docs/AUDIT_LANGGANAN_2026-10-10.md`.
16. Pemantauan: tiada amaran jika emel gagal dihantar secara besar-besaran.
17. Sokongan: tiada tempat pembaca melaporkan masalah akaun ("tidak dapat log masuk"). Tambah alamat e-mel sokongan di akaun dan di popup.
18. Hidupkan dalam kad: kad fizikal perlu ada arahan tebus (alamat `/tebus` atau `jalin.adjung.com/tebus`) pada label; semak reka bentuk label.

### P4. Boleh kemudian

Pautan Shopee, e-mel pengesahan tebus, resit, sejarah tebus dalam akaun, tukar emel, eksport data peribadi, penyahaktifan sementara.

## C. Susunan cadangan

1. P1 (1 hingga 4): satu sesi, kecil dan jelas, tiada keputusan baru.
2. P2 (5 hingga 8): butuh persetujuan reka bentuk ringkas (banner, kunci pada kad, CTA laman utama).
3. P2 (9, 10) dan P3: jadual berasingan.
4. Hanya selepas semua itu: ujian penuh pada produksi dengan akaun sebenar, kemudian keputusan go-live.
