# Jalin Master Plan & AI Handoff v1.0

Status: ACTIVE
Last updated: 22 September 2026

Dokumen ini ialah rujukan utama untuk ChatGPT, Claude, Codex, OpenCode dan AI lain yang membantu pembangunan Jalin.

Tujuan dokumen ini:
- memahami visi produk sebelum membuat perubahan;
- mengelakkan keputusan lama bercanggah dengan keputusan baharu;
- memastikan semua AI bekerja berdasarkan sumber kebenaran yang sama.

---

# 1. Visi Jalin

Jalin — oleh Adjung ialah platform bacaan sastera berilustrasi untuk remaja.

Jalin bukan platform novel penuh. Fokusnya ialah pengalaman membaca karya terpilih melalui gabungan:

- karya asli Jalin;
- karya domain awam yang diperkenalkan semula secara editorial;
- ilustrasi yang menyokong naratif;
- bahasa Melayu yang baik;
- pengalaman membaca digital yang tenang.

Prinsip utama:

> Jalin ialah tempat menemui cerita.

---

# 2. Sasaran pembaca

Utama:
- remaja 13–17 tahun;
- pembaca yang berada pada spektrum bacaan KOMSAS sekolah;
- pembaca yang ingin meningkatkan apresiasi bahasa Melayu.

Jalin bukan buku teks, tetapi boleh membantu pembaca memperkayakan kosa kata dan kefahaman bahasa.

---

# 3. Kategori kandungan rasmi

## Cerpen

Cerita asli Jalin yang lengkap sebagai satu karya.

## Novela

Karya fiksyen lengkap yang lebih panjang daripada cerpen tetapi bukan novel penuh.

Ciri:
- satu karya lengkap;
- boleh mempunyai bahagian atau bab dalaman;
- menggunakan pagination dalaman jika panjang;
- tidak dipecahkan menjadi episod seperti Bersiri.

Contoh ujian awal:
- Waktu Sebenar.

## Bersiri

Karya asli yang diterbitkan secara episod.

Setiap episod mempunyai kesinambungan canonical.

## Fragmen

Sedutan bermakna daripada karya panjang, terutama karya domain awam.

## Sinopsis

Penceritaan semula editorial karya lain, bukan ringkasan peperiksaan.

---

# 4. Peraturan penting kandungan

## AI bukan penerbit automatik

AI boleh membantu:
- menghasilkan draf;
- menyunting;
- menterjemah;
- menyemak;
- menghasilkan cadangan visual.

Tetapi keputusan penerbitan akhir mesti melalui kawalan editorial manusia.

## Penulis maya

Jalin boleh menggunakan persona AI.

Contoh:

Nara Zahin · Maya
Rafiq Naim · Maya

Halaman bio mesti menjelaskan bahawa mereka ialah persona penulis maya.

Pemetaan dalaman:
- Nara Zahin → Claude
- Rafiq Naim → ChatGPT

---

# 5. Living Text

Karya Jalin bukan teks statik.

Selepas diterbitkan, karya boleh disemak dan diperbaiki.

Setiap karya menyokong:
- tarikh terbit;
- tarikh kemas kini terakhir;
- versi semasa;
- sejarah editorial.

Peraturan versi:

Minor revision:
- bahasa;
- glosari;
- visual;
- pembaikan kecil.

Major revision:
- perubahan struktur;
- perubahan plot besar;
- perubahan ending;
- perubahan identiti karya.

Jangan ubah karya besar-besaran tanpa rekod.

---

# 6. Sistem kredit

Jalin menggunakan konsep kredit seperti produksi filem.

Peranan yang disokong:

- Idea asal
- Draf awal
- Penulis
- Penyunting cerita
- Penyunting bahasa
- Penyemak fakta
- Penyelidikan
- Editor akhir
- Editor penerbitan
- Penterjemah
- Adaptasi
- Penceritaan semula
- Pengarah seni
- Ilustrator
- Penyunting visual
- Semakan hak & sumber

Kredit diberikan berdasarkan sumbangan sebenar.

---

# 7. Standard penulisan

Prosa Jalin mesti:

- mengalir seperti cerpen Melayu sebenar;
- mengelakkan rentetan ayat pendek yang terlalu banyak;
- menggunakan perenggan yang mempunyai gerak naratif;
- menggunakan ayat pendek hanya apabila mempunyai fungsi emosi.

Jangan menghasilkan gaya:
- skrip;
- blog post berpecah-pecah;
- terjemahan langsung bahasa asing.

Gunakan kosa kata Melayu yang lebih kaya secara semula jadi.

Contoh prinsip:
- pilih perkataan yang tepat;
- jangan menggunakan kata sukar hanya untuk kelihatan sasterawi;
- glosari boleh membantu pembaca.

---

# 8. Visual

Semua imej Jalin wajib melalui Magnific.

Gaya:
- ilustrasi editorial sinematik;
- semi-realistik;
- sesuai untuk sastera remaja;
- tidak seperti stock image atau komik.

Elakkan:
- wajah watak terlalu jelas secara default;
- gaya anime berlebihan;
- visual yang tidak berkaitan dengan adegan.

---

# 9. Reader experience

Keutamaan:

1. bacaan yang selesa;
2. margin luas;
3. typography yang baik;
4. ilustrasi yang membantu;
5. glosari ringan;
6. pagination untuk karya panjang.

Desktop dan laptop perlu menggunakan reading container yang stabil.

---

# 10. Prinsip pembangunan

- Satu permintaan UI = satu batch commit/deploy seboleh mungkin.
- Jangan bazir deployment Vercel dengan commit kecil berlebihan.
- Jangan overengineer MVP.
- Simpan keputusan penting dalam docs/.
- Content model mesti dipisahkan daripada UI.

---

# 11. Prioriti pembangunan semasa

Fasa semasa:

1. Reader Jalin stabil.
2. Cerpen asli sebagai benchmark editorial.
3. Visual system.
4. Pagination long-form menggunakan Novela.
5. Contributor bio.
6. Kredit penuh.
7. Sejarah editorial.

---

# Arahan kepada AI

Sebelum membuat perubahan:

1. Baca dokumen ini.
2. Semak MASTER_PLAN.md, PRODUCT.md dan EDITORIAL_SYSTEM.md.
3. Jangan membuat keputusan produk baharu tanpa menyemak dokumen sumber.
4. Jika arahan baharu bercanggah dengan dokumen ini, nyatakan konflik dahulu.
5. Utamakan pengalaman pembaca dan kualiti editorial berbanding kelajuan menghasilkan kandungan.
