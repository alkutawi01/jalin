# Jalin Master Plan v0.3

Status: **LOCKED — 21 September 2026**

## 1. Product thesis

**Jalin — oleh Adjung** ialah platform bacaan sastera berilustrasi untuk remaja 13–17 tahun.

Jalin bukan platform novel penuh. Unit utama produk ialah **bacaan terkurasi** yang boleh dinikmati dalam satu pengalaman halaman, sama ada karya asli Jalin atau karya domain awam yang diperkenalkan semula secara editorial.

Prinsip ringkas:

> **Jalin ialah tempat menemui cerita.**

## 2. Enam bentuk kandungan utama

### Sinopsis
Penceritaan semula / ringkasan editorial karya domain awam yang membantu pembaca menikmati keseluruhan alur tanpa membaca novel penuh.

- bukan ringkasan peperiksaan yang kering;
- boleh panjang dan berilustrasi;
- sumber karya asal mesti direkodkan;
- status domain awam mesti disahkan sebelum terbit.

### Cerpen
Cerpen asli yang diterbitkan oleh Jalin.

- lengkap sebagai satu karya;
- pendek hingga sederhana;
- boleh mempunyai ilustrasi editorial;
- penulis boleh manusia atau penulis maya yang didedahkan secara telus.

### Novela
Karya fiksyen lengkap yang lebih panjang daripada cerpen tetapi tidak dibangunkan sebagai novel penuh atau siri episodik.

- satu Work lengkap;
- sesuai menggunakan pagination dalaman;
- boleh mempunyai bab atau bahagian dalaman tanpa menjadikannya Bersiri;
- panjang perkataan bukan hukum keras; keputusan berdasarkan struktur dan pengalaman membaca;
- Waktu Sebenar digunakan sebagai test corpus awal untuk pagination long-form.


- teks sumber mesti sah digunakan;

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

**Novel Pendek dan Novel tidak menjadi kategori Jalin.**

Karya asli panjang ditentukan mengikut bentuk:
- kekal Cerpen jika masih sebuah cerpen lengkap;
- menjadi Novela jika pengalaman bacaannya jelas long-form tetapi tetap satu karya lengkap;
- menjadi Bersiri jika secara struktur diterbitkan sebagai episod canonical.

Jalin tidak dibina sebagai tempat membaca novel penuh moden secara umum.

## 4. Reading model

Setiap item kandungan mempunyai **halaman karya sendiri**.

Karya panjang, terutama Novela, boleh menggunakan **pagination dalaman** tanpa menukarkannya menjadi siri atau pecahan artikel.

Contoh:
- /cerpen/kerusi-di-beranda
- /novela/waktu-sebenar
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


“Koleksi” boleh diperkenalkan kemudian untuk kurasi tematik, tetapi bukan navigation pillar wajib pada MVP.

## 6. Editorial identity

Semua kategori berada di bawah pengalaman Jalin yang sama:
- house style visual tunggal;
- margin / reading container konsisten;
- ilustrasi editorial, bukan komik panel demi panel;
- glosari ringkas melalui tooltip;
- bahasa Melayu yang natural dan terjaga;
- unsur Melayu-Islam hadir secara organik apabila dunia cerita memerlukannya, bukan sebagai tampalan didaktik.

## 7. Living text & sejarah editorial

Karya asli Jalin dianggap **living text**: teks boleh terus disemak dan ditambah baik selepas terbit, dengan kawalan versi dan jejak editorial.

Metadata awam minimum:
- tarikh terbit pertama;
- tarikh kemas kini terakhir;
- versi semasa.

Prinsip versi:
- perubahan kecil/substantif ringan seperti bahasa, glosari, visual, fakta kecil dan kelancaran menggunakan versi minor, contohnya v1.1 → v1.2;
- perubahan besar pada struktur, plot, ending atau identiti karya menggunakan major revision, contohnya v1.x → v2.0;
- jangan ubah karya secara senyap sehingga identiti asal hilang.

Perubahan bermakna direkodkan dalam **Sejarah editorial**. Perubahan mikro seperti koma atau typo tidak perlu disenaraikan satu per satu.

## 8. Kredit produksi

Jalin menggunakan sistem kredit yang boleh berkembang seperti produksi filem.

Rail pembaca memaparkan kredit utama sahaja. Kredit penuh boleh mengandungi, apabila berkaitan:
- Idea asal
- Draf awal
- Penulis
- Penyunting cerita
- Penyunting bahasa
- Penyemak fakta
- Penyunting akhir
- Editor / Editor penerbitan
- Penyelidikan
- Penterjemah
- Adaptasi / Penceritaan semula
- Pengarah seni
- Ilustrator
- Penyunting visual
- Semakan hak & sumber

Kredit diberi berdasarkan sumbangan sebenar, bukan jawatan organisasi.

## 9. AI contributors

Penulis/penyemak maya boleh mempunyai nama dan persona tersendiri.

Prinsip disclosure:
- byline menggunakan penanda kecil **Maya** atau penanda setara;
- halaman bio menyatakan dengan jelas bahawa persona tersebut ialah AI/penulis maya;
- model teknikal di belakang persona boleh direkodkan secara dalaman;
- manusia memegang keputusan editorial akhir.

Mapping awal:
- **Nara Zahin** → persona berasaskan Claude
- **Rafiq Naim** → persona berasaskan ChatGPT

## 10. Public-domain governance

“Lama” tidak bermaksud automatik bebas hak cipta.

1. kenal pasti karya, pengarang, tahun dan teks sumber;
2. sahkan status hak cipta/domain awam yang relevan;
3. simpan provenance;
5. hentikan penerbitan jika status tidak cukup pasti.

## 11. MVP priority

Keutamaan:
1. reader page yang cantik dan stabil;
2. Cerpen asli awal yang menjadi benchmark editorial;
3. sistem visual + glosari + pagination;
4. Novela sebagai stress-test long-form reader;
5. contributor pages;
6. satu contoh setiap kategori baharu selepas workflow sah;
7. akaun asas: simpan, sejarah, sambung bacaan.

Bukan keutamaan MVP:
- komen;
- profil sosial;
- gamifikasi;
- self-publishing;
- CMS besar;
- novel penuh.

## 12. Technical baseline

- Next.js + TypeScript
- PostgreSQL
- self-hosted pada server sendiri untuk fasa awal
- S3-compatible object storage untuk media
- GitHub sebagai source code + dokumentasi
- backup PostgreSQL automatik + offsite copy

Teknologi mesti menyokong content type, kredit berbilang peranan, sejarah editorial dan pagination tanpa mengikat Jalin kepada satu vendor hosting.
