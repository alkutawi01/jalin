# Jalin Master Plan v0.2

Status: **LOCKED — 21 September 2026**

## 1. Product thesis

**Jalin — oleh Adjung** ialah platform bacaan sastera berilustrasi untuk remaja 13–17 tahun.

Jalin bukan platform novel penuh. Unit utama produk ialah **bacaan terkurasi** yang boleh dinikmati dalam satu pengalaman halaman, sama ada karya asli Jalin atau karya domain awam yang diperkenalkan semula secara editorial.

Prinsip ringkas:

> **Jalin ialah tempat menemui cerita.**

## 2. Lima bentuk kandungan utama

### Sinopsis
Penceritaan semula / ringkasan editorial karya domain awam yang membantu pembaca menikmati keseluruhan alur tanpa membaca novel penuh.

- bukan ringkasan peperiksaan yang kering;
- boleh panjang dan berilustrasi;
- sumber karya asal mesti direkodkan;
- status domain awam mesti disahkan sebelum terbit.

### Cerpen
Cerpen asli yang diterbitkan oleh Jalin.

- lengkap sebagai satu karya;
- boleh pendek atau panjang;
- boleh mempunyai ilustrasi editorial;
- penulis boleh manusia atau penulis maya yang didedahkan secara telus.

### Terjemahan
Terjemahan Jalin bagi cerpen atau karya pendek daripada bahasa asing.

- teks sumber mesti sah digunakan;
- untuk domain awam, terjemahan Jalin hendaklah dibuat daripada teks asal / sumber yang sah, bukan menyalin terjemahan moden pihak lain;
- nama pengarang asal, bahasa asal, sumber dan nota terjemahan perlu direkodkan.

### Fragmen
Sedutan terpilih daripada novel atau karya panjang domain awam.

- dipilih kerana boleh memberi pengalaman bacaan yang bermakna sendiri;
- boleh disertai konteks editorial ringkas;
- teks tidak dipotong secara mengelirukan;
- provenance dan status hak cipta mesti direkodkan.

### Bersiri
Fiksyen asli Jalin yang berkembang secara episod.

- satu garis cerita canonical;
- setiap episod mempunyai identiti sendiri tetapi kesinambungan mesti dijaga;
- boleh menggunakan AI-assisted writers' room;
- human editorial authority kekal wajib.

## 3. Yang dikeluarkan daripada product taxonomy

**Novel Pendek tidak lagi menjadi kategori Jalin.**

Jika karya asli menjadi panjang:
- ia kekal sebagai Cerpen panjang jika masih satu karya lengkap; atau
- ia menjadi Bersiri jika secara struktur lebih sesuai dibahagikan kepada episod.

Jalin tidak dibina sebagai tempat membaca novel penuh moden.

## 4. Reading model

Setiap item kandungan mempunyai **halaman karya sendiri**.

Jenis kandungan yang panjang masih dianggap satu karya dan boleh menggunakan **pagination dalaman**.

Contoh:
- /cerpen/kerusi-di-beranda
- /terjemahan/the-bet
- /fragmen/les-miserables-jean-valjean
- /sinopsis/frankenstein
- /bersiri/nama-siri/episod-01

Prinsip pagination:
- pembaca kekal dalam konteks karya yang sama;
- URL canonical karya kekal stabil;
- progress membaca boleh disimpan mengikut halaman/posisi;
- pagination tidak boleh terasa seperti pecahan artikel SEO;
- mobile dan desktop mesti mengekalkan ritma bacaan yang selesa.

## 5. Navigation MVP

**Utama · Cerpen · Bersiri · Terjemahan · Fragmen · Sinopsis**

“Koleksi” boleh diperkenalkan kemudian untuk kurasi tematik, tetapi bukan navigation pillar wajib pada MVP.

## 6. Editorial identity

Semua kategori berada di bawah pengalaman Jalin yang sama:
- house style visual tunggal;
- margin / reading container konsisten;
- ilustrasi editorial, bukan komik panel demi panel;
- glosari ringkas melalui tooltip;
- bahasa Melayu yang natural dan terjaga;
- unsur Melayu-Islam hadir secara organik apabila dunia cerita memerlukannya, bukan sebagai tampalan didaktik.

## 7. AI contributors

Penulis/penyemak maya boleh mempunyai nama dan persona tersendiri.

Prinsip disclosure:
- byline menggunakan penanda kecil **Maya** atau penanda setara;
- halaman bio menyatakan dengan jelas bahawa persona tersebut ialah AI/penulis maya;
- model teknikal di belakang persona boleh direkodkan secara dalaman;
- manusia memegang keputusan editorial akhir.

Mapping awal:
- **Nara Zahin** → persona berasaskan Claude
- **Rafiq Naim** → persona berasaskan ChatGPT

## 8. Public-domain governance

“Lama” tidak bermaksud automatik bebas hak cipta.

Sebelum Sinopsis, Terjemahan atau Fragmen diterbitkan:
1. kenal pasti karya, pengarang, tahun dan teks sumber;
2. sahkan status hak cipta/domain awam yang relevan;
3. simpan provenance;
4. bezakan hak cipta karya asal daripada hak cipta terjemahan/edisi moden;
5. hentikan penerbitan jika status tidak cukup pasti.

## 9. MVP priority

Keutamaan:
1. reader page yang cantik dan stabil;
2. Cerpen asli pertama;
3. sistem visual + glosari + pagination;
4. contributor pages;
5. satu contoh setiap kategori baharu selepas workflow sah;
6. akaun asas: simpan, sejarah, sambung bacaan.

Bukan keutamaan MVP:
- komen;
- profil sosial;
- gamifikasi;
- self-publishing;
- CMS besar;
- novel penuh.

## 10. Technical baseline

- Next.js + TypeScript
- PostgreSQL
- self-hosted pada server sendiri untuk fasa awal
- S3-compatible object storage untuk media
- GitHub sebagai source code + dokumentasi
- backup PostgreSQL automatik + offsite copy

Teknologi mesti menyokong content type dan pagination tanpa mengikat Jalin kepada satu vendor hosting.
