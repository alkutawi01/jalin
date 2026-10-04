# Production Trial Pack

Status: sedia digunakan. Dokumen sahaja; tiada kod, skema atau aliran kerja diubah.
Dikemas kini: 4 Oktober 2026.

## 1. Tujuan

Mengukur, dengan data sebenar, berapa lama dan berapa banyak kerja manual diperlukan untuk membawa satu karya baharu daripada
manuskrip mentah hingga terbit dan boleh dibaca. Hasilnya menentukan dua perkara:

1. Sama ada **JSON Importer** perlu dibina (lihat bahagian 6).
2. Geseran mana yang benar-benar menghalang kerja editor (BLOCKER) dan mana yang hanya mengganggu (FRICTION).

Peraturan:

- **Catat dahulu, baiki kemudian.** Jangan hentikan trial untuk membaiki geseran kecil; baiki hanya BLOCKER.
- **Jangan reka angka.** Jika satu langkah tidak sempat diukur, tulis "tidak direkod".
- Karya trial mestilah **manuskrip yang belum pernah masuk sistem**.
- Satu borang bagi satu karya. Batch 1 = 2 cerpen baharu + 1 novela baharu.

## 2. Borang masa dan geseran (satu salinan bagi setiap karya)

Karya: ______________________  Jenis: cerpen / novela  Perkataan: ________  Bab: ________
Pencatat: ____________________  Tarikh mula: ____________

| # | Langkah | Mula | Tamat | Minit | Medan disalin manual | Kesilapan parser / ralat | Medan tiada destinasi | Kelas |
|---|---------|------|-------|-------|----------------------|--------------------------|-----------------------|-------|
| 1 | Manuskrip mentah siap (rujukan sahaja) | | | | | | | |
| 2 | Manuskrip + arahan ke chatbot (Master Content Parser v2) | | | | | | | |
| 3 | Jawapan chatbot diterima dan dibaca | | | | | | | |
| 4 | Karya dicipta dalam Admin (tajuk, jenis, slug) | | | | | | | |
| 5 | Maklumat karya (dek, genre, audiens, masa baca) | | | | | | | |
| 6 | Teks karya / bab (novela: satu bab satu rekod) | | | | | | | |
| 7 | Kredit (draf awal, penyunting, penyunting akhir) | | | | | | | |
| 8 | Watak (dan bab kemunculan pertama bagi novela) | | | | | | | |
| 9 | Glosari | | | | | | | |
| 10 | Sumber dan hak (karya bersumber sahaja) | | | | | | | |
| 11 | Imej: hero, gambar bab, teks alternatif (pilihan) | | | | | | | |
| 12 | Semakan kesediaan (Publication readiness) | | | | | | | |
| 13 | Pratonton dan semakan pembaca | | | | | | | |
| 14 | Terbit | | | | | | | |
| 15 | Semakan selepas terbit (halaman awam, telefon, bab, navigasi) | | | | | | | |

Jumlah masa aktif editor: ________ minit.  Jumlah masa menunggu (chatbot, imej, deploy): ________ minit.
Masa yang hanya memindahkan data (langkah 5, 7, 8, 9, 10): ________ minit. Angka ini yang menentukan importer.

## 3. Senarai semak medan (untuk memudahkan pencatatan "disalin manual")

Tandakan medan yang editor terpaksa taip atau tampal sendiri, dan medan yang chatbot sudah isikan dengan betul.

**Semua jenis:** tajuk, slug, dek, genre, audiens, masa baca, kredit (peranan + nama + byline), glosari (istilah + makna), watak (nama + peranan).
**Novela:** senarai bab (tajuk + slug + susunan), watak + bab kemunculan pertama, penanda gambar per bab.
**Fragmen, sinopsis, karya bersumber:** karya asal, pengarang asal, bahasa, tahun terbit pertama, penerbit, cetakan, penyunting, penterjemah, ISBN, lokasi petikan.
**Imej:** fail, teks alternatif (pilihan), crop (titik fokus dan zum), hak.

Catat juga: medan yang **wujud dalam jawapan chatbot tetapi tiada destinasi** dalam Admin, dan medan Admin yang **tiada dalam jawapan chatbot**.

## 4. Kelas penemuan

| Kelas | Definisi | Tindakan |
|-------|----------|----------|
| **BLOCKER** | Menghalang pengeluaran kandungan, membaca, atau menerbitkan; atau membocorkan data; atau menyebabkan kehilangan data | Baiki segera |
| **FRICTION** | Kerja boleh disiapkan tetapi lambat, mengelirukan atau memerlukan penyelesaian sementara | Catat. Naik taraf menjadi kerja pembangunan hanya jika **berulang dalam sekurang-kurangnya dua karya** |
| **NICE-TO-HAVE** | Kemasan, polish, kemudahan tambahan | Kekal dalam backlog |

Satu masalah kecil dalam satu karya tidak melahirkan satu subsistem baharu.

