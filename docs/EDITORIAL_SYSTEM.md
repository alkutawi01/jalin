# Editorial System v0.3

## Prinsip

Jalin ialah produk editorial, bukan platform penerbitan terbuka.

Kualiti, keselamatan pembaca remaja, provenance dan kesinambungan cerita mengatasi throughput.

## Status kandungan

DRAFT → REVIEW → RIGHTS_CHECK → VISUAL_REVIEW → READY → PUBLISHED

`RIGHTS_CHECK` wajib untuk Sinopsis, Terjemahan dan Fragmen yang berasaskan karya pihak lain. Untuk Cerpen/Novela/Bersiri asli, gate ini boleh ditanda `N/A`.

Manusia mempunyai kuasa akhir untuk publish/unpublish.

## Semakan minimum

Sebelum terbit:
- kesesuaian umur;
- bahasa dan kelancaran;
- kesinambungan watak/plot jika berkaitan;
- fakta dalaman cerita;
- glosari;
- kredit;
- ilustrasi;
- metadata asas;
- provenance / hak penggunaan jika berkaitan;
- pagination jika karya panjang;
- nombor versi dan tarikh semakan.

## Metadata awam MVP

- jenis karya: Cerpen / Novela / Bersiri / Terjemahan / Fragmen / Sinopsis
- genre
- contributor/byline
- badge `Maya` untuk contributor maya
- tarikh terbit
- tarikh kemas kini terakhir
- versi semasa
- sumber asal / pengarang asal untuk karya derivative apabila berkaitan

Elakkan taxonomy terlalu kompleks pada versi awal.

## Living text & versioning

Karya asli Jalin ialah **living text**.

Selepas terbit, karya masih boleh:
- diperhalus bahasanya;
- diperbetul fakta kecil;
- ditambah atau diganti visual;
- diperluas glosari;
- diperbaiki pacing atau kejelasan;
- menerima major revision apabila perlu.

Peraturan:
- perubahan minor menggunakan peningkatan versi minor;
- perubahan substantif pada struktur, plot, ending atau identiti karya menggunakan major version;
- perubahan bermakna perlu mempunyai tarikh semakan dan ringkasan dalam **Sejarah editorial**;
- typo/koma kecil tidak perlu masuk sejarah awam;
- major revision tidak boleh disamarkan sebagai kemas kini kecil.

## Sistem kredit

Kredit Jalin mengikuti logik produksi, hampir seperti kredit filem.

Kredit hendaklah berdasarkan sumbangan sebenar. Antara istilah yang boleh digunakan:
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
- Penyunting terjemahan
- Adaptasi
- Penceritaan semula
- Pengarah seni
- Ilustrator
- Penyunting visual
- Semakan hak & sumber

Rail reader menunjukkan kredit utama sahaja. Kredit lengkap dipaparkan melalui **Kredit penuh** atau seksyen editorial khusus.

Jangan beri kredit “Penulis” kepada seseorang yang hanya membuat semakan bahasa atau penyelidikan.

## Sinopsis

Sinopsis Jalin ialah penceritaan semula editorial, bukan nota peperiksaan.

Ia perlu:
- setia kepada alur utama karya;
- membezakan fakta teks asal daripada interpretasi editor;
- menyatakan karya dan pengarang asal;
- mempunyai provenance.

## Terjemahan

Sebelum menerbitkan terjemahan:
1. sahkan hak penggunaan teks sumber;
2. jika karya domain awam, pastikan teks/edisi sumber juga sesuai digunakan;
3. hasilkan terjemahan Jalin sendiri;
4. jangan menyalin terjemahan moden yang masih dilindungi;
5. rekod bahasa asal dan sumber.

## Fragmen

Fragmen perlu:
- cukup konteks untuk pembaca memahami adegan;
- tidak dipotong secara mengelirukan;
- mengekalkan teks asal/terjemahan dengan integriti;
- menyatakan karya asal, pengarang dan provenance.

## Cerpen, Novela & Bersiri asli

Cerpen ialah karya lengkap pendek hingga sederhana.

Novela ialah karya fiksyen lengkap long-form yang masih satu Work. Ia boleh mempunyai bab atau bahagian dalaman dan sesuai untuk pagination.

Bersiri ialah karya episodik dengan canon. Continuity review wajib bagi episod baharu.

## Ritma prosa cerpen dan novela

Prosa Jalin tidak boleh bergantung pada rentetan ayat pendek yang dipisahkan menjadi perenggan satu baris secara berlebihan.

Panduan:
- bina perenggan berdasarkan satu gerak, pemerhatian, emosi atau unit adegan yang lengkap;
- variasikan panjang ayat: gabungkan ayat sederhana dan panjang dengan ayat pendek yang benar-benar mempunyai fungsi;
- ayat satu atau dua perkataan boleh digunakan untuk hentakan emosi, motif atau perubahan fokus, tetapi bukan sebagai rentak lalai;
- elakkan gaya mekanikal seperti satu fakta = satu perenggan jika beberapa fakta masih berada dalam unit naratif yang sama;
- dialog boleh berdiri sendiri mengikut giliran penutur, tetapi naratif di antara dialog hendaklah mengalir dan tidak terlalu terfragmentasi;
- utamakan irama prosa Melayu yang semula jadi, bukan pola “cinematic beats” bahasa Inggeris yang dipindahkan terus ke dalam Bahasa Melayu.

## Pengayaan kosa kata

Jalin juga berfungsi sebagai pendedahan bahasa, tetapi bukan bahan latihan sekolah.

Untuk prosa baharu:
- sisipkan beberapa perkataan Melayu aras tinggi, tepat atau kurang lazim secara semula jadi apabila konteks mengizinkan;
- utamakan perkataan yang benar-benar memperhalus makna, suasana atau ritma prosa;
- konteks ayat sebaiknya membantu pembaca mengagak maknanya;
- perkataan yang berguna untuk pembelajaran boleh ditandai dalam glosari;
- jangan memenuhi perenggan dengan kata arkaik, sinonim ganjil atau diksi “thesaurus” yang merosakkan suara watak;
- kelancaran dan ketepatan tetap lebih penting daripada menunjukkan keluasan kosa kata.

## Human control

AI boleh membantu menulis, menyemak, merumus, menterjemah dan menghasilkan visual. AI tidak boleh menerbitkan secara bebas tanpa gate editorial manusia.

## Tipografi dialog

Untuk prosa Jalin:
- gunakan tanda petik pembuka dan penutup tipografik: **“ … ”**;
- jangan gunakan tanda petik lurus ASCII **" … "** dalam teks terbitan;
- apostrof dan petik tunggal juga perlu menggunakan glyph tipografik yang betul apabila diperlukan;
- proses editorial/QA mesti menandai tanda petik lurus yang tertinggal sebelum status READY;
- renderer tidak boleh bergantung pada “smart quotes” automatik browser kerana hasil boleh berbeza mengikut font/platform.
