# Simulasi sinopsis: Anne dari Green Gables (JLN-SIN-0004)

Tarikh: 6 Okt 2026. Tujuan: menerbitkan satu sinopsis novel Project Gutenberg dari awal hingga akhir dengan ChatGPT sebagai rakan penulis dan penyemak, sekali gus menguji UI dan UX Jalin. Dokumen ini ialah log penemuan. Tiada kod diubah.

## Keadaan akhir

- Karya: *Anne dari Green Gables* (L. M. Montgomery, Gutenberg 45), draf JLN-SIN-0004, belum diterbitkan.
- Teks 8 bahagian (12,888 aksara, 1,825 perkataan, kira-kira 9 minit). Disemak ChatGPT dalam empat pusingan (fakta, bahasa, gaya); skor akhir fakta 9.7, bahasa 9.4, gaya 9.5.
- Siap: kredit (Claude sebagai penulis sinopsis, ChatGPT sebagai editor), audiens semua umur, Catatan editor (konteks Kristian, adat pergaulan, minuman beralkohol Bab XVI), 8 watak, 7 latar tempat, 8 istilah glosari, butiran sumber dan bukti hak.
- Menunggu keputusan manusia: (1) **Sahkan keputusan hak** (cadangan: domain awam), (2) **imej hero** (permintaan visual #55 dalam `under_review`; tiga percubaan Magnific, belum ada yang tepat), (3) butang terbit.

## Penemuan data sedia ada (belum diubah)

1. **Riyadh: November 90 (JLN-SIN-0003)**: `rights_status = public_domain` tetapi sumbernya novel Arab terbitan 2011 (Sa'd al-Dusari). Novel 2011 tak mungkin domain awam. Risiko hak cipta. Semak segera.
2. Ketiga-tiga sinopsis lama: `rights_notes` dan `rights_evidence` hanya "-", `source_url` kosong.
3. Riyadh: serpihan nama fail tertampal dalam manuskrip terbit ("الرياض - نوفمبر 90_21310_Foulab…").
4. Gatsby Agung: 17 ribu aksara di bawah satu tajuk "## Bahagian 1".
5. Dua kontributor berlainan slug dengan nama paparan sama "Rafiq Naim" (`chatgpt` dan `rafiq-naim`).

## Penemuan UI dan UX

Keterukan: T tinggi, S sederhana, R rendah.

### Wizard Tambah Sinopsis dan editor

6. (T) Wizard "Saya sudah ada teksnya" menyimpan manuskrip dengan **`\## Bahagian N`** (garis condong pada setiap tajuk), walaupun teksnya dinyatakan "tidak diubah". Pembaca akan nampak "## Bahagian 1" sebagai teks. Dibetulkan secara manual dalam editor (penyimpanan editor tidak mengulangi pepijat). Puncanya belum dijejaki dalam kod.
7. (S) Lima kad jenis karya pada halaman Tambah Karya ialah butang tanpa nama aksesibiliti.
8. (S) "Arahan khas untuk karya ini" ialah `<details>` tertutup yang tajuknya berupa teks petunjuk kecil, tidak nampak boleh diklik. Taipan ke dalamnya semasa tertutup hilang senyap, dan arahan khas tidak masuk dalam arahan yang disalin.
9. (S) Butang "Salin Arahan AI": bila papan keratan disekat, banner mentah dalam bahasa Inggeris "Failed to execute 'writeText' on 'Clipboard': Write permission denied" muncul, tanpa sandaran (arahan sengaja tidak dipaparkan). Bila berjaya pula tiada pengesahan "disalin".
10. (S) Panel "Tampal & isi" dalam editor tiada kotak tampal manual (wizard ada). Mesej sekatan papan keratan baru muncul selepas butang ditekan.
11. (S) Format `sinopsis.data` tidak meminta [WATAK], sedangkan panel chatbot dalam editor mendakwa mengisi watak. Hasilnya tab Watak kosong dan perlu diisi manual.
12. (S) Arahan AI yang dijana memetik "pembaca remaja 13 hingga 17 tahun" (PERANAN dan peraturan glosari). Itu bercanggah dengan dasar semua peringkat umur. Arahan khas tidak boleh mengatasi peraturan (had glosari 8 kekal).
13. (S) Glosari: istilah mesti sama dengan bentuk dalam teks, tetapi langkah Semak tidak memberi amaran jika istilah tak sepadan sebagai satu perkataan penuh. "ametis" tidak ditandai kerana teks menulis "ametisnya". Ditemui hanya melalui pratonton.
14. (R) Audiens: hanya "Remaja 13-17" ditanda secara lalai.
15. (R) Peranan kredit tiada "Penyemak" atau "Penyemak fakta" (digunakan "Editor").
16. (R) Penukaran nilai medan melalui skrip pada input terkawal kadang-kadang tidak didaftar (khusus pengujian automatik; dicatat sebagai amaran kepada ujian e2e).

### Permintaan visual dan Magnific

17. (T) Pemilih penyedia di sebelah butang Generate **dipratetap kepada "Mock (Test)"**, bukan Magnific. Menekan Generate sahaja menghasilkan imej ujian.
18. (T) Satu ralat `fetch failed` semasa Poll terus menjadikan permintaan "failed" (terminal) walaupun tugas Magnific sudah dihantar. Tiada "Poll semula", dan tugas lama terbiar. Mesej "failed, unknown: fetch failed" tidak membantu.
19. (S) Label bercampur bahasa: Generate, Poll Task, Reject berdampingan dengan Lulus, Sahkan tindakan.
20. (S) Selepas ditolak, "Src kanonik" kekal menunjuk imej yang ditolak; "Asset: Stabil (final)" dipaparkan semasa percubaan baharu sedang menjana.
21. (S) Keberkesanan prompt: tiga percubaan menghasilkan traktor di ladang gandum (wajah jelas), kereta kuda di jalan bandar Asia dengan papan tanda, dan terowong pokok epal dengan satu pejalan kaki. Blok gaya rumah menyebut "realistic Malaysian context where relevant" yang mungkin menarik model ke latar Asia. "Ubah suai arahan" hanya menokok di hujung. Cadangan: medan negatif berasingan dan pilihan mematikan baris konteks.
22. (S) Teks alternatif dan adegan pada permintaan tidak dikemas kini bila imej yang dijana berbeza daripada adegan.
23. (R) Tangkapan skrin Chrome sambungan menjadi "hidden" bila ditutupi aplikasi desktop; alat pelayar terbina dalam yang sentiasa kelihatan lebih stabil.

### Perkara yang berfungsi baik (kekalkan)

- Papan pemuka "Sedia untuk diterbitkan?" dengan senarai semak berwarna, butiran dan amaran yang tepat.
- Tab Sumber & Hak: "Simpan draf sumber" dipisahkan daripada "Sahkan keputusan hak" (keputusan manusia).
- Dialog "Sahkan tindakan" sebelum menolak visual; "Pulihkan" bagi gambar yang dibuang dalam semakan wizard.
- Halaman semakan wizard: pratonton kad, medan boleh disunting, pembuangan boleh dibatalkan.
- Pratonton `/pratonton/{id}` memaparkan karya seperti pembaca, termasuk watak, latar, glosari dan Catatan Editor.
- Keputusan Jalin menangani "Tiada latar masa dinyatakan" tanpa ralat.

## Status pembetulan (6 Okt 2026)

Dibetulkan dalam repo (ujian: `manuscript-import.test.ts`, `ui-ux-fixes.test.ts`):

- Butir 6: `toParagraphs()` tidak lagi melepaskan baris `## ` (tajuk bahagian Jalin).
- Butir 17: pemilih penyedia pada halaman permintaan visual kini lalai Magnific.
- Butir 18: ralat rangkaian sementara semasa poll (`fetch failed`, ECONNRESET, timeout, 429, 502 hingga 504) tidak lagi menamatkan permintaan; ia kekal "generating" dengan mesej Melayu dan boleh di-poll semula. Ralat sebenar daripada penyedia (auth, input tidak sah, tugas gagal) masih menamatkan.
- Butir 12: arahan AI lalai kini menyebut semua peringkat umur, remaja 13 hingga 17 tahun sebagai sasaran utama. Nota: ini ialah teks lalai; jika arahan telah disunting di Tetapan, versi tersunting itu perlu dikemas kini sendiri.
- Butir 13: langkah Semak (wizard "Saya sudah ada teksnya") memberi amaran jika istilah glosari tidak ditemui sebagai perkataan penuh dalam teks, dengan cadangan bentuk yang digunakan teks.

Butir 7 (kad jenis karya "tanpa nama") ialah **amaran palsu**: butang mengandungi `<strong>` dan `<span>` sehingga namanya terbit daripada kandungan. Alat baca halaman yang digunakan semasa simulasi tidak memaparkannya. Tiada perubahan dibuat.

Belum diselesaikan: butir 8 hingga 11, 14 hingga 16, 19 hingga 23 (keutamaan lebih rendah).

## Pembetulan fakta terhadap teks (nilai tambah)

- ChatGPT betul menangkap "perkelahian" (pergaduhan) lawan "perkelahan" (picnic), "keretapi" lawan "kereta api", dan sebab kematian Matthew yang terlalu mutlak.
- Pemeriksaan sendiri terhadap teks menolak "tajam lidah" (tiada dalam teks) dan menyelamatkan dua kesilapan adegan: Bab VIII ("fortnight till vacation") dan senja pada adegan hero (Bab II).
- Teks sumber mempunyai satu percanggahan sebenar (Bab I dan III "Richard Spencer's folks", Bab VI Robert dan Nancy); sinopsis tidak menamakan pembawa mesej.
