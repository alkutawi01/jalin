# Pewarisan maklumat siri (episod baharu tidak bermula kosong)

Keputusan 5 Okt 2026 (disahkan 8 Okt: kredit seragam sebagai lalai, editor boleh mengubahnya bagi episod tertentu), atas aduan pemilik produk: kredit dimasukkan semula bagi setiap episod walaupun episod itu dalam siri yang sama, dan dua episod bagi siri yang sama boleh berlainan genre. Data sebenar: siri "Satu Daerah yang Paling Sunyi" (genre Rumah Tangga, audiens 21-50) ada Episod 1 dengan lima kredit (satu pendua), manakala draf Episod 2 baharu tiada genre, audiens 13-17 (nilai tetap dalam `start-draft`) dan satu kredit.

## Apa yang diwarisi

Apabila sebuah episod dicipta dalam siri (Tambah Karya > Tulis sendiri, atau import chatbot yang menyambung siri), ia menerima:

| Maklumat | Sumber |
| --- | --- |
| Genre dan audiens | Episod terdahulu yang terkini dan sudah diisi genre-nya (genre dan audiens sebagai pasangan); jika tiada, genre dan audiens siri |
| Kredit | Episod terdahulu terkini yang ada kredit di bawah tajuk (byline); jika tiada, yang terkini dengan sebarang kredit. Tanpa pendua (orang dan peranan yang sama) |
| Watak dan Latar tempat | Episod yang sama, hanya untuk siri **bersambung** (bukan antologi); rujukan bab dikosongkan |

Tidak diwarisi (khusus episod): tajuk, dek, teks, minit bacaan, imej, glosari, nota editor, versi.

Sebab episod didahulukan daripada siri: editor mengubah genre dan audiens episod semasa cerita berkembang, tetapi baris siri jarang disemak semula. Dalam data sebenar siri berkata 21-50 manakala kedua-dua episod terbit berkata 18-50. Episod tanpa genre ialah draf yang belum disentuh, jadi audiens automatiknya (13-17) tidak dianggap pilihan.

## Import chatbot (menyambung siri)

- Genre: yang ditaip editor > yang diwarisi > cadangan chatbot. Audiens: yang diwarisi > chatbot (chatbot menjawab tanpa tahu siri).
- Kredit: yang diwarisi dahulu; penulis yang dinamakan chatbot atau editor ditambah hanya jika bukan orang yang sama (nama sama dengan nama paparan penyumbang yang diwarisi atau tetamu yang diwarisi).
- Watak: entri chatbot didahulukan, yang diwarisi dan tidak disebut ditambah. Latar tempat diwarisi sahaja.
- Skrin semakan memaparkan ayat "menerima daripada Episod N: ..." sebelum disimpan.

## Draf yang sudah wujud

Halaman Siri (Sunting Siri > Episod) ada butang **Isi daripada siri** pada episod ke-2 dan seterusnya yang belum terbit atau diarkib. Ia hanya mengisi yang kosong; apa yang sudah ditulis tidak diganti:

- genre: hanya jika kosong; audiens: jika kosong, atau masih 13-17 automatik pada draf yang genre-nya juga kosong;
- kredit: hanya jika episod belum ada nama di bawah tajuk; kredit yang belum ada (orang dan peranan sama) ditambah. Jika episod sudah ada nama di bawah tajuk, kredit itu keputusan editor dan tidak ditambah;
- watak dan latar: hanya jika episod tiada.

Episod terbit/arkib ditolak: teks terbit berubah melalui versi baharu, bukan secara senyap.

## Peringatan (AGENTS.md #23)

Kredit mesti berdasarkan sumbangan sebenar. Kredit yang diwarisi ialah titik mula, bukan pengesahan: editor menyemaknya di tab Kredit sebelum menerbitkan, seperti draf lain.

Kod: `src/lib/admin/series-inheritance.ts`, ujian: `__tests__/series-inheritance.test.ts`.
