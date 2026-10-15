# Audit kontrak arahan AI dan UX editor — 15 Oktober 2026

Asas: `origin/main` 211b2c9, bersama pembaikan hero tempatan efc6cb4. Permintaan Izzat: hentikan kebocoran tanda Markdown, audit semua keluarga arahan AI dan kesesuaian jawapan dengan tempat importnya, betulkan lajur pilihan Karya.

## Inventori arahan dan destinasi

| Arahan | Jawapan yang diminta | Destinasi dan kawalan |
| --- | --- | --- |
| cerpen.data | KARYA, WATAK, LATAR, GLOSARI, GAMBAR | Tambah karya → Semak; teks asal editor dikekalkan; draf selepas pengesahan |
| novela.data | KARYA, BAB, WATAK, LATAR, GLOSARI, GAMBAR | Tambah karya → Semak; pembelahan bab disahkan terhadap manuskrip |
| bersiri.data | KARYA, WATAK, LATAR, GLOSARI, GAMBAR; SIRI bagi siri baharu | Tambah episod → Semak; pilihan siri wajib; contoh kini turut menyertakan SIRI |
| fragmen.data, sinopsis.data | KARYA, SUMBER, LATAR, GLOSARI, GAMBAR | Tambah karya → Semak; sumber dicadangkan, hak bukan disahkan oleh chatbot |
| fragmen.tulis, sinopsis.tulis | Seperti di atas bersama KANDUNGAN | Tambah karya → Semak; KANDUNGAN wajib; metadata berlabel, penekanan manuskrip dibenarkan jika lengkap |
| Isi semua maklumat karya sedia ada | MAKLUMAT, WATAK, LATAR, GLOSARI; SUMBER jika karya bersumber | Modul berlabel **semua tab**; baca sahaja semasa semakan; editor mengesahkan sebelum penulisan; medan yang berisi dilangkau |
| Bantuan Maklumat | MAKLUMAT sahaja | Import terhad Dek/Genre; tiada tulisan Watak, Glosari atau Sumber |
| Bantuan Watak & latar | WATAK, LATAR sahaja | Import terhad watak/tempat/masa; bahagian tab lain diabaikan walaupun chatbot menyertakannya |
| Bantuan Sumber | SUMBER sahaja | Medan bibliografi kosong sahaja; tiada keputusan hak; bacaan sumber gagal menghentikan penulisan sumber |
| Glosari | GLOSARI, Istilah/Maksud dan medan pilihan | Penghurai mengambil bahagian GLOSARI sahaja; istilah tiada dalam manuskrip atau sudah wujud dilangkau |
| Nasihat Kandungan, Kredit, Bab | Nasihat untuk tab yang dinamakan | Tiada import automatik; arahan kini melarang bahagian tab lain. Kredit dibekalkan sebagai konteks sedia ada; penulis tidak diteka daripada gaya teks |
| Import lama / Master Content Parser | JSON dan laporan editor | `readParserAnswer` / `buildImportPlan`; ralat struktur, naskhah dan bab disahkan sebelum penulisan draf |
| Panel Bacaan AI | JALIN_PANEL_V2, kod rujukan, K1–K6, bukti, TAMAT | Penghurai khusus panel; kod/snapshot, komponen dan bukti disahkan; bukan dimasukkan ke penghurai metadata |
| Arahan visual / permintaan gambar | Brief visual dan hasil imej | Komposer visual; bukan jawapan teks untuk Tampal & isi. Pautan gambar melalui aliran aset/imej, bukan penghurai Watak/Glosari |

Format import tambah karya dimiliki kod dan ditambah selepas arahan resipi/tetapan. Semakan baca sahaja produksi `super-bonus-30854330`, `br-nameless-boat-b3kp87fq`, database `jalin` mendapati satu override aktif `scope=parser`: `tulis/sinopsis` versi 1 (9053 aksara). Ia menyimpan keseluruhan prompt lama termasuk FORMAT JAWAPAN, contoh dan BAHAN. Komposer kini mengekalkan teks sebelum FORMAT JAWAPAN dan menambah kontrak semasa sekali sahaja. Had editorial tersuai (misalnya panjang 2000–5000 perkataan) dikekalkan. Override lama turut menghadkan glosari kepada lapan; ini berbeza daripada lalai tanpa kuota, tetapi tidak diubah secara senyap. Tiada tetapan produksi ditukar.