## 5. Laporan retrospektif: Sekuntum Bunga untuk Alia (JLN-NOV-9991)

Alia kini sudah terbit. Bahagian ini hanya mencatat **apa yang benar-benar direkod**.

### 5.1 Fakta daripada sistem (disahkan 4 Oktober 2026)

| Perkara | Nilai |
|---------|-------|
| Jenis dan format | Novela, 10 bab |
| Saiz teks | 10 bab, kira-kira 73,000 aksara (5,573 hingga 9,523 aksara setiap bab); lebih kurang 10,000 patah perkataan |
| Anggaran bacaan | kira-kira 50 minit |
| Watak | 6 (Alia, AIDEN, Zaid Rahman pada bab 1; Maryam pada bab 2; Ustaz Hakim pada bab 3; Farid Rahman pada bab 5) |
| Glosari | 3 istilah |
| Kredit | 3 (draf awal, penyunting cerita, penyunting akhir; dua daripadanya penulis maya) |
| Imej | 1 (hero); gambar bab belum digunakan |
| Versi | v2 (dua semakan terbit), pertama terbit 2 Oktober 2026 |
| Sejarah editorial | 3 catatan |
| Pembaca | Penapisan watak mengikut bab berfungsi tanpa kebocoran (disahkan pada 10 bab) |

### 5.2 Data proses yang TIDAK direkod

| Perkara | Keadaan |
|---------|---------|
| Masa setiap langkah (bahagian 2) | **Tidak direkod** |
| Medan yang disalin manual | **Tidak direkod secara sistematik** |
| Kesilapan parser pada manuskrip ini | **Tidak direkod secara sistematik** |
| Medan tanpa destinasi | **Tidak direkod secara sistematik** |

**Keputusan:** kerana data masa dan salinan manual tidak direkod, **Alia tidak dikira sebagai trial Batch 1 yang lengkap**, dan
tiada anggaran masa yang boleh disimpulkan daripadanya. Ia dikira sebagai **bukti bahawa sistem boleh menerbitkan novela 10 bab
yang boleh dibaca dengan baik** (halaman Novela, bab, navigasi, metadata, penapisan watak). Batch 1 novela masih memerlukan
manuskrip baharu.

### 5.3 Geseran yang diketahui daripada kerja pembangunan (bukan pemasaan)

Ini dicatat sebagai petunjuk, bukan sebagai data trial. Kelasnya sementara sehingga muncul dalam karya kedua.

- Teks alternatif imej dahulu diwajibkan; kini pilihan. (Dibaiki.)
- Gambar bab dan crop belum wujud semasa Alia dimasukkan. (Kini ada.)
- Bab kini dikenali sebagai "Bab" dengan halaman Novela dan Senarai Bab. (Dibaiki.)
- Pemisah "--" ditaip tangan menjadi sengkang panjang secara automatik. (Dibaiki.)
- Soalan terbuka: berapa lama editor mengisi 3 kredit, 6 watak dan 3 istilah glosari secara manual? **Tidak diketahui.**

## 6. Keputusan JSON Importer (selepas Batch 1)

Gunakan masa pada baris "hanya memindahkan data" di bahagian 2, **dipuratakan merentas ketiga-tiga karya**:

| Purata masa memindahkan data bagi satu karya | Keputusan |
|----------------------------------------------|-----------|
| 20 minit atau lebih | Bina Parser JSON Import v1 (tampal, sahkan, pratonton, import sebagai draf) |
| 10 hingga 20 minit | Pertimbangkan selepas melihat medan yang paling kerap disalin; mungkin cukup dengan menambah baik borang sedia ada |
| Kurang 10 minit | Jangan bina; ada kerja lain yang lebih bernilai |

## 7. Templat laporan akhir (diisi selepas Batch 1)

1. Karya yang diuji dan jumlah masa aktif editor bagi setiap satu.
2. Jumlah masa memindahkan data dan keputusan importer (bahagian 6).
3. Senarai BLOCKER, FRICTION, NICE-TO-HAVE (satu baris setiap satu, dengan karya yang menemuinya).
4. FRICTION yang berulang dalam dua karya atau lebih (calon kerja pembangunan).
5. Medan tanpa destinasi dan medan Admin yang tiada dalam jawapan chatbot.
6. Kesilapan parser (jenis, kekerapan, dan sama ada ia dikesan oleh pengesahan).
7. Cadangan, dan apa yang sengaja tidak dibina.

## 8. Selepas trial: ujian pengguna kecil

2 hingga 3 orang yang bukan pembangun, di telefon, tanpa banyak arahan. Tugasan: mula membaca novela, buka Bab 6,
kembali ke Senarai Bab, cari maklumat karya, fahami ilustrasi, tinggalkan laman lalu kembali ke tempat bacaan.
Catat sahaja apa yang mereka tidak jumpa atau tidak faham.
