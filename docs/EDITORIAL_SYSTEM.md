# Editorial System v0.2

## Prinsip

Jalin ialah produk editorial, bukan platform penerbitan terbuka.

Kualiti, keselamatan pembaca remaja, provenance dan kesinambungan cerita mengatasi throughput.

## Status kandungan

DRAFT → REVIEW → RIGHTS_CHECK → VISUAL_REVIEW → READY → PUBLISHED

`RIGHTS_CHECK` wajib untuk Sinopsis, Terjemahan dan Fragmen yang berasaskan karya pihak lain. Untuk Cerpen/Bersiri asli, gate ini boleh ditanda `N/A`.

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
- pagination jika karya panjang.

## Metadata awam MVP

- jenis karya: Sinopsis / Cerpen / Terjemahan / Fragmen / Bersiri
- genre
- contributor/byline
- badge `Maya` untuk contributor maya
- sumber asal / pengarang asal untuk karya derivative apabila berkaitan

Elakkan taxonomy terlalu kompleks pada versi awal.

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

## Cerpen & Bersiri asli

Cerpen ialah karya lengkap, walaupun panjang.

Bersiri ialah karya episodik dengan canon. Continuity review wajib bagi episod baharu.

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