## Kecacatan yang ditemui dan dibetulkan

1. Bantuan Watak & latar memanggil penjana dan pengisi **semua tab**. Kini penjana dan penghurai sama-sama menerima skop; pelayan hanya dipanggil untuk bahagian skop itu.
2. Tampal terus menulis beberapa permintaan tanpa menunjukkan isi cadangan. Kini semakan memaparkan cadangan, skop dan perkara dilangkau; `Sahkan & isi` barulah menulis. Laluan tampal manual turut disediakan.
3. Bahagian yang tidak dikenali boleh menyambung ke nilai terakhir bahagian sebelumnya. Sempadan eksplisit kini menghentikan bacaan bahagian; Glosari diasingkan sebelum membaca Istilah/Maksud. Penanda komunikasi dalam KANDUNGAN kekal sebagai teks cerita.
4. Salinan tajuk berkurung terlepas, kurung lebar dan Markdown tidak konsisten antara penghurai. Normalisasi tajuk dikongsi; manuskrip tidak ditulis semula olehnya. Dek berbalut baris dan `Muncul di` turut diterima.
5. Arahan novela sedia ada boleh menerima manuskrip kosong apabila teks disimpan dalam bab. Bantuan menggunakan bab tersusun jika teks utama kosong, tanpa mengubah rekod bab.
6. Arahan umum melarang semua Markdown, termasuk penekanan sah dalam KANDUNGAN. Kontrak kini membezakan metadata teks biasa daripada penekanan manuskrip yang berpasangan.
7. Contoh bersiri baharu tidak mempunyai SIRI walaupun format memintanya. Contoh kini lengkap.
8. Tanda pembuka condong tidak lengkap seperti `*contoh"` kekal literal dalam keluaran parser Markdown. Teks literal selepas parsing dibersihkan daripada tanda penekanan tergantung bersebelahan perkataan. Penekanan sah, aritmetik dan kod dikekalkan. Editor dan pratonton import memberi amaran bagi perenggan yang tandanya tidak berpasangan; teks tersimpan tidak diubah secara automatik.
9. Renderer teks ringkas hanya memahami *condong*, jadi **tebal** boleh meninggalkan bintang. Renderer kini membaca penekanan inline menggunakan parser Markdown yang sama, tanpa meletakkan elemen blok dalam baris teks.
10. Sel pertama jadual mewarisi `min-width:190px`; tajuk lajur berpusat, sel badan rata kiri. Lajur pilihan kini sempit, berpusat dan mempunyai margin checkbox seragam.
11. Override Sinopsis produksi menyimpan kontrak dan contoh lama yang kemudian digandakan oleh komposer. Normalisasi arahan tersuai kini membuang format terbenam ketika menjana prompt, tanpa menulis semula tetapan tersimpan.

## Pengesahan

- `chatbot-contract-audit.test.tsx`: ketujuh-tujuh resipi → contoh jawapan → penghurai, varian tajuk terlepas, setiap skop tab, jawapan bercampur, sempadan bahagian, pengasingan glosari, novela berasaskan bab, tanda condong tidak lengkap dan penekanan sah.
- Ujian regresi authoring/import, work-fill variants, glosari, Panel Bacaan AI dan piawaian admin.
- `editor-workflow.browser.mjs`: API dipintas kepada memori; semakan tidak menulis, pengesahan Watak tidak menyentuh metadata/glosari, jawapan tidak dapat dibaca tiada tindakan pengesahan.
- `admin-selection.browser.tsx`: komponen jadual sebenar dan CSS sebenar; pusat checkbox tajuk/baris sejajar serta tiada limpahan pada 1360, 1024, 768 dan 390px.

Contoh jawapan ialah fixture terkawal, bukan dakwaan bahawa sesi baharu ChatGPT/Claude/Gemini telah dijalankan. Output model bebas tidak boleh dijamin sentiasa mematuhi arahan; sistem mesti mengasingkan skop, menunjukkan isi sebelum disimpan dan menolak kegagalan yang nyata. Tiada pangkalan data produksi ditulis dalam audit ini.
